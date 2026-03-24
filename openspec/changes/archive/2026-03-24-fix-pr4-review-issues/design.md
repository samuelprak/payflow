## Context

PR #4 (`feat/early-fraud-warning-handling`) introduces a Stripe webhook dispatcher pattern with early fraud warning handling that auto-refunds charges and cancels subscriptions. Code review identified critical production risks that must be fixed before merging. The project uses NestJS + TypeORM with PostgreSQL 15, Redis 7 (already configured via docker-compose), BullMQ for queues, and `@nestjs/terminus` for health checks.

## Goals / Non-Goals

**Goals:**
- Prevent duplicate processing of the same Stripe webhook event
- Prevent race conditions between `.created` and `.updated` fraud warning events
- Use Stripe's structured error codes instead of fragile string matching
- Surface partial subscription cancellation failures to operators and downstream consumers
- Fix processing order so customer lookup happens before irreversible mutations

**Non-Goals:**
- Adding Stripe list pagination (out of scope per user)
- Fixing the bare catch block in webhook signature validation (out of scope per user)
- Changing dispatcher error propagation strategy (out of scope per user)
- Adding full Prometheus/Grafana metrics pipeline (keep it simple with existing tools)
- Database event retention/pruning (separate follow-up)

## Decisions

### Decision 1: Hybrid Database + Redis for webhook deduplication

**Chosen:** New `StripeWebhookEvent` entity with unique constraint on `(stripeEventId, stripeAccountId)` + Redis cache as fast-path.

**Alternatives considered:**
- **Redis-only:** Single point of failure. If Redis restarts, cache is lost and duplicates slip through. No audit trail.
- **Database-only:** Works but slower. Every Stripe retry (up to 8-10 times over 36 hours) hits the database.
- **In-memory:** Doesn't survive restarts. Breaks with horizontal scaling.

**Rationale:** Redis is already running (docker-compose, port 6389) and BullMQ/ioredis are already in package.json. The database provides durability + unique constraint as the ultimate safety net. Redis provides a <1ms fast path to reject obvious retries without database load.

**Flow:**
1. Webhook arrives → check Redis cache (`stripe:event:{eventId}`, TTL 24h)
2. If cached → return 200 immediately (duplicate)
3. If not cached → try INSERT into `stripe_webhook_events` table
4. If unique constraint violation → return 200 (duplicate, set Redis cache)
5. If insert succeeds → set Redis cache, proceed with processing

### Decision 1b: DB unique constraint as distributed lock (no Redis mutex needed)

**Chosen:** Rely on the PostgreSQL unique constraint on `(stripeEventId, stripeAccountId)` as the sole concurrency safety mechanism. Redis is explicitly a fast-path cache optimization only — it is NOT used for mutual exclusion.

**Alternatives considered:**
- **Redis `SETNX` distributed lock:** Adds complexity and a Redis dependency for correctness. If Redis is down, locking breaks. The DB constraint already provides the same guarantee with stronger durability.
- **Application-level mutex / advisory locks:** Unnecessary overhead. The INSERT-or-conflict pattern is simpler and battle-tested.
- **Generic deduplication module (extracted from Stripe):** Only one consumer exists (Stripe webhooks). Extracting a generic module now would be speculative abstraction. Extract only when a second use case emerges.

**Rationale:** When the same event is delivered to multiple pods simultaneously, both pass the Redis cache check (cache miss). Both attempt a DB INSERT — PostgreSQL's unique constraint guarantees exactly one wins. The loser catches the constraint violation and returns 200. The winning pod's INSERT MUST be committed *before* handler execution begins, ensuring no window for concurrent processing.

**Key constraint:** `WebhookDeduplicationService` stays inside the Stripe module. It uses Redis for performance but depends on the DB for correctness.

### Decision 2: Use Stripe error codes instead of message strings

**Chosen:** Check `error.type === "StripeInvalidRequestError"` and `error.code === "charge_already_refunded"` from the Stripe SDK.

**Rationale:** Stripe SDK returns structured errors with `.type`, `.code`, and `.message`. String matching on `.message.includes("already been refunded")` is fragile — Stripe can change wording across API versions. Error codes are stable and documented.

### Decision 3: Structured logging + warn-level for partial failures (no metrics system)

**Chosen:** Use `Logger.warn()` with structured context for partial subscription cancellation failures. Include `subscriptionCancellationsFailed` in the emitted `CustomerUpdatedEvent` data so downstream consumers (webhook processor) can act on it.

**Alternatives considered:**
- **Prometheus metrics:** Overkill — no existing metrics infrastructure in the project.
- **Custom health indicator via @nestjs/terminus:** Good idea but adds complexity for a scenario that should be rare. Better as follow-up.
- **Just logging:** Insufficient — downstream consumers need to know about failures too.

**Rationale:** The project uses basic NestJS Logger everywhere. Adding warn-level logging makes failures visible in any log aggregation tool. Propagating the failure count through the event system lets the webhook processor include it in customer notifications — the customer needs to know if some subscriptions weren't cancelled.

### Decision 4: Customer lookup before mutations

**Chosen:** Move customer resolution into `handleEarlyFraudWarning` use case. Pass `stripeCustomerId` as input (resolved from charge) so the handler can validate the customer exists before triggering refunds and cancellations.

**Alternative:** Keep current order but add compensation logic. Rejected — simpler to just reorder.

**Rationale:** Currently the handler calls `handleEarlyFraudWarning()` (refunds + cancels) then looks up the customer. If customer lookup fails, mutations happened but no event is emitted. Fixing the order is a straightforward reorder with no downside.

### Decision 5: Document intentional dual `invoice.paid` handler subscription

**Chosen:** Add a comment to `CustomerUpdatedWebhookHandler` explaining that `invoice.paid` is intentionally handled by both this handler (generic customer update notification) and `InvoicePaidWebhookHandler` (payment receipt with URL).

**Rationale:** The two handlers emit different event types (`customer.updated` vs `invoice.paid`) for different downstream consumers. This is intentional but non-obvious — a comment prevents future developers from "fixing" the apparent duplication.

## Risks / Trade-offs

- **[Redis dependency for dedup]** → If Redis is down, falls back to database-only deduplication (unique constraint still works). No data loss, just slower.
- **[Migration required]** → New `stripe_webhook_events` table needs a migration. Low risk — additive schema change, no existing data affected.
- **[Processing order change]** → Moving customer lookup earlier means we skip refund+cancel if customer doesn't exist in our system. This is actually safer — if we don't know the customer, we shouldn't be auto-refunding on their behalf. Edge case: customer exists in Stripe but not in our DB. Acceptable — these would be guest checkouts or unlinked accounts.
- **[Warn logging volume]** → If Stripe has an outage causing mass cancellation failures, warn logs could spike. Acceptable — that's exactly when you want visibility.
