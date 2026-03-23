# Backend Test Coverage Audit — Payment-Critical Paths

**Date:** 2026-03-23
**Scope:** Stripe webhooks, subscription lifecycle, external API integrations, billing state

---

## 1. Executive Summary

### Coverage Stats (source files only)

| Metric | Covered | Total | % |
|--------|---------|-------|---|
| Statements | 1161 | 3158 | 36.76%* |
| Branches | 235 | 1685 | 13.94%* |
| Functions | 202 | 638 | 31.66%* |
| Lines | 1026 | 2623 | 39.11%* |

> *\*These numbers were artificially deflated because `collectCoverageFrom` included `dist/` compiled output. This has been fixed — re-run `npm run test:cov` for accurate numbers. Actual `src/`-only coverage is significantly higher — see per-module breakdown below.*

**Source-only highlights:**
- Stripe handlers: **100%** statements
- Stripe use-cases: **100%** statements, **97.67%** branches
- Stripe clients: **92.68%** statements
- Customer services: **92.3%** statements
- Customer repositories: **97.67%** statements

**Test inventory:** 54 test files (47 unit/integration + 7 E2E), ~192 test cases, 6 data factories.

### Assessment

Payment-critical code has **strong unit and use-case test coverage**. The Stripe integration layer — webhook handlers, subscription operations, fraud handling — is well-tested at the service level with good edge-case coverage. All 47 test suites (including 7 E2E tests) pass in CI. However, there are **meaningful gaps**: no idempotency/deduplication testing for webhooks, the webhook controller entry point is only partially covered, and several important state transitions (trial→active, past-due recovery) have no tests. The test infrastructure (testcontainers, factories, mock utilities) is solid and well-positioned for closing these gaps.

---

## 2. What's Working Well

### Webhook Handler Architecture
- All **21 Stripe event types** are handled with a clean dispatcher pattern (`@StripeWebhookHandler` decorator → discovery → dispatch).
- Each handler has dedicated unit tests with mocked dependencies.
- The E2E test at `stripe.e2e.spec.ts` validates the full webhook flow: HTTP → signature validation → dispatch → event emission.
- **6 webhook-related test files** with **~42 test cases** and **~1,350 lines** of test code.

### Early Fraud Warning Handling
- The most thoroughly tested feature: **14 test cases** in the use-case spec alone.
- Covers: actionable vs non-actionable warnings, guest checkouts, already-refunded charges, partial subscription cancellation failures, both string and object formats for charge/customer IDs.
- Both the use-case logic and the webhook handler are independently tested.

### Subscription Upgrade/Downgrade & Cancellation
- **Upgrade:** 95% coverage — unit tests, use-case tests, and E2E tests all present. Validates multi-product scenarios, validation errors, and auth.
- **Cancel at period end:** 95% coverage — cancel, resume, error paths, and DTO reporting all tested across 3 layers (client, use-case, service).
- **Immediate cancel:** 90% coverage — success, errors, non-existent and already-cancelled subscriptions covered.

### Test Infrastructure
- **TestContainers** for PostgreSQL and Redis — real database in integration tests, no mock drift.
- **6 factories** (Customer, CheckoutSession, PortalSession, StripeAccount, StripeCustomer, Tenant) using `@jorgebodega/typeorm-factory`.
- **StubPaymentProvider** for testing non-Stripe paths.
- `createTestingApplication` helper with rawBody support for webhook testing.
- `asTenant()` helper for tenant-scoped request simulation.
- Clean test setup: `beforeEach` clears DB, `afterAll` tears down connections.

### Test Organization
- Follows project conventions: specs colocated with source, E2E files at module root.
- Consistent mocking patterns: `createMock` from `@golevelup/ts-jest` for service tests, `jest.mock("stripe")` for client tests.

---

## 3. Coverage Gaps (by priority)

### P0 — Critical (money/data at risk)

#### 3.1 No Webhook Idempotency/Deduplication

