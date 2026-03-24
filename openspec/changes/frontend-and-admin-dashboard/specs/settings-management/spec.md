## ADDED Requirements

### Requirement: Settings layout with sidebar navigation
The system SHALL render a settings layout at `/app/settings` with a left-side navigation listing: General, API Keys, Stripe, Webhooks. The navigation SHALL highlight the active section.

#### Scenario: Admin visits settings
- **WHEN** an authenticated admin navigates to `/app/settings`
- **THEN** they are redirected to `/app/settings/general` (default section)

### Requirement: General settings page
The system SHALL render a General settings page at `/app/settings/general` with a form to edit tenant name and webhook URL.

#### Scenario: Admin updates tenant name
- **WHEN** an admin changes the tenant name and clicks "Save"
- **THEN** `PATCH /admin/tenant` is called with the new name, a success toast is shown, and the form reflects the saved value

#### Scenario: Webhook URL validation
- **WHEN** an admin enters an invalid URL in the webhook URL field
- **THEN** Zod validation shows "Please enter a valid URL" error and the form cannot be submitted

#### Scenario: Form loads with current values
- **WHEN** the general settings page loads
- **THEN** the form fields are pre-populated with current tenant name and webhook URL from `GET /admin/tenant`

### Requirement: API Keys settings page
The system SHALL render an API Keys page at `/app/settings/api-keys` displaying the current API key (masked by default) with a "Show" toggle and a "Regenerate" action.

#### Scenario: Admin views masked API key
- **WHEN** the API Keys page loads
- **THEN** the API key is displayed as `pk_****...****` (first 3 and last 4 characters visible)

#### Scenario: Admin reveals API key
- **WHEN** an admin clicks the "Show" toggle
- **THEN** the full API key is displayed in a copyable code block

#### Scenario: Admin copies API key
- **WHEN** an admin clicks the "Copy" button next to the API key
- **THEN** the API key is copied to the clipboard and a "Copied!" toast is shown

#### Scenario: Admin regenerates API key
- **WHEN** an admin clicks "Regenerate API Key"
- **THEN** a confirmation dialog warns "This will invalidate your current key. All integrations using it will stop working."

#### Scenario: Regeneration confirmed
- **WHEN** an admin confirms regeneration in the dialog
- **THEN** `POST /admin/tenant/api-key/regenerate` is called, the new key is displayed (revealed), and a success toast is shown

### Requirement: Stripe connection settings page
The system SHALL render a Stripe settings page at `/app/settings/stripe` with a form to connect a Stripe account by entering the publishable key, secret key, and webhook secret.

#### Scenario: No Stripe account connected
- **WHEN** the Stripe page loads and no Stripe account is linked to the tenant
- **THEN** a form is displayed with fields for publishable key, secret key, and webhook secret, plus a "Connect" button

#### Scenario: Admin connects Stripe account
- **WHEN** an admin enters valid Stripe keys and clicks "Connect"
- **THEN** `PUT /admin/stripe-account` is called, a success toast is shown, and the page shows the connected status

#### Scenario: Stripe account already connected
- **WHEN** the Stripe page loads and a Stripe account is linked
- **THEN** the page shows a "Connected" status badge, masked key previews, and an "Update Keys" button to modify them

#### Scenario: Stripe key validation
- **WHEN** an admin enters a publishable key that doesn't start with `pk_`
- **THEN** Zod validation shows an error message

### Requirement: Webhook logs settings page
The system SHALL render a Webhooks page at `/app/settings/webhooks` with a DataTable of recent webhook delivery attempts.

#### Scenario: Admin views webhook logs
- **WHEN** the Webhooks page loads
- **THEN** a table displays webhook deliveries with columns: event type, customer email, status (success/failed badge), HTTP response code, and timestamp

#### Scenario: Filter by status
- **WHEN** an admin selects "Failed" from the status filter
- **THEN** only failed webhook deliveries are displayed

#### Scenario: Expand delivery details
- **WHEN** an admin clicks on a webhook log row
- **THEN** an expandable section shows the full event payload and response body

#### Scenario: Empty webhook logs
- **WHEN** there are no webhook deliveries
- **THEN** the table shows an empty state ("No webhook deliveries yet")

### Requirement: Settings queries use React Query
The system SHALL implement `useTenant`, `useUpdateTenant`, `useApiKey`, `useRegenerateApiKey`, `useStripeAccount`, `useConnectStripe`, `useWebhookLogs` hooks in `modules/settings/queries/`.

#### Scenario: Mutation invalidates tenant query
- **WHEN** `useUpdateTenant` mutation succeeds
- **THEN** the `["tenant"]` query key is invalidated, triggering a refetch

### Requirement: Settings forms use React Hook Form + Zod
The system SHALL implement all settings forms using React Hook Form with Zod resolvers, matching Boardbot's form pattern (schema → zodResolver → useForm → Controller for MUI inputs).

#### Scenario: Form validation on submit
- **WHEN** an admin submits a form with invalid data
- **THEN** validation errors display inline beneath the relevant fields without making an API call
