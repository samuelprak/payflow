## ADDED Requirements

### Requirement: WebhookDeliveryLog entity
The system SHALL have a `WebhookDeliveryLog` entity with fields: `id` (UUID, PK), `tenantId` (UUID, FK → Tenant), `customerId` (UUID, FK → Customer, nullable), `eventType` (string — e.g. "customer.updated", "invoice.paid", "early_fraud_warning"), `payload` (JSONB — the webhook event body), `statusCode` (integer, nullable — HTTP response code from tenant endpoint), `responseBody` (text, nullable — truncated to 2000 chars), `success` (boolean), `attemptNumber` (integer), `createdAt` (timestamp).

#### Scenario: Entity is persisted
- **WHEN** a webhook delivery attempt is made
- **THEN** a WebhookDeliveryLog record is created with all fields populated

#### Scenario: Failed delivery has null statusCode
- **WHEN** the webhook delivery fails due to network error (no HTTP response)
- **THEN** `statusCode` is null and `success` is false

### Requirement: Database migration for WebhookDeliveryLog
The system SHALL include a TypeORM migration that creates the `webhook_delivery_log` table with appropriate columns, foreign keys, and an index on `(tenantId, createdAt)`.

#### Scenario: Migration runs forward
- **WHEN** `npm run db:migrate` is run
- **THEN** the `webhook_delivery_log` table is created with all columns and indexes

### Requirement: WebhookProcessor persists delivery logs
The system SHALL modify the existing `WebhookProcessor` to create a `WebhookDeliveryLog` record after every webhook delivery attempt (both success and failure).

#### Scenario: Successful delivery is logged
- **WHEN** a webhook is delivered successfully (2xx response)
- **THEN** a WebhookDeliveryLog is created with `success: true`, the HTTP status code, and the response body (truncated)

#### Scenario: Failed delivery is logged
- **WHEN** a webhook delivery fails (non-2xx response or network error)
- **THEN** a WebhookDeliveryLog is created with `success: false`, the status code (if available), and error details

#### Scenario: Retry attempts are individually logged
- **WHEN** a webhook delivery is retried 3 times (attempts 1, 2, 3)
- **THEN** 3 separate WebhookDeliveryLog records are created with `attemptNumber` 1, 2, and 3

### Requirement: WebhookDeliveryLog repository
The system SHALL provide a `WebhookDeliveryLogRepository` with methods for: creating log entries, finding logs by tenant (paginated), filtering by success/failure, and counting successes/failures within a time range.

#### Scenario: Query logs by tenant with pagination
- **WHEN** `findByTenant(tenantId, { page: 1, limit: 20 })` is called
- **THEN** the 20 most recent logs for that tenant are returned, ordered by createdAt descending

#### Scenario: Count success rate
- **WHEN** `getSuccessRate(tenantId, since)` is called
- **THEN** it returns the percentage of successful deliveries since the given timestamp

### Requirement: Log retention cleanup
The system SHALL run a scheduled job (daily) that deletes WebhookDeliveryLog records older than 30 days.

#### Scenario: Old logs are cleaned up
- **WHEN** the daily cleanup job runs
- **THEN** all WebhookDeliveryLog records with `createdAt` older than 30 days are deleted

#### Scenario: Recent logs are preserved
- **WHEN** the daily cleanup job runs
- **THEN** logs from the last 30 days are not deleted