- **Area:** All webhook handlers (`stripe/handlers/`)
- **What's missing:** No tracking of processed `event.id` values. No tests for duplicate event handling. No database table for event deduplication.
- **Risk if untested:** Stripe retries webhooks on timeout/5xx. Without deduplication, the same fraud warning could trigger **duplicate refunds**, or the same `invoice.paid` could emit duplicate events. This is real-money risk.
- **Recommended test type:** Integration test (verify DB insert + idempotency check)
- **Estimated effort:** M (requires new entity + migration + handler changes + tests)

#### ~~3.2 E2E Tests Not Running in CI~~ — VERIFIED FALSE

> **Correction:** `testRegex: ".*\\.spec\\.ts$"` matches `.e2e.spec.ts` files. All 7 E2E tests run and pass in CI (verified via `gh run view` — latest run: 47/47 suites passing, including `stripe.e2e.spec.ts` and `subscription.controller.e2e.spec.ts`). The `ubuntu-latest` runner has Docker pre-installed, so testcontainers work fine.

#### 3.3 Webhook Signature Validation Not Directly Tested

- **Area:** `stripe/models/stripe/client/webhooks-construct-event.ts`
- **What's missing:** This file wraps `stripe.webhooks.constructEvent()` and is **mocked in every test** that uses it. The actual signature validation logic (header parsing, timestamp checking, HMAC verification) is never exercised.
- **Risk if untested:** If the wrapper has a bug (wrong argument order, missing error handling), signature validation silently breaks. Attackers could forge webhook events.
- **Recommended test type:** Integration test with real Stripe SDK (construct + verify a known signature)
- **Estimated effort:** S

#### 3.4 Webhook Controller Entry Point Partially Covered

- **Area:** `stripe/controllers/stripe-webhook.controller.ts` (54.54% statements)
- **What's missing:** No test for missing `stripe-signature` header, malformed `stripeAccountId` UUID, or missing raw body. The E2E test (`stripe.e2e.spec.ts`) tests service-level dispatch but doesn't fully exercise the controller's parameter extraction and error paths.
- **Risk if untested:** Invalid requests might not be rejected properly. Raw body extraction (critical for signature validation) could break silently.
- **Recommended test type:** E2E test (HTTP → controller → service)
- **Estimated effort:** S

### P1 — High (incorrect behavior visible to users)

#### 3.5 No Trial-to-Active Transition Tests

- **Area:** Subscription lifecycle (customer module + webhook handlers)
- **What's missing:** No test for what happens when a trial period ends — subscription moves to `active`, first real charge occurs. The `customer.subscription.trial_will_end` event is registered but has no business logic tests.
- **Risk if untested:** Trial expiration could fail to activate the subscription or provision the product correctly. Users could lose access or get charged without service.
- **Recommended test type:** Unit test (service) + integration test (webhook → state change)
- **Estimated effort:** M

#### 3.6 No Past-Due Recovery Tests

- **Area:** Subscription lifecycle
- **What's missing:** No test for payment recovery after `past_due` status. No test for payment method update → subscription resumption. No test for extended past-due → automatic cancellation by Stripe.
- **Risk if untested:** Users who update their payment method might not have their subscription reactivated. Dunning flow could be broken without detection.
- **Recommended test type:** Unit test + E2E test
- **Estimated effort:** M

#### 3.7 `send-webhook-on-customer-updated` Listener Untested

- **Area:** `customer/listeners/send-webhook-on-customer-updated.listener.ts`
- **What's missing:** No test at all. This listener dispatches outbound webhooks when customer state changes (subscription events, fraud warnings, etc.).
- **Risk if untested:** Downstream systems (client apps) might not receive notifications of subscription changes. Webhook payloads could be malformed.
- **Recommended test type:** Unit test
- **Estimated effort:** S

#### 3.8 `list-active-subscriptions` Client Untested

