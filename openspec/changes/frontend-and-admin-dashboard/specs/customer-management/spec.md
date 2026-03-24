## ADDED Requirements

### Requirement: Customer list page at /app/customers
The system SHALL render a paginated customer list at `/app/customers` using a DataTable component (TanStack Table + MUI).

#### Scenario: Admin views customer list
- **WHEN** an authenticated admin navigates to `/app/customers`
- **THEN** they see a table with columns: email, userRef, subscription status, created date

#### Scenario: Empty customer list
- **WHEN** the tenant has no customers
- **THEN** the table shows an empty state ("No customers yet. Customers appear after your first API sync.")

### Requirement: Customer search
The system SHALL provide a search input above the customer table that filters customers by email or userRef. The search SHALL debounce input (300ms) and send the query to `GET /admin/customers?search=<term>`.

#### Scenario: Search by email
- **WHEN** an admin types "alice@" in the search input
- **THEN** the customer list filters to show only customers whose email contains "alice@"

#### Scenario: Clear search
- **WHEN** an admin clears the search input
- **THEN** the full customer list is displayed

### Requirement: Customer list pagination
The system SHALL paginate the customer list with 20 items per page. Pagination controls SHALL appear below the table.

#### Scenario: Navigate to next page
- **WHEN** an admin clicks "Next" on the pagination controls
- **THEN** the next 20 customers are fetched and displayed

### Requirement: Customer detail page at /app/customers/:id
The system SHALL render a customer detail page at `/app/customers/:customerId` showing full customer information and their subscriptions.

#### Scenario: Admin views customer detail
- **WHEN** an admin clicks a row in the customer list
- **THEN** they navigate to `/app/customers/:customerId` and see the customer's info card and subscription list

### Requirement: Customer info card
The system SHALL display a card with: email, userRef, Stripe customer ID (if linked), and created date.

#### Scenario: Customer info renders
- **WHEN** the customer detail page loads
- **THEN** an info card displays all customer fields fetched from `GET /admin/customers/:id`

### Requirement: Subscription list on customer detail
The system SHALL display a list of the customer's subscriptions showing: product external ref, status (active/cancelled/past_due), current period start/end, amount + currency, payment method (brand + last4), and cancelAtPeriodEnd flag.

#### Scenario: Customer has active subscription
- **WHEN** the customer detail page loads for a customer with one active subscription
- **THEN** the subscription list shows one entry with status "Active" and period dates

#### Scenario: Customer has no subscriptions
- **WHEN** the customer has no subscriptions
- **THEN** the subscription list shows an empty state ("No subscriptions")

### Requirement: Create checkout session action
The system SHALL provide a "Create Checkout" button on the customer detail page that opens a dialog to configure and create a checkout session.

#### Scenario: Admin creates checkout session
- **WHEN** an admin clicks "Create Checkout", enters product external ref and quantity, and submits
- **THEN** `POST /admin/customers/:id/checkout-sessions` is called and the returned checkout URL is displayed for copying

### Requirement: Create portal session action
The system SHALL provide a "Billing Portal" button on the customer detail page that creates a portal session and opens the URL.

#### Scenario: Admin opens billing portal
- **WHEN** an admin clicks "Billing Portal" and enters a return URL
- **THEN** `POST /admin/customers/:id/portal-sessions` is called and the portal URL is opened in a new tab

### Requirement: Cancel subscription action
The system SHALL provide a "Cancel" action on each active subscription in the customer detail view, with options for immediate cancellation or cancel at period end.

#### Scenario: Admin cancels subscription at period end
- **WHEN** an admin clicks "Cancel" on a subscription and selects "At period end"
- **THEN** `PATCH /admin/customers/:id/subscriptions` is called with `cancelAtPeriodEnd: true` and a success toast is shown

#### Scenario: Cancel confirmation dialog
- **WHEN** an admin clicks "Cancel" on a subscription
- **THEN** a confirmation dialog appears asking whether to cancel immediately or at period end

### Requirement: Customer queries use React Query
The system SHALL implement `useCustomers`, `useCustomer` hooks in `modules/customer/queries/` using `useSuspenseQuery`.

#### Scenario: Customer list query with search
- **WHEN** `useCustomers({ search: "alice" })` is called
- **THEN** it fetches `GET /admin/customers?search=alice` and returns the paginated result

### Requirement: Breadcrumbs on customer pages
The system SHALL set breadcrumbs on customer pages: "Customers" on the list page, "Customers > {email}" on the detail page.

#### Scenario: Customer detail breadcrumb
- **WHEN** an admin views a customer detail page
- **THEN** the header breadcrumb shows "Customers > alice@example.com"
