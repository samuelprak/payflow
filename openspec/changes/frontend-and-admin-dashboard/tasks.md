## 1. Backend: OpenAPI Spec Export

- [ ] 1.1 Add `generate-openapi` script to `packages/backend/package.json` that boots NestJS, extracts the OpenAPI document, writes `openapi.json`, and exits
- [ ] 1.2 Run the script and verify `openapi.json` is generated with all existing endpoints, DTOs, and the `x-api-key` security scheme
- [ ] 1.3 Add `generate-api-clients` script to root `package.json` that runs backend OpenAPI generation then frontend client generation

## 2. Backend: WebhookDeliveryLog Entity & Migration

- [ ] 2.1 Create `WebhookDeliveryLog` entity in `src/customer/entities/` with fields: id, tenantId, customerId (nullable), eventType, payload (JSONB), statusCode (nullable), responseBody (nullable, 2000 char), success, attemptNumber, createdAt
- [ ] 2.2 Add index on `(tenantId, createdAt)` to the entity
- [ ] 2.3 Run `npm run db:generate` to create the migration, review it, and run `npm run db:migrate`
- [ ] 2.4 Create `WebhookDeliveryLogRepository` with methods: `create`, `findByTenant` (paginated, ordered by createdAt desc), `findByTenantFiltered` (success filter), `getSuccessRate` (count success/total since timestamp)
- [ ] 2.5 Modify `WebhookProcessor.process()` to persist a `WebhookDeliveryLog` after each delivery attempt (success and failure), capturing statusCode, responseBody (truncated), attemptNumber
- [ ] 2.6 Add a scheduled `@Cron` job to delete WebhookDeliveryLog records older than 30 days
- [ ] 2.7 Write repository tests for `WebhookDeliveryLogRepository` (create, paginated find, success rate)
- [ ] 2.8 Write unit test for `WebhookProcessor` verifying delivery log persistence on success and failure

## 3. Backend: Admin Authentication

- [ ] 3.1 Create `AdminUser` entity in `src/admin/entities/` with fields: id (UUID), oidcSubject (unique), email, tenantId (FK → Tenant), createdAt, updatedAt. Add ManyToOne relation to Tenant
- [ ] 3.2 Run `npm run db:generate` and `npm run db:migrate` for the AdminUser table
- [ ] 3.3 Create `AdminUserRepository` with methods: `findByOidcSubject`, `createWithTenant` (creates AdminUser + Tenant in a transaction)
- [ ] 3.4 Create `AdminGuard` that extracts Bearer token, validates JWT against Keycloak JWKS endpoint, resolves AdminUser by oidcSubject, attaches adminUser and tenant to request. Throws 401 if invalid
- [ ] 3.5 Create `POST /admin/auth/register` endpoint (protected by raw OIDC validation, not AdminGuard) that finds-or-creates AdminUser + Tenant from the token's subject and email claims
- [ ] 3.6 Create `AdminAuthModule` exporting AdminGuard, AdminUserRepository, and the register controller
- [ ] 3.7 Extend `CustomRequest` interface with `adminUser: AdminUser` and `tenant: Tenant` for admin routes
- [ ] 3.8 Write unit tests for AdminGuard (valid token, invalid token, missing AdminUser)
- [ ] 3.9 Write E2E test for `POST /admin/auth/register` (first-time registration, idempotent re-registration)

## 4. Backend: Admin API Endpoints

- [ ] 4.1 Create `AdminDashboardController` with `GET /admin/dashboard/stats` (customer count, active subscription count, MRR, webhook success rate cached in Redis for 5 min) and `GET /admin/dashboard/activity` (last 20 WebhookDeliveryLogs)
- [ ] 4.2 Create `AdminDashboardService` with methods: `getStats(tenantId)` (with Redis caching), `getRecentActivity(tenantId)`
- [ ] 4.3 Create `AdminCustomerController` with `GET /admin/customers` (paginated, search by email/userRef), `GET /admin/customers/:id` (detail with subscriptions), `POST /admin/customers/:id/checkout-sessions`, `POST /admin/customers/:id/portal-sessions`, `PATCH /admin/customers/:id/subscriptions`
- [ ] 4.4 Create `AdminTenantController` with `GET /admin/tenant`, `PATCH /admin/tenant` (update name/webhookUrl), `GET /admin/tenant/api-key`, `POST /admin/tenant/api-key/regenerate`
- [ ] 4.5 Create `AdminStripeController` with `GET /admin/stripe-account`, `PUT /admin/stripe-account`
- [ ] 4.6 Create `AdminWebhookController` with `GET /admin/webhook-logs` (paginated, filterable by success)
- [ ] 4.7 Create request/response DTOs for all admin endpoints with class-validator decorators and Swagger annotations
- [ ] 4.8 Create `AdminModule` importing all admin controllers and required service modules, applying `AdminGuard` globally to admin routes
- [ ] 4.9 Write E2E tests for admin customer endpoints (list, detail, search, pagination, tenant isolation)
- [ ] 4.10 Write E2E tests for admin tenant endpoints (get, update, API key regeneration)
- [ ] 4.11 Write E2E tests for admin Stripe and webhook-log endpoints
- [ ] 4.12 Write unit tests for `AdminDashboardService` (stats aggregation, Redis caching, activity query)