- **Area:** `stripe/models/stripe/client/list-active-subscriptions.ts`
- **What's missing:** No unit test. The similar `list-subscriptions.ts` has a test, but this file (which filters for active/trialing statuses) does not.
- **Risk if untested:** Subscription filtering could return incorrect results, affecting upgrade/cancel/fraud operations that rely on knowing active subscriptions.
- **Recommended test type:** Unit test
- **Estimated effort:** S

### P2 — Medium (reduces confidence, low blast radius)

#### 3.9 No Webhook Replay Attack Prevention

- **Area:** Webhook signature validation
- **What's missing:** No test for timestamp-based replay protection. Stripe recommends validating that `event.created` is within tolerance window (~5 minutes).
- **Risk if untested:** Old captured webhook payloads could be replayed to trigger duplicate actions.
- **Recommended test type:** Unit test
- **Estimated effort:** S

#### 3.10 Stripe Client Factory Untested

- **Area:** `stripe/services/stripe-payment-provider-client-factory.ts`
- **What's missing:** No test. This factory creates per-tenant Stripe clients using stored API keys.
- **Risk if untested:** Tenant isolation could break — one tenant's Stripe operations could use another tenant's API key.
- **Recommended test type:** Unit test
- **Estimated effort:** S

#### 3.11 No Concurrent Operation Tests

- **Area:** Subscription operations
- **What's missing:** No tests for simultaneous upgrade + cancel, or double-cancel scenarios at the API level.
- **Risk if untested:** Race conditions could leave subscription in inconsistent state.
- **Recommended test type:** E2E test with parallel requests
- **Estimated effort:** M

#### ~~3.12 `collectCoverageFrom` Misconfiguration~~ — FIXED

- **Area:** `packages/backend/package.json` Jest config
- **What was wrong:** `collectCoverageFrom: "**/*.(t|j)s"` included `dist/` directory, inflating denominators and making aggregate coverage numbers meaningless.
- **Resolution:** Changed to `["src/**/*.ts", "!src/**/*.spec.ts", "!src/**/*.d.ts", "!src/**/index.ts", "!src/database/migrations/**"]`.

#### 3.13 No Proration Edge Case Tests

- **Area:** Subscription upgrade use-case
- **What's missing:** No tests for mid-cycle upgrade proration behavior (automatic vs manual proration, credit/debit calculations).
- **Risk if untested:** Users could be over/undercharged during plan changes.
- **Recommended test type:** Unit test
- **Estimated effort:** S

### P3 — Low (best-practice improvement)

#### 3.14 Health Controller Untested

- **Area:** `health/health.controller.ts`
- **What's missing:** No E2E test for health endpoint.
- **Risk if untested:** Deployment health checks could silently break.
- **Recommended test type:** E2E test
- **Estimated effort:** S

#### 3.15 CASL Permissions Partially Tested

- **Area:** `casl/` module and permission hooks
- **What's missing:** Permission hooks (`customer.hook.ts`, `base.hook.ts`) have no tests.
- **Risk if untested:** Authorization drift — users could gain access to resources they shouldn't.
- **Recommended test type:** Unit test
- **Estimated effort:** S

#### 3.16 Database Exception Filter Untested

- **Area:** `database/filters/typeorm-exception.filter.ts`
- **What's missing:** No test for TypeORM exception mapping to HTTP responses.
- **Risk if untested:** Database errors could leak internal details in API responses.
- **Recommended test type:** Unit test
- **Estimated effort:** S

#### 3.17 Webhook Processor Queue Error Handling

- **Area:** `customer/processors/webhook.processor.ts` (93.54% coverage)
- **What's missing:** Remaining ~7% uncovered — likely error/retry paths in the Bull queue processor.
- **Risk if untested:** Failed outbound webhook deliveries might not retry correctly.
- **Recommended test type:** Unit test
- **Estimated effort:** S

---

## 4. Recommended Test Implementation Plan

