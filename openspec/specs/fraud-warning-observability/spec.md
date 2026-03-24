## ADDED Requirements

### Requirement: Partial subscription cancellation failures SHALL be logged at warn level
When some but not all subscriptions fail to cancel during early fraud warning processing, the system SHALL log a warning with structured context including the customer ID, fraud warning ID, count of successful cancellations, and count of failed cancellations.

#### Scenario: All subscriptions cancelled successfully
- **WHEN** a fraud warning is processed and all 3 active subscriptions are cancelled successfully
- **THEN** the system SHALL log at info level with the success count and no warning SHALL be emitted

#### Scenario: Some subscriptions fail to cancel
- **WHEN** a fraud warning is processed, 2 of 3 subscriptions cancel successfully, and 1 fails
- **THEN** the system SHALL log a warning including `subscriptionsCancelled: 2`, `subscriptionCancellationsFailed: 1`, and the customer ID
- **AND** tests SHALL verify this by spying on `Logger.warn()` and asserting the structured context object contains the expected fields (customer ID, success count, failure count)

### Requirement: Partial failure counts SHALL be propagated to downstream consumers
The `CustomerUpdatedEvent` data for `early_fraud_warning` type SHALL include the `subscriptionCancellationsFailed` count so that the webhook processor can include this information in the customer-facing webhook payload.

#### Scenario: Webhook payload includes failure count
- **WHEN** a fraud warning is processed with partial subscription cancellation failures
- **THEN** the `CustomerUpdatedEvent` SHALL include `subscriptionCancellationsFailed` in its data payload
- **AND** the webhook processor SHALL include this count in the `EarlyFraudWarningGet` DTO sent to the customer system

### Requirement: Intentional dual invoice.paid handler subscription SHALL be documented
The `CustomerUpdatedWebhookHandler` subscribes to `invoice.paid` intentionally alongside `InvoicePaidWebhookHandler`. A code comment SHALL explain that these serve different purposes: generic customer update notification vs. payment receipt with URL.

#### Scenario: invoice.paid event arrives
- **WHEN** an `invoice.paid` webhook event is received
- **THEN** both `CustomerUpdatedWebhookHandler` and `InvoicePaidWebhookHandler` SHALL process the event, emitting `customer.updated` and `invoice.paid` event types respectively
