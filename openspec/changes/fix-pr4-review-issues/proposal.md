## Why

PR #4 (`feat/early-fraud-warning-handling`) introduced a Stripe webhook dispatcher pattern with early fraud warning handling. Code review identified critical production risks: duplicate webhook processing (no idempotency), fragile error matching, reversed mutation order, and missing observability for partial failures. These must be fixed before merging, as the handler performs irreversible financial operations (refunds + subscription cancellations).

## What Changes

- Add webhook event deduplication to prevent duplicate processing of the same Stripe event (prevents double refunds and race conditions between `.created` and `.updated` events)
- Replace string-based error message matching with Stripe's structured error codes in `tryRefundCharge`
- Add a clarifying comment on the intentional dual `invoice.paid` handler subscription
- Add observability (structured logging / warnings) for partial subscription cancellation failures
- Fix reversed processing order in `EarlyFraudWarningWebhookHandler` — look up customer before performing mutations
- Update all related tests to match the new behavior

## Capabilities

### New Capabilities
- `webhook-idempotency`: Stripe webhook event deduplication preventing duplicate processing via event ID tracking and locking
- `fraud-warning-observability`: Structured logging and warnings for partial failures during early fraud warning processing

### Modified Capabilities

## Impact

- **Stripe module**: `stripe-webhook.service.ts`, `stripe-webhook-dispatcher.service.ts`, `early-fraud-warning-webhook.handler.ts`, `handle-early-fraud-warning.ts`, `customer-updated-webhook.handler.ts`
- **Database**: New entity for webhook event tracking (migration required)
- **Tests**: Updates to handler specs, use-case specs, service specs