### Tier 0 — Do Immediately (P0, high ROI, low effort)

| # | Task | Type | Effort | Gap |
|---|------|------|--------|-----|
| ~~1~~ | ~~Add E2E tests to CI pipeline~~ — **Already working.** Verified all 7 E2E suites pass in CI. | ~~CI config~~ | — | ~~3.2~~ |
| 2 | **Fix `collectCoverageFrom`** — **DONE.** Changed to `["src/**/*.ts", "!src/**/*.spec.ts", "!src/**/*.d.ts", "!src/**/index.ts", "!src/database/migrations/**"]` | Config | S | 3.12 |
| 3 | **Add integration test for `webhooksConstructEvent`** — test with real Stripe SDK, verify valid signature passes and invalid rejects. Don't mock the function. | Integration | S | 3.3 |
| 4 | **Complete webhook controller E2E tests** — add cases for missing `stripe-signature` header, malformed UUID, missing raw body | E2E | S | 3.4 |

### Tier 1 — Do Next Sprint (P0-P1, medium effort)

| # | Task | Type | Effort | Gap |
|---|------|------|--------|-----|
| 5 | **Implement and test webhook event deduplication** — add `ProcessedWebhookEvent` entity, check `event.id` before processing, test duplicate delivery returns 200 without side effects | Integration | M | 3.1 |
| 6 | **Add unit test for `list-active-subscriptions` client** — verify status filtering for `active` and `trialing` | Unit | S | 3.8 |
| 7 | **Add unit test for `send-webhook-on-customer-updated` listener** — verify event payload construction and dispatch | Unit | S | 3.7 |
| 8 | **Add trial-to-active transition tests** — test `customer.subscription.updated` webhook when status changes from `trialing` to `active`, verify product provisioning | Unit + Integration | M | 3.5 |

### Tier 2 — Do This Quarter (P1-P2)

| # | Task | Type | Effort | Gap |
|---|------|------|--------|-----|
| 9 | **Add past-due recovery tests** — test `invoice.payment_succeeded` after `past_due` status, verify subscription reactivation and product access | Unit + E2E | M | 3.6 |
| 10 | **Add Stripe client factory test** — verify per-tenant isolation, correct API key usage | Unit | S | 3.10 |
| 11 | **Add webhook replay protection test** — verify stale event timestamps are rejected | Unit | S | 3.9 |
| 12 | **Add proration edge case tests** — mid-cycle upgrade with automatic proration | Unit | S | 3.13 |

### Tier 3 — Backlog (P2-P3)

| # | Task | Type | Effort | Gap |
|---|------|------|--------|-----|
| 13 | Add health endpoint E2E test | E2E | S | 3.14 |
| 14 | Add CASL permission hook tests | Unit | S | 3.15 |
| 15 | Add TypeORM exception filter test | Unit | S | 3.16 |
| 16 | Add concurrent subscription operation tests | E2E | M | 3.11 |
| 17 | Improve webhook processor queue error coverage | Unit | S | 3.17 |

---

## 5. Infrastructure Recommendations

### Fixed

1. ~~**Run E2E tests in CI**~~ — **Not an issue.** Verified all 7 E2E suites pass in CI. `testRegex: ".*\\.spec\\.ts$"` matches `.e2e.spec.ts`, and `ubuntu-latest` has Docker for testcontainers.

2. **Fix coverage glob** — **DONE.** Changed `collectCoverageFrom` from `"**/*.(t|j)s"` (which included `dist/`) to:
   ```json
   "collectCoverageFrom": [
     "src/**/*.ts",
     "!src/**/*.spec.ts",
     "!src/**/*.d.ts",
     "!src/**/index.ts",
     "!src/database/migrations/**"
   ]
   ```

### To Investigate

3. **Testcontainer race condition on WSL2** — 7 E2E/repository test suites failed locally with `the database system is starting up`. This does NOT affect CI (all pass on `ubuntu-latest`), but impacts local development on WSL2. The `TestDatabaseModule` may need a readiness probe for slower Docker environments.

