## 1. Webhook Event Deduplication (Database Layer)

- [x] 1.1 Create `StripeWebhookEvent` entity in `src/stripe/entities/stripe-webhook-event.entity.ts` with columns: `id` (uuid PK), `stripeEventId` (string), `stripeAccountId` (string), `createdAt`. Add unique constraint on `(stripeEventId, stripeAccountId)`.
- [x] 1.2 Create `StripeWebhookEventRepository` in `src/stripe/repositories/stripe-webhook-event.repository.ts` with a `recordEvent(stripeEventId, stripeAccountId)` method that returns `true` if inserted, `false` if duplicate (catches unique constraint violation).
- [x] 1.3 Create `StripeWebhookEventFactory` in `src/stripe/factories/stripe-webhook-event.factory.ts` following the existing factory pattern (`StripeAccountFactory`, `StripeCustomerFactory`).
- [x] 1.4 Write integration test for `StripeWebhookEventRepository` (`stripe-webhook-event.repository.spec.ts`) using `TestDatabaseModule` and real DB. Scenarios: `recordEvent()` returns `true` on first insert, returns `false` on duplicate insert (unique constraint violation caught).
- [x] 1.5 Generate TypeORM migration via `npm run db:generate` and verify it creates the expected table and constraints.

## 2. Webhook Event Deduplication (Redis Cache Layer)

- [x] 2.1 Create `WebhookDeduplicationService` in `src/stripe/services/webhook-deduplication.service.ts`. Inject Redis (ioredis) and `StripeWebhookEventRepository`. Implement `isDuplicate(eventId, accountId)` method: check Redis first (key: `stripe:event:{eventId}`, TTL 24h), then try DB insert, handle Redis unavailability gracefully.
- [x] 2.2 Register the new entity, repository, and service in `stripe.module.ts`. Add Redis (ioredis) provider/module import to the Stripe module so `WebhookDeduplicationService` can inject the Redis client.
- [x] 2.3 Integrate deduplication into `StripeWebhookService.handleWebhook()` — call `isDuplicate()` after signature validation, before `buildContext()` and `dispatch()`. The DB INSERT must be committed before handler execution begins to prevent concurrent processing across pods. Return early if duplicate.
- [x] 2.4 Write unit tests for `WebhookDeduplicationService` (Redis hit, Redis miss + DB insert, DB duplicate, Redis unavailable fallback).
- [x] 2.5 Update `StripeWebhookService` tests to cover deduplication integration (duplicate event returns early, new event proceeds).

## 3. Fix Stripe Error Code Matching

- [x] 3.1 Update `tryRefundCharge()` in `handle-early-fraud-warning.ts` to check `error.type === "StripeInvalidRequestError"` and `error.code === "charge_already_refunded"` instead of `error.message.includes("already been refunded")`.
- [x] 3.2 Update the corresponding test in `handle-early-fraud-warning.spec.ts` to mock errors with proper Stripe error structure (`type`, `code` fields).

## 4. Fix Processing Order (Customer Lookup Before Mutations)

- [x] 4.1 Refactor `EarlyFraudWarningWebhookHandler.handle()` to resolve the charge and customer from the local database BEFORE calling `handleEarlyFraudWarning()`. Extract charge ID from the event, retrieve the charge to get the Stripe customer ID, look up the local customer, and skip processing if not found.
- [x] 4.2 Update `handleEarlyFraudWarning` use case signature — it no longer needs to do customer resolution. Accept the already-validated `stripeCustomerId` as input, skip the "no customer" early return (handler already checked).
- [x] 4.3 Update `EarlyFraudWarningWebhookHandler` tests to verify customer lookup happens before `handleEarlyFraudWarning()` is called, and that processing is skipped when customer is not found.
- [x] 4.4 Update `handleEarlyFraudWarning` use case tests to reflect the simplified interface (no longer handles guest checkout / no-customer scenarios).

## 5. Add Observability for Partial Failures

- [x] 5.1 Add `subscriptionCancellationsFailed` to `CustomerUpdatedEventData` type for `early_fraud_warning` in `customer-updated.event.ts`.
- [x] 5.2 Update `EarlyFraudWarningWebhookHandler` to include `subscriptionCancellationsFailed` in the emitted event data. Add `Logger.warn()` when `subscriptionCancellationsFailed > 0` with structured context (customer ID, counts).
- [x] 5.3 Update `EarlyFraudWarningGet` DTO to include `subscriptionCancellationsFailed` field.
- [x] 5.4 Update `WebhookProcessor.getEarlyFraudWarningWebhookEvent()` to pass through `subscriptionCancellationsFailed`.
- [x] 5.5 Update handler tests to verify warn logging on partial failures (spy on `Logger.warn()`, assert structured context includes customer ID, success/failure counts) and verify the failure count is included in emitted events.

## 6. Document Intentional Dual Handler

- [x] 6.1 Add a comment above the `eventTypes` array in `CustomerUpdatedWebhookHandler` explaining that `invoice.paid` is intentionally handled by both this handler (generic customer update) and `InvoicePaidWebhookHandler` (payment receipt with URL). Different downstream consumers use different event types.

## 7. Verify All Tests Pass

- [x] 7.1 Add E2E test scenario to `stripe.e2e.spec.ts`: POST the same webhook event twice through the full stack (controller → service → dedup → handler), verify first request processes normally and second returns 200 without handler execution.
- [x] 7.2 Run the full test suite and fix any failures introduced by the changes.
