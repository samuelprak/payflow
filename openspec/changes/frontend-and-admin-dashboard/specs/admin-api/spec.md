## ADDED Requirements

### Requirement: Admin API module in NestJS
The system SHALL provide an `AdminModule` that registers all admin controllers and imports necessary service modules (CustomerModule, StripeModule, TenantModule).

#### Scenario: Admin module loads
- **WHEN** the NestJS application starts
- **THEN** the AdminModule registers all `/admin/*` routes

### Requirement: GET /admin/dashboard/stats
The system SHALL provide an endpoint returning aggregated stats for the admin's tenant: total customer count, active subscription count, estimated MRR, and webhook success rate (last 24h).

#### Scenario: Stats are returned
- **WHEN** an authenticated admin calls `GET /admin/dashboard/stats`
- **THEN** the response contains `{ customerCount, activeSubscriptionCount, mrr, webhookSuccessRate }`

#### Scenario: Stats are cached
- **WHEN** `GET /admin/dashboard/stats` is called twice within 5 minutes
- **THEN** the second call returns cached data from Redis without querying Stripe

### Requirement: GET /admin/dashboard/activity
The system SHALL provide an endpoint returning the most recent 20 webhook delivery logs for the admin's tenant, ordered by creation date descending.

#### Scenario: Activity is returned
- **WHEN** an authenticated admin calls `GET /admin/dashboard/activity`
- **THEN** the response contains an array of WebhookDeliveryLog entries with eventType, customerEmail, success, statusCode, and createdAt

### Requirement: GET /admin/customers
The system SHALL provide a paginated endpoint listing customers for the admin's tenant, with optional search parameter filtering by email or userRef.

#### Scenario: List customers with pagination
- **WHEN** `GET /admin/customers?page=1&limit=20` is called
- **THEN** the response contains `{ data: Customer[], total: number, page: number, limit: number }`

#### Scenario: Search customers
- **WHEN** `GET /admin/customers?search=alice` is called
- **THEN** only customers with "alice" in their email or userRef are returned

#### Scenario: Tenant isolation
- **WHEN** admin A calls `GET /admin/customers`
- **THEN** only customers belonging to admin A's tenant are returned, never customers from other tenants

### Requirement: GET /admin/customers/:id
The system SHALL provide an endpoint returning a single customer with their subscriptions.

#### Scenario: Customer found
- **WHEN** `GET /admin/customers/:id` is called with a valid customer ID belonging to the admin's tenant
- **THEN** the response contains the customer's details and their current subscriptions (from Stripe)

#### Scenario: Customer not found
- **WHEN** `GET /admin/customers/:id` is called with a non-existent or other-tenant customer ID
- **THEN** the response is 404 Not Found

### Requirement: POST /admin/customers/:id/checkout-sessions
The system SHALL provide an endpoint to create a checkout session for a customer, reusing the existing `CheckoutSessionService`.

#### Scenario: Checkout session created
- **WHEN** `POST /admin/customers/:id/checkout-sessions` is called with valid product data
- **THEN** the response contains `{ checkoutUrl }` and a CheckoutSession record is persisted

### Requirement: POST /admin/customers/:id/portal-sessions
The system SHALL provide an endpoint to create a portal session for a customer, reusing the existing `PortalSessionService`.

#### Scenario: Portal session created
- **WHEN** `POST /admin/customers/:id/portal-sessions` is called with a return URL
- **THEN** the response contains `{ portalUrl }` and a PortalSession record is persisted

### Requirement: PATCH /admin/customers/:id/subscriptions
The system SHALL provide an endpoint to cancel a customer's subscription, reusing the existing `SubscriptionService`.

#### Scenario: Subscription cancelled at period end
- **WHEN** `PATCH /admin/customers/:id/subscriptions` is called with `{ cancelAtPeriodEnd: true }`
- **THEN** the subscription is set to cancel at the end of the current billing period

### Requirement: GET /admin/tenant
The system SHALL provide an endpoint returning the admin's tenant details: id, name, webhookUrl, createdAt, and a boolean indicating if Stripe is connected.

#### Scenario: Tenant details returned
- **WHEN** `GET /admin/tenant` is called
- **THEN** the response contains tenant fields and `stripeConnected: boolean`

### Requirement: PATCH /admin/tenant
The system SHALL provide an endpoint to update the admin's tenant name and/or webhook URL.

#### Scenario: Update tenant name
- **WHEN** `PATCH /admin/tenant` is called with `{ name: "New Name" }`
- **THEN** the tenant name is updated and the response contains the updated tenant

#### Scenario: Validation error
- **WHEN** `PATCH /admin/tenant` is called with an invalid webhook URL
- **THEN** the response is 400 with validation error details

### Requirement: GET /admin/tenant/api-key
The system SHALL provide an endpoint returning the tenant's API key.

#### Scenario: API key returned
- **WHEN** `GET /admin/tenant/api-key` is called
- **THEN** the response contains `{ apiKey: "full-key-value" }`

### Requirement: POST /admin/tenant/api-key/regenerate
The system SHALL provide an endpoint that generates a new API key for the tenant, replacing the old one immediately.

#### Scenario: API key regenerated
- **WHEN** `POST /admin/tenant/api-key/regenerate` is called
- **THEN** a new UUID-based API key is generated, the old key is invalidated, and the response contains the new key

#### Scenario: Old key stops working after regeneration
- **WHEN** the API key is regenerated
- **THEN** requests using the old API key via the `x-api-key` header receive 401 Unauthorized

### Requirement: GET /admin/stripe-account
The system SHALL provide an endpoint returning the Stripe account connection status and masked key previews for the admin's tenant.

#### Scenario: Stripe account connected
- **WHEN** `GET /admin/stripe-account` is called and the tenant has a linked Stripe account
- **THEN** the response contains `{ connected: true, publishableKeyPreview: "pk_...xxxx" }`

#### Scenario: No Stripe account
- **WHEN** `GET /admin/stripe-account` is called and the tenant has no linked Stripe account
- **THEN** the response contains `{ connected: false }`

### Requirement: PUT /admin/stripe-account
The system SHALL provide an endpoint to connect or update a Stripe account for the tenant.

#### Scenario: Connect Stripe account
- **WHEN** `PUT /admin/stripe-account` is called with publishable key, secret key, and webhook secret
- **THEN** a StripeAccount is created (or updated), linked to the tenant, and the response confirms connection

### Requirement: GET /admin/webhook-logs
The system SHALL provide a paginated endpoint returning webhook delivery logs for the admin's tenant, with optional status filter.

#### Scenario: List webhook logs
- **WHEN** `GET /admin/webhook-logs?page=1&limit=20` is called
- **THEN** the response contains paginated WebhookDeliveryLog entries

#### Scenario: Filter by failure
- **WHEN** `GET /admin/webhook-logs?success=false` is called
- **THEN** only failed delivery logs are returned

### Requirement: All admin endpoints require AdminGuard
Every `/admin/*` endpoint (except `POST /admin/auth/register`) SHALL be protected by `AdminGuard`, requiring a valid OIDC Bearer token.

#### Scenario: Unauthenticated request
- **WHEN** a request to any `/admin/*` endpoint lacks a valid Bearer token
- **THEN** the response is 401 Unauthorized

### Requirement: Admin API uses Swagger documentation
All admin endpoints SHALL include `@ApiTags("admin")` and `@ApiOperation()` decorators for OpenAPI documentation.

#### Scenario: Swagger lists admin endpoints
- **WHEN** a developer visits `/api`
- **THEN** all `/admin/*` endpoints are listed under the "admin" tag with descriptions