### Should Add

4. **Stripe webhook event fixture builder** — Create a shared factory/builder for constructing realistic Stripe event objects. Currently each test constructs events inline, leading to duplication and potential drift from real Stripe payloads. Example:
   ```typescript
   // test/helpers/stripe-event.builder.ts
   class StripeEventBuilder {
     static invoicePaid(overrides?: Partial<Stripe.Invoice>): Stripe.Event { ... }
     static earlyFraudWarning(overrides?: Partial<Stripe.Radar.EarlyFraudWarning>): Stripe.Event { ... }
     static subscriptionUpdated(overrides?: Partial<Stripe.Subscription>): Stripe.Event { ... }
   }
   ```

5. **Coverage thresholds** — Once the glob is fixed, add per-module coverage thresholds in Jest config to prevent regression:
   ```json
   "coverageThreshold": {
     "src/stripe/**": { "statements": 90, "branches": 85 },
     "src/customer/**": { "statements": 80, "branches": 75 }
   }
   ```

6. **Missing factory: Subscription** — No factory exists for subscription-related test data. Consider adding a `SubscriptionFactory` that builds Stripe subscription objects for consistent test data across webhook and service tests.

### Nice to Have

7. **Contract tests for Stripe API** — Use recorded Stripe API responses (via `nock` or `msw`) to catch drift between mocked responses and real Stripe API behavior. Especially valuable for edge cases like `StripeInvalidRequestError` response shapes.

8. **Test reporting** — Add a coverage report artifact to CI (e.g., upload to Codecov or generate HTML report) so coverage trends are visible over time.

---

## Appendix: Test File Inventory

### By Module

**Stripe (29 test files):**
- `handlers/` — 3 files (customer-updated, early-fraud-warning, invoice-paid)
- `models/stripe/client/` — 11 files (cancel, create, list, refund, retrieve, update operations)
- `models/stripe/use-cases/` — 7 files (cancel, create-checkout, create-portal, get-subscriptions, handle-fraud, sync-customer, update-subscription)
- `services/` — 3 files (webhook service, dispatcher, payment provider)
- `repositories/` — 2 files (stripe-account, stripe-customer)
- `entities/` — 1 file (stripe-account)
- `stripe.e2e.spec.ts` — 1 file (webhook E2E)
- `stripe-payment-provider-client.spec.ts` — 1 file

**Customer (15 test files):**
- `controllers/` — 6 E2E files (checkout-session, checkout, customer, portal-session, portal, subscription)
- `services/` — 4 files (checkout-session, customer, portal-session, subscription)
- `repositories/` — 3 files (checkout-session, customer, portal-session)
- `processors/` — 1 file (webhook processor)
- `permissions/` — 1 file (customer permissions)

**Payment Provider (1 test file):**
- `services/payment-provider.service.spec.ts`

**Tenant (2 test files):**
- `guards/tenant.guard.spec.ts`
- `repositories/tenant.repository.spec.ts`

### Per-Module Source Coverage (src/ only)

| Module | Statements | Branches | Functions | Lines |
|--------|-----------|----------|-----------|-------|
| stripe/handlers | 100% | 100% | 100% | 100% |
| stripe/use-cases | 100% | 97.67% | 100% | 100% |
| stripe/clients | 92.68% | — | — | 92.3% |
| stripe/services | 96.29% | — | — | 95.83% |
| customer/repositories | 97.67% | — | — | 97.29% |
| customer/services | 92.3% | — | — | 91.22% |
| customer/processors | 93.54% | — | — | 92.85% |
| customer/controllers | 81.44% | — | — | 80.72% |
| stripe/controllers | 54.54% | — | — | — |
| stripe/repositories | 63.63% | — | — | — |
| health | 0% | 0% | 0% | 0% |
| database/migrations | 0% | 0% | 0% | 0% |