## 5. Frontend: Project Scaffolding

- [ ] 5.1 Create `packages/frontend/` directory with `package.json` matching Boardbot's dependencies (React 19, Vite 6, TanStack Router, React Query, MUI v7, Zustand, Zod, react-hook-form, react-oidc-context, sonner, recharts, date-fns)
- [ ] 5.2 Create `tsconfig.json` with strict mode, path aliases (`@/*` → `./src/*`, `@/test/*` → `./test/*`), and matching Boardbot's config
- [ ] 5.3 Create `vite.config.ts` with TanStack Router plugin (routes in `src/app/`, generated tree at `src/routeTree.gen.ts`), React plugin, and tsconfig-paths
- [ ] 5.4 Create `vitest.config.mts` with jsdom environment and test setup file
- [ ] 5.5 Create `eslint.config.mjs` with Prettier integration and TanStack Query plugin
- [ ] 5.6 Create `index.html` with root div and config.js script tag
- [ ] 5.7 Create `.env.development` with `VITE_BACKEND_URL`, `VITE_KEYCLOAK_URL`, `VITE_KEYCLOAK_REALM=payflow`, `VITE_KEYCLOAK_CLIENT_ID=payflow-frontend`
- [ ] 5.8 Create `src/theme.ts` — MUI dark theme with Geist font, sidebar dimensions, component overrides (matching Boardbot)
- [ ] 5.9 Create `src/main.tsx` with provider hierarchy: ThemeProvider → CssBaseline → AuthProvider → RouterProvider
- [ ] 5.10 Create `src/router.tsx` with `createRouter` using generated route tree and scroll restoration
- [ ] 5.11 Create `src/app/__root.tsx` with Toaster and Outlet
- [ ] 5.12 Create `openapitools.json` pointing to `../backend/openapi.json` with `typescript-axios` generator outputting to `src/clients/backend-client/`
- [ ] 5.13 Add `src/clients/` to `.gitignore`
- [ ] 5.14 Run `npm install` from monorepo root and verify the workspace resolves
- [ ] 5.15 Run `npm run dev` and verify Vite dev server starts
- [ ] 5.16 Create `test/setup.ts` with Testing Library matchers and cleanup
- [ ] 5.17 Create `test/helpers/wrapper.tsx` with provider wrapper for tests (QueryClient, Router, Theme, Suspense)
- [ ] 5.18 Create `test/helpers/setupMsw.ts` with MSW server setup helper

## 6. Frontend: Auth Module

- [ ] 6.1 Create `src/modules/auth/config/userManager.ts` — OIDC UserManager with Keycloak payflow realm, runtime config support, session storage
- [ ] 6.2 Create `src/modules/auth/components/AuthProvider.tsx` — wraps children with OIDC AuthProvider from react-oidc-context
- [ ] 6.3 Create `src/modules/auth/components/RequireAuth.tsx` — checks auth, redirects to login if unauthenticated, renders children if authenticated
- [ ] 6.4 Create `src/modules/auth/components/LoginButton.tsx` — supports `action` prop (login/register), triggers appropriate Keycloak flow
- [ ] 6.5 Create `src/modules/auth/components/UserMenu.tsx` — avatar dropdown with email display and sign-out action
- [ ] 6.6 Create `src/modules/core/queries/clientConfiguration.ts` — OpenAPI Configuration with basePath from runtime config and accessToken from userManager

## 7. Frontend: Shared Components

