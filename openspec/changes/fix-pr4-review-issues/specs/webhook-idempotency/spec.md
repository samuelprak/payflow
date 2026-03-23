## ADDED Requirements

### Requirement: Webhook events SHALL be deduplicated by event ID
The system SHALL reject duplicate Stripe webhook events by tracking processed event IDs. Each event MUST be processed at most once per Stripe account, even if delivered multiple times by Stripe's retry mechanism.

#### Scenario: First delivery of a webhook event
- **WHEN** a Stripe webhook event arrives with `event.id = "evt_123"` for account `"acc_456"` and no record exists for this combination
- **THEN** the system SHALL insert a record into the `stripe_webhook_events` table, cache the event ID in Redis with a 24-hour TTL, and proceed with normal event processing

#### Scenario: Duplicate delivery of a webhook event (Redis cache hit)
- **WHEN** a Stripe webhook event arrives with `event.id = "evt_123"` for account `"acc_456"` and the Redis cache contains an entry for this event
- **THEN** the system SHALL return HTTP 200 immediately without processing the event and without querying the database

#### Scenario: Duplicate delivery of a webhook event (database constraint violation)
- **WHEN** a Stripe webhook event arrives with `event.id = "evt_123"` for account `"acc_456"` and the Redis cache does NOT contain an entry but the database already has a record for this combination
- **THEN** the system SHALL catch the unique constraint violation, set the Redis cache for this event, and return HTTP 200 without processing the event

#### Scenario: Redis unavailable during deduplication check
- **WHEN** a Stripe webhook event arrives and Redis is unreachable
- **THEN** the system SHALL fall back to database-only deduplication and proceed normally without the Redis cache layer

### Requirement: Webhook event repository SHALL enforce uniqueness at the database level
The `StripeWebhookEventRepository.recordEvent()` method SHALL reliably distinguish between a successful first insert and a duplicate insert by catching the unique constraint violation. This behavior MUST be verified against a real database, not mocks, as the concurrency safety of the entire dedup system depends on it.

#### Scenario: First insert succeeds
- **WHEN** `recordEvent("evt_123", "acc_456")` is called and no record exists for this combination
- **THEN** the method SHALL insert the record and return `true`

#### Scenario: Duplicate insert is rejected
- **WHEN** `recordEvent("evt_123", "acc_456")` is called and a record already exists for this combination
- **THEN** the method SHALL catch the unique constraint violation and return `false` without throwing

### Requirement: Race conditions between concurrent fraud warning events SHALL be prevented
The system SHALL prevent parallel processing of `radar.early_fraud_warning.created` and `radar.early_fraud_warning.updated` events for the same fraud warning. The database unique constraint on `(stripeEventId, stripeAccountId)` provides the serialization boundary.

#### Scenario: Created and updated events arrive simultaneously
- **WHEN** `radar.early_fraud_warning.created` (event ID `evt_A`) and `radar.early_fraud_warning.updated` (event ID `evt_B`) arrive simultaneously for the same fraud warning
- **THEN** both events SHALL be processed independently since they have different event IDs. The refund path is application-level idempotent (`charge.refunded` check + `charge_already_refunded` error code handling), but subscription cancellation relies on Stripe's API treating redundant `subscriptions.cancel()` calls as no-ops — the application does NOT enforce idempotency on cancellation itself

#### Scenario: Same event delivered concurrently to multiple pods
- **WHEN** Stripe delivers the same event `evt_A` to two pods simultaneously and neither pod has a Redis cache entry
- **THEN** both pods SHALL attempt a database INSERT. The unique constraint on `(stripeEventId, stripeAccountId)` guarantees exactly one pod wins the insert. The losing pod SHALL catch the constraint violation, return HTTP 200, and skip processing. The DB unique constraint serves as the distributed lock — no Redis `SETNX` or distributed mutex is required
- **AND** the winning pod's INSERT MUST be committed before handler execution begins, ensuring no window for concurrent processing

### Requirement: Stripe error codes SHALL be used for refund error handling
The `tryRefundCharge` function SHALL use Stripe's structured error code (`charge_already_refunded`) instead of string matching on the error message to detect already-refunded charges.

#### Scenario: Charge has already been refunded
- **WHEN** a refund attempt fails with a Stripe error where `error.code === "charge_already_refunded"`
- **THEN** the system SHALL treat this as a non-error condition, log the occurrence, and return `false` (charge was not refunded by us)

#### Scenario: Unexpected refund error
- **WHEN** a refund attempt fails with any other Stripe error
- **THEN** the system SHALL propagate the error to the caller

### Requirement: Customer lookup SHALL occur before irreversible mutations
The `EarlyFraudWarningWebhookHandler` SHALL resolve the customer from the local database before calling `handleEarlyFraudWarning()`. If the customer cannot be found, the handler SHALL skip processing entirely.

#### Scenario: Customer exists in local database
- **WHEN** an early fraud warning event arrives and the associated Stripe customer maps to a local customer record
- **THEN** the system SHALL proceed with refund and subscription cancellation

#### Scenario: Customer not found in local database
- **WHEN** an early fraud warning event arrives and the associated Stripe customer does NOT map to a local customer record
- **THEN** the system SHALL log this occurrence and skip all processing (no refund, no cancellation, no event emission)

#### Scenario: Charge has no associated customer (guest checkout)
- **WHEN** an early fraud warning event arrives and the charge has no customer field
- **THEN** the system SHALL log this and skip processing
