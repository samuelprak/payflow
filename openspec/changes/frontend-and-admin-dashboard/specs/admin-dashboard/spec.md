## ADDED Requirements

### Requirement: Dashboard page at /app/dashboard
The system SHALL render a dashboard overview page at `/app/dashboard` showing key metrics and recent activity for the authenticated admin's tenant.

#### Scenario: Admin visits dashboard
- **WHEN** an authenticated admin navigates to `/app/dashboard`
- **THEN** they see stat cards, and a recent activity feed

### Requirement: Stat cards display key metrics
The system SHALL display stat cards showing: total customer count, active subscription count, estimated MRR (monthly recurring revenue), and webhook delivery success rate (last 24h).

#### Scenario: Stats load and display
- **WHEN** the dashboard page loads
- **THEN** four StatCard components render with metric values fetched from `GET /admin/dashboard/stats`

#### Scenario: Stats show loading state
- **WHEN** the stats API call is in progress
- **THEN** the stat cards show a loading skeleton

### Requirement: Recent activity feed
The system SHALL display a list of the most recent webhook delivery events (last 20) showing event type, customer email, delivery status (success/failed), and timestamp.

#### Scenario: Activity feed loads
- **WHEN** the dashboard page loads
- **THEN** a RecentActivityList component renders with data from `GET /admin/dashboard/activity`

#### Scenario: Empty activity feed
- **WHEN** there are no recent webhook events
- **THEN** the activity feed shows an empty state message ("No recent activity")

### Requirement: First-time setup checklist
The system SHALL display a setup checklist on the dashboard when the tenant's setup is incomplete. The checklist SHALL show: "Connect Stripe account" (links to `/app/settings/stripe`), "Set webhook URL" (links to `/app/settings/general`), "Copy your API key" (links to `/app/settings/api-keys`).

#### Scenario: New tenant sees setup checklist
- **WHEN** an admin with no Stripe account connected visits the dashboard
- **THEN** a setup checklist is displayed above the stats area with actionable links

#### Scenario: Completed setup hides checklist
- **WHEN** the tenant has a Stripe account connected, webhook URL set, and API key exists
- **THEN** the setup checklist is not displayed

### Requirement: Dashboard queries use React Query
The system SHALL implement `useDashboardStats` and `useRecentActivity` hooks in `modules/dashboard/queries/` using `useSuspenseQuery` with appropriate query keys.

#### Scenario: Stats query caches data
- **WHEN** the admin navigates away from and back to the dashboard
- **THEN** cached stats are shown immediately while a background refetch occurs