- [ ] 7.1 Create `src/components/ui/QuerySuspenseBoundary.tsx` — wraps children with Suspense + ErrorBoundary (react-error-boundary), shows loading skeleton and error fallback
- [ ] 7.2 Create `src/components/ui/QueryErrorFallback.tsx` — error UI with retry button
- [ ] 7.3 Create `src/components/ui/data-table.tsx` — TanStack Table wrapper with MUI Table components, pagination, and sorting
- [ ] 7.4 Create `src/components/ui/sidebar.tsx` — sidebar layout component (SidebarProvider, SidebarTrigger, collapsible)
- [ ] 7.5 Create `src/components/ui/breadcrumb/context.tsx` — BreadcrumbProvider and useBreadcrumb hook
- [ ] 7.6 Create `src/components/app-sidebar.tsx` — Payflow navigation sidebar (Dashboard, Customers, Settings sections, UserMenu at bottom)
- [ ] 7.7 Create `src/modules/core/components/PageHeader.tsx` — page title + optional action button

## 8. Frontend: App Shell & Protected Routes

- [ ] 8.1 Create `src/app/app.tsx` — app layout route with QueryClientProvider (401 → redirect, error toast), RequireAuth, BreadcrumbProvider, SidebarProvider, sidebar + header + breadcrumbs + Outlet
- [ ] 8.2 Verify navigation between routes works with sidebar highlighting
- [ ] 8.3 Run `npm run generate-api-clients` from root and verify the TypeScript client is generated from the backend's `openapi.json`

## 9. Frontend: Landing Page

- [ ] 9.1 Create `src/modules/landing/theme/landingTheme.ts` — light palette with blue/indigo developer-tool colors
- [ ] 9.2 Create `src/modules/landing/hooks/useInView.ts` — Intersection Observer hook for scroll-triggered animations
- [ ] 9.3 Create `src/modules/landing/components/AnimatedSection.tsx` — wrapper that fades in children on viewport entry with configurable delay
- [ ] 9.4 Create `src/modules/landing/components/GradientText.tsx` — MUI Typography with gradient text effect
- [ ] 9.5 Create `src/modules/landing/components/Navbar.tsx` — fixed nav with logo, section anchor links, LoginButton (Sign In / Get Started)
- [ ] 9.6 Create `src/modules/landing/components/HeroSection.tsx` — headline, subtitle, CTA buttons, animated code snippet showing a curl request + JSON response
- [ ] 9.7 Create `src/modules/landing/components/ProblemSection.tsx` — 3 pain-point cards (Stripe complexity, webhook errors, reinvention)
- [ ] 9.8 Create `src/modules/landing/components/HowItWorksSection.tsx` — 3 numbered steps (connect, configure, collect)
- [ ] 9.9 Create `src/modules/landing/components/FeaturesSection.tsx` — 6-card grid (REST API, webhooks, checkout, portal, fraud, multi-tenant)
- [ ] 9.10 Create `src/modules/landing/components/CodeExampleSection.tsx` — tabbed code blocks (curl, JavaScript, Python) for sync + checkout endpoints
- [ ] 9.11 Create `src/modules/landing/components/CtaSection.tsx` — headline, "Get Started" button, "View API Docs" link
- [ ] 9.12 Create `src/modules/landing/components/Footer.tsx` — logo, links (GitHub, Docs), copyright
- [ ] 9.13 Create `src/modules/landing/entrypoints/LandingPage.tsx` — composes all sections in order
- [ ] 9.14 Create `src/app/index.tsx` — root route rendering LandingPage
- [ ] 9.15 Write test for LandingPage (renders hero headline, navbar links visible)

## 10. Frontend: Dashboard Module

- [ ] 10.1 Create `src/modules/dashboard/queries/dashboardStats.ts` — `useDashboardStats` (useSuspenseQuery for GET /admin/dashboard/stats), `useRecentActivity` (GET /admin/dashboard/activity)
- [ ] 10.2 Create `src/modules/dashboard/components/StatCard.tsx` — metric card with label, value, optional trend indicator
- [ ] 10.3 Create `src/modules/dashboard/components/RecentActivityList.tsx` — list of recent webhook events with event type badge, customer email, status indicator, timestamp
- [ ] 10.4 Create `src/modules/dashboard/components/SetupChecklist.tsx` — checklist showing incomplete setup steps with links to settings pages
- [ ] 10.5 Create `src/modules/dashboard/entrypoints/DashboardPage.tsx` — composes SetupChecklist (conditional), StatCards row, RecentActivityList
- [ ] 10.6 Create `src/app/app/dashboard.tsx` — route file rendering DashboardPage with breadcrumb
- [ ] 10.7 Write test for DashboardPage (stat cards render with mock data, empty activity shows message)

## 11. Frontend: Customer Module

- [ ] 11.1 Create `src/modules/customer/queries/customers.ts` — `useCustomers` (paginated, search param), `useCustomer` (by ID with subscriptions)
- [ ] 11.2 Create `src/modules/customer/components/CustomerTable.tsx` — DataTable with columns: email, userRef, subscription status badge, created date. Search input with 300ms debounce
- [ ] 11.3 Create `src/modules/customer/components/CustomerDetail.tsx` — info card (email, userRef, Stripe ID, created date)
- [ ] 11.4 Create `src/modules/customer/components/SubscriptionList.tsx` — list of subscriptions showing product ref, status, period, amount, payment method, cancelAtPeriodEnd flag
- [ ] 11.5 Create `src/modules/customer/components/CustomerActions.tsx` — "Create Checkout" button (opens dialog with product fields), "Billing Portal" button, "Cancel Subscription" action with confirmation dialog
- [ ] 11.6 Create `src/modules/customer/entrypoints/CustomersPage.tsx` — composes CustomerTable with QuerySuspenseBoundary
- [ ] 11.7 Create `src/modules/customer/entrypoints/CustomerDetailPage.tsx` — composes CustomerDetail, SubscriptionList, CustomerActions with breadcrumbs
- [ ] 11.8 Create `src/app/app/customers.tsx` — route file for customer list
- [ ] 11.9 Create `src/app/app/customers_.$customerId.tsx` — route file for customer detail
- [ ] 11.10 Write test for CustomerTable (renders rows, search filters, empty state)
- [ ] 11.11 Write test for CustomerDetailPage (info card renders, subscription list, cancel dialog)

## 12. Frontend: Settings Module

- [ ] 12.1 Create `src/modules/settings/queries/tenant.ts` — `useTenant`, `useUpdateTenant` mutation (invalidates tenant query)
- [ ] 12.2 Create `src/modules/settings/queries/apiKeys.ts` — `useApiKey`, `useRegenerateApiKey` mutation
- [ ] 12.3 Create `src/modules/settings/queries/stripe.ts` — `useStripeAccount`, `useConnectStripe` mutation
- [ ] 12.4 Create `src/modules/settings/queries/webhookLogs.ts` — `useWebhookLogs` (paginated, filterable)
- [ ] 12.5 Create `src/modules/settings/components/GeneralSettingsForm.tsx` — Zod schema for name + webhookUrl, react-hook-form with MUI Controller fields, save button with loading state
- [ ] 12.6 Create `src/modules/settings/components/ApiKeyCard.tsx` — masked key display, show/hide toggle, copy button, regenerate with confirmation dialog
- [ ] 12.7 Create `src/modules/settings/components/StripeConnectionForm.tsx` — form for publishable key, secret key, webhook secret. Zod validation (pk_ prefix). Shows connected status when already linked
- [ ] 12.8 Create `src/modules/settings/components/WebhookLogTable.tsx` — DataTable with event type, customer email, status badge, response code, timestamp. Expandable row for payload/response. Status filter dropdown
- [ ] 12.9 Create `src/modules/settings/entrypoints/GeneralSettingsPage.tsx`
- [ ] 12.10 Create `src/modules/settings/entrypoints/ApiKeysPage.tsx`
- [ ] 12.11 Create `src/modules/settings/entrypoints/StripeSettingsPage.tsx`
- [ ] 12.12 Create `src/modules/settings/entrypoints/WebhooksPage.tsx`
- [ ] 12.13 Create `src/app/app/settings.tsx` — settings layout route with left nav (General, API Keys, Stripe, Webhooks), default redirect to general
- [ ] 12.14 Create `src/app/app/settings/general.tsx`, `api-keys.tsx`, `stripe.tsx`, `webhooks.tsx` — route files for each settings page
- [ ] 12.15 Write test for GeneralSettingsForm (loads current values, validates URL, submits)
- [ ] 12.16 Write test for ApiKeyCard (masked display, reveal toggle, copy, regeneration dialog)
- [ ] 12.17 Write test for WebhookLogTable (renders rows, filters by status, expands row)

## 13. Integration & Polish

- [ ] 13.1 Run full `npm run typecheck` across frontend and fix any type errors
- [ ] 13.2 Run `npm run lint` across frontend and fix any lint issues
- [ ] 13.3 Run `npm run test` across frontend and fix any failing tests
- [ ] 13.4 Run all backend tests and fix any failures
- [ ] 13.5 Verify end-to-end flow: Keycloak login → dashboard loads → navigate to customers → navigate to settings → update tenant → view webhook logs
- [ ] 13.6 Verify landing page renders correctly with all sections and navigation links
- [ ] 13.7 Verify OpenAPI client regeneration works from root `npm run generate-api-clients`
