# Payflow Frontend Specification

## 1. Codebase Overview

### 1.1 Payflow Backend Summary

Payflow is a payment middleware sitting between Stripe and product teams. It lives in a monorepo at `packages/backend` (NestJS, TypeORM, PostgreSQL, Redis, BullMQ).

**Entities & Relationships:**

| Entity | Purpose |
|--------|---------|
| **Tenant** | Multi-tenancy root. Has `name`, `apiKey` (auth), `webhookUrl`. Owns customers and links to Stripe accounts (M2M). |
| **Customer** | End-user within a tenant. Has `email`, `userRef` (external ID). Unique on `(userRef, tenantId)`. |
| **StripeAccount** | Holds Stripe keys (`publishableKey`, `secretKey`, `webhookSecret`). Shared across tenants via join table. |
| **StripeCustomer** | 1:1 link between Customer and Stripe's `customer_id`. |
| **CheckoutSession** | Short-lived record storing checkout config (products, success/cancel URLs). Expires in 24h. |
| **PortalSession** | Short-lived record for Stripe billing portal access. Expires in 24h. |
| **StripeWebhookEvent** | Deduplication table. Unique on `(stripeEventId, stripeAccountId)`. |

**API Endpoints (11 total):**

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| `POST` | `/customers/sync` | API key | Create/sync customer + Stripe + fetch subscriptions |
| `POST` | `/customers/:id/checkout-sessions` | API key + CASL | Create checkout session, return URL |
| `POST` | `/customers/:id/portal-sessions` | API key + CASL | Create portal session, return URL |
| `POST` | `/subscriptions/upgrade` | API key | Upgrade subscription (new price IDs) |
| `PATCH` | `/subscriptions` | API key | Toggle `cancelAtPeriodEnd` |
| `GET` | `/checkout/:id` | None | Redirect to Stripe Checkout |
| `GET` | `/checkout/:id/success` | None | Redirect to tenant's success URL |
| `GET` | `/checkout/:id/cancel` | None | Redirect to tenant's cancel URL |
| `GET` | `/portal/:id` | None | Redirect to Stripe Billing Portal |
| `GET` | `/portal/:id/return` | None | Redirect back from portal |
| `POST` | `/stripe-accounts/:id/webhook` | Stripe signature | Handle all Stripe webhook events |
| `GET` | `/health` | None | DB health check |

**Webhook Events Handled:**
- `invoice.paid` — emits customer update with receipt URL
- 18 customer/subscription lifecycle events — emits generic customer update
- `radar.early_fraud_warning.*` — auto-refunds charge, cancels all subscriptions, emits fraud event

**Outbound Webhooks:** All events are queued via BullMQ (concurrency 100, 20 retries with exponential backoff) and POSTed to the tenant's `webhookUrl` as one of three event types: `customer.updated`, `invoice.paid`, `early_fraud_warning`.

**Authentication:** API key via `x-api-key` header → `TenantGuard` resolves tenant. CASL enforces tenant-scoped access on checkout/portal creation.

**Key Observation:** There is no user/admin authentication — only machine-to-machine API key auth. The admin dashboard will need its own auth layer (see Section 4).

---

### 1.2 Boardbot Frontend Patterns Summary

Boardbot's frontend lives at `packages/frontend` in an identical monorepo structure. It is the reference implementation for Lyro Lab frontend conventions.

**Tech Stack:**
| Concern | Choice |
|---------|--------|
| Framework | React 19 + TypeScript 5 |
| Build | Vite 6 |
| Routing | TanStack Router (file-based, `src/app/`) |
| Server state | TanStack React Query v5 (`useSuspenseQuery`, `useMutation`) |
| Client state | Zustand v5 (with `persist` middleware for localStorage) |
| UI components | MUI v7 (Material UI) + `sx` prop styling |
| Styling | Emotion (via MUI), custom theme with dark mode |
| Forms | React Hook Form v7 + Zod v4 + `@hookform/resolvers` |
| Auth | OIDC via `react-oidc-context` + `oidc-client-ts` (Keycloak) |
| API client | Auto-generated via OpenAPI Generator (`typescript-axios`) |
| Toasts | Sonner |
| Testing | Vitest + Testing Library + MSW |
| Fonts | Geist Variable |

**Project Structure Convention:**
```
packages/frontend/
├── src/
│   ├── app/                      # TanStack Router file-based routes
│   │   ├── __root.tsx            # Root layout (Toaster)
│   │   ├── index.tsx             # Landing page → modules/landing
│   │   └── app/                  # Protected routes (auth-gated)
│   │       └── app.tsx           # App shell (QueryClient, Sidebar, Breadcrumbs)
│   ├── modules/                  # Feature modules
│   │   ├── auth/                 # Auth provider, guards, OIDC config
│   │   │   ├── components/       # AuthProvider, RequireAuth, LoginButton
│   │   │   └── config/           # userManager (OIDC setup)
│   │   ├── landing/              # Marketing page
│   │   │   ├── components/       # HeroSection, FeaturesSection, etc.
│   │   │   ├── entrypoints/      # LandingPage (composes sections)
│   │   │   └── theme/            # Landing-specific palette
│   │   ├── core/                 # Cross-cutting: API config, shared queries
│   │   │   ├── components/       # PageHeader, etc.
│   │   │   └── queries/          # clientConfiguration.ts
│   │   └── [feature]/            # Feature modules
│   │       ├── components/       # Feature-specific UI
│   │       ├── entrypoints/      # Page containers
│   │       ├── queries/          # React Query hooks
│   │       ├── store/            # Zustand stores
│   │       └── types/            # TypeScript types
│   ├── components/               # Shared UI components
│   │   ├── ui/                   # DataTable, Sidebar, QuerySuspenseBoundary
│   │   └── app-sidebar.tsx       # Navigation sidebar
│   ├── clients/                  # Generated API client (gitignored)
│   ├── theme.ts                  # MUI theme
│   ├── main.tsx                  # Entry point (providers)
│   └── router.tsx                # Router config
├── test/
│   ├── setup.ts                  # Vitest global setup
│   └── helpers/                  # Wrapper, MSW setup
├── openapitools.json             # OpenAPI Generator config
├── vite.config.ts
└── vitest.config.mts
```

**Key Patterns:**
1. **Provider nesting:** `ThemeProvider → CssBaseline → AuthProvider → RouterProvider` (in `main.tsx`). `QueryClientProvider → RequireAuth → BreadcrumbProvider → SidebarProvider` (in `app.tsx` layout route).
2. **API calls:** Generated client + shared `Configuration` object that injects Bearer token from OIDC `userManager`. All queries go through React Query hooks in `modules/[feature]/queries/`.
3. **Error handling:** QueryClient's `queryCache.onError` catches 401s → redirect to login. Other errors → Sonner toast. `QuerySuspenseBoundary` wraps async views.
4. **Forms:** Zod schema → `zodResolver` → `useForm` → MUI `Controller` components. Mutations on submit.
5. **Landing page:** Separate light theme (`landingTheme.ts`), section-based composition (Hero → Problem → HowItWorks → Features → Benefits → CTA → Footer), animated sections with `useInView`.
6. **Runtime config:** `window.__CONFIG__` from `/config.js` (for deployment overrides), falling back to `import.meta.env.*`.

---

## 2. Frontend Tech Stack & Conventions

Payflow's frontend will use the exact same stack as Boardbot. The only differences are driven by Payflow's domain (payment middleware for developers, not a consumer app).

| Concern | Package | Version | Notes |
|---------|---------|---------|-------|
| Framework | `react` | ^19 | |
| Build | `vite` | ^6 | + `vite-tsconfig-paths`, `@vitejs/plugin-react` |
| Routing | `@tanstack/react-router` | ~1.114 | File-based in `src/app/` |
| Server state | `@tanstack/react-query` | ^5 | `useSuspenseQuery` for data loading |
| Client state | `zustand` | ^5 | `persist` middleware where needed |
| Tables | `@tanstack/react-table` | ^8 | Headless, wrapped with MUI |
| UI library | `@mui/material` | ^7 | + `@mui/icons-material`, `@mui/lab` |
| Styling | `@emotion/react`, `@emotion/styled` | ^11 | Via MUI `sx` prop |
| Forms | `react-hook-form` + `zod` + `@hookform/resolvers` | v7 / v4 / v5 | |
| Auth | `react-oidc-context` + `oidc-client-ts` | ^3 | Keycloak OIDC |
| API client | `@openapitools/openapi-generator-cli` | ^2.18 | `typescript-axios` generator |
| Toasts | `sonner` | ^2 | |
| Charts | `recharts` | ^2 | **New** — for dashboard analytics |
| Date utils | `date-fns` | ^4 | |
| Fonts | `@fontsource-variable/geist` | | |
| Testing | `vitest` + `@testing-library/react` + `msw` | | |

**One addition:** `recharts` for subscription/revenue charts in the dashboard. It's MIT-licensed, React-native, and uses the same SVG approach as MUI. No other deviations from Boardbot's stack.

**Auth decision:** Payflow currently has only API key auth (machine-to-machine). The admin dashboard needs human auth. Following Boardbot, we use Keycloak OIDC. A new `AdminUser` entity and OIDC integration will be needed on the backend (see Section 4.3).

---

## 3. Landing Page Specification

### 3.1 Pages

The landing page is a single-page marketing site at `/`, following Boardbot's section-composition pattern from `modules/landing/`.

**Structure:**
```
modules/landing/
├── components/
│   ├── Navbar.tsx              # Fixed top nav: logo, nav links, "Get Started" CTA
│   ├── HeroSection.tsx         # Headline + value prop + code snippet preview
│   ├── ProblemSection.tsx      # Pain points of DIY payment integration
│   ├── HowItWorksSection.tsx   # 3-step flow: Connect → Configure → Collect
│   ├── FeaturesSection.tsx     # Feature grid (API, webhooks, portal, fraud)
│   ├── CodeExampleSection.tsx  # Interactive code samples (curl/JS/Python)
│   ├── PricingSection.tsx      # Simple pricing (free tier + paid, if applicable)
│   ├── CtaSection.tsx          # Final call-to-action
│   ├── Footer.tsx              # Links, copyright
│   ├── AnimatedSection.tsx     # Scroll-triggered fade-in (reuse Boardbot's)
│   └── GradientText.tsx        # Styled gradient text (reuse Boardbot's)
├── entrypoints/
│   └── LandingPage.tsx         # Composes all sections
├── theme/
│   └── landingTheme.ts         # Light palette (cream/blue tones, developer-friendly)
└── hooks/
    └── useInView.ts            # Intersection Observer (reuse Boardbot's)
```

**Section Details:**

| Section | Content | Boardbot Reference |
|---------|---------|-------------------|
| **Navbar** | Logo, "Features", "How It Works", "Docs" links, "Sign In" / "Get Started" buttons | Same pattern as Boardbot `Navbar.tsx`. Uses `LoginButton` for auth actions. |
| **Hero** | Headline: "Payments without the plumbing." Subtext: one-liner value prop. CTA: "Get Started" + "View Docs". Below: animated mock of a `curl` request → subscription response. | Same as Boardbot `HeroSection.tsx`: centered layout, `AnimatedSection` delays, `BlobShape` backgrounds, `GradientText`. |
| **Problem** | 3 cards: "Stripe is powerful but complex", "Webhook handling is error-prone", "Every product reinvents the wheel" | Same card layout as Boardbot `ProblemSection.tsx`. |
| **How It Works** | 3 steps: (1) Connect your Stripe account, (2) Create a tenant + API key, (3) Call the API — subscriptions just work. | Same numbered-steps pattern as Boardbot `HowItWorksSection.tsx`. |
| **Features** | Grid of 6 features: Simple REST API, Webhook forwarding, Checkout sessions, Billing portal, Fraud protection, Multi-tenant. Each with icon + description. | Same as Boardbot `FeaturesSection.tsx` grid layout. |
| **Code Example** | Tabbed code block showing `curl`, JavaScript, and Python examples for the `/customers/sync` and `/checkout-sessions` endpoints. | **New section** — Payflow is developer-focused, so code examples replace Boardbot's `BenefitsSection`. |
| **CTA** | "Start integrating in 5 minutes" + "Get Started" button + "View API Docs" link. | Same as Boardbot `CtaSection.tsx`. |
| **Footer** | Logo, links (GitHub, Docs, API Reference), copyright. | Same as Boardbot `Footer.tsx`. |

**Landing Theme:**
Following Boardbot's pattern of a separate `landingTheme.ts` with a light palette:

```typescript
export const landing = {
  text: { primary: "#0f172a", secondary: "#475569", light: "#e2e8f0" },
  bg: { cream: "#fafaf9", coolWhite: "#f1f5f9", card: "#ffffff", navy: "#0f172a" },
  accent: { blue: "#3b82f6", blueHover: "#2563eb", green: "#10b981", indigo: "#6366f1" },
  gradient: {
    primary: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
    code: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
  },
} as const
```

Blue/indigo tones convey "developer tool / trust / payments" vs. Boardbot's coral/teal consumer palette.

### 3.2 User Flows

**Flow 1: Developer Discovers Payflow**
1. Lands on `/` → sees Hero with value prop and code snippet
2. Scrolls through Problem → How It Works → Features → Code Examples
3. Clicks "Get Started" → redirected to Keycloak registration → lands on `/app/dashboard`

**Flow 2: Developer Explores Documentation**
1. Clicks "View Docs" or "API Reference" in navbar or CTA
2. Redirected to external docs site (Swagger at `/api` or a dedicated docs page)

**Flow 3: Existing User Signs In**
1. Clicks "Sign In" in navbar → Keycloak login → `/app/dashboard`

---

## 4. Admin Dashboard Specification

### 4.1 Pages & Views

The dashboard lives under `/app/*` (auth-gated), following Boardbot's app shell pattern: sidebar + header with breadcrumbs + content area.

```
src/app/
├── __root.tsx                          # Root layout (Toaster)
├── index.tsx                           # Landing page
└── app/
    ├── app.tsx                         # App shell (RequireAuth, QueryClient, Sidebar)
    ├── dashboard.tsx                   # Overview / home
    ├── customers.tsx                   # Customer list
    ├── customers_.$customerId.tsx      # Customer detail
    ├── settings.tsx                    # Settings layout
    └── settings/
        ├── general.tsx                 # Tenant name, webhook URL
        ├── api-keys.tsx               # API key management
        ├── stripe.tsx                  # Stripe account connection
        └── webhooks.tsx               # Webhook log viewer
```

**Feature Modules:**
```
modules/
├── auth/                              # Same pattern as Boardbot
│   ├── components/                    # AuthProvider, RequireAuth, LoginButton, UserMenu
│   └── config/                        # userManager.ts (OIDC)
├── core/
│   ├── components/                    # PageHeader
│   └── queries/                       # clientConfiguration.ts
├── landing/                           # (Section 3)
├── dashboard/
│   ├── components/
│   │   ├── StatCard.tsx               # Metric card (number + trend)
│   │   ├── SubscriptionChart.tsx      # Active subscriptions over time
│   │   ├── RevenueChart.tsx           # MRR chart
│   │   └── RecentActivityList.tsx     # Latest webhook events
│   ├── entrypoints/
│   │   └── DashboardPage.tsx
│   └── queries/
│       └── dashboardStats.ts          # useStats, useRecentActivity
├── customer/
│   ├── components/
│   │   ├── CustomerTable.tsx          # Paginated DataTable of customers
│   │   ├── CustomerDetail.tsx         # Full customer view
│   │   ├── SubscriptionList.tsx       # Customer's subscriptions
│   │   └── CustomerActions.tsx        # Sync, create checkout, cancel sub
│   ├── entrypoints/
│   │   ├── CustomersPage.tsx
│   │   └── CustomerDetailPage.tsx
│   ├── queries/
│   │   ├── customers.ts              # useCustomers, useCustomer
│   │   └── subscriptions.ts          # useSubscriptions
│   └── types/
│       └── customer.ts
└── settings/
    ├── components/
    │   ├── GeneralSettingsForm.tsx     # Edit tenant name, webhook URL
    │   ├── ApiKeyCard.tsx             # Show/regenerate API key
    │   ├── StripeConnectionForm.tsx   # Connect Stripe account
    │   └── WebhookLogTable.tsx        # Recent webhook deliveries
    ├── entrypoints/
    │   ├── GeneralSettingsPage.tsx
    │   ├── ApiKeysPage.tsx
    │   ├── StripeSettingsPage.tsx
    │   └── WebhooksPage.tsx
    └── queries/
        ├── tenant.ts                  # useTenant, useUpdateTenant
        ├── apiKeys.ts                 # useApiKey, useRegenerateApiKey
        ├── stripe.ts                  # useStripeAccount, useConnectStripe
        └── webhookLogs.ts             # useWebhookLogs
```

**Page Descriptions:**

| Page | Route | Description |
|------|-------|-------------|
| **Dashboard** | `/app/dashboard` | Overview with stat cards (total customers, active subscriptions, MRR, webhook success rate). Line charts for subscriptions and revenue over time. Recent activity feed showing latest webhook events. |
| **Customers** | `/app/customers` | Paginated DataTable listing all customers for this tenant. Columns: email, userRef, subscription status, created date. Search by email/userRef. Click row → detail view. |
| **Customer Detail** | `/app/customers/:id` | Full customer profile: info card (email, userRef, Stripe customer ID), subscription list with status/dates/amounts, action buttons (create checkout, create portal, cancel subscription). |
| **General Settings** | `/app/settings/general` | Edit tenant name and webhook URL. Form with Zod validation. |
| **API Keys** | `/app/settings/api-keys` | Display current API key (masked, click to reveal). Regenerate button with confirmation dialog. Shows usage instructions. |
| **Stripe Connection** | `/app/settings/stripe` | Connect Stripe account by entering keys (publishable, secret, webhook secret). Status indicator showing connection health. |
| **Webhook Logs** | `/app/settings/webhooks` | DataTable of recent webhook delivery attempts. Columns: event type, status (success/failed), timestamp, response code. Click to expand payload. |

**Sidebar Navigation:**
Following Boardbot's `AppSidebar` pattern:

```
[Payflow Logo]
──────────────
Dashboard        (BarChart icon)
Customers        (People icon)
──────────────
Settings
  General        (Settings icon)
  API Keys       (Key icon)
  Stripe         (CreditCard icon)
  Webhooks       (Webhook icon)
──────────────
[User Menu]      (Avatar + logout)
```

### 4.2 User Flows

**Flow 1: First-Time Setup**
1. Admin registers via Keycloak → lands on `/app/dashboard` (empty state)
2. Dashboard shows setup checklist: "Connect Stripe" → "Set webhook URL" → "Use your API key"
3. Clicks "Connect Stripe" → navigates to `/app/settings/stripe`
4. Enters Stripe keys → saves → success toast
5. Navigates to General Settings → enters webhook URL → saves
6. Navigates to API Keys → copies API key → starts integrating

**Flow 2: Monitor Customers**
1. Admin visits `/app/customers` → sees paginated customer list
2. Searches for customer by email
3. Clicks row → `/app/customers/:id` detail view
4. Sees subscription status, payment method, period dates
5. Clicks "Create Checkout" → dialog with product selection → creates session → copies URL

**Flow 3: Investigate Webhook Issue**
1. Admin notices integration error in their system
2. Visits `/app/settings/webhooks` → sees recent deliveries
3. Filters by failed status
4. Clicks on failed event → sees payload, response code, error message
5. Fixes their endpoint → retriggers webhook (future feature)

**Flow 4: Handle Fraud Alert**
1. Admin visits dashboard → sees "Early Fraud Warning" in recent activity
2. Clicks through to customer detail
3. Sees fraud event details: charge refunded, subscriptions cancelled
4. Reviews situation, no further action needed (Payflow already handled it)

### 4.3 Data Requirements (API Mapping)

The current backend API is designed for machine-to-machine use (API key auth). The admin dashboard needs human-authenticated endpoints. This requires **new backend endpoints**.

**New API Endpoints Needed:**

| Method | Route | Purpose | Dashboard Page |
|--------|-------|---------|----------------|
| `GET` | `/admin/dashboard/stats` | Aggregate stats (customer count, active subs, MRR, webhook success rate) | Dashboard |
| `GET` | `/admin/dashboard/activity` | Recent webhook events with delivery status | Dashboard |
| `GET` | `/admin/customers` | Paginated customer list with search/filter | Customers |
| `GET` | `/admin/customers/:id` | Customer detail with subscriptions | Customer Detail |
| `POST` | `/admin/customers/:id/checkout-sessions` | Create checkout (same logic, admin auth) | Customer Detail |
| `POST` | `/admin/customers/:id/portal-sessions` | Create portal (same logic, admin auth) | Customer Detail |
| `PATCH` | `/admin/customers/:id/subscriptions` | Cancel subscription | Customer Detail |
| `GET` | `/admin/tenant` | Current tenant info | Settings |
| `PATCH` | `/admin/tenant` | Update tenant name, webhook URL | Settings - General |
| `GET` | `/admin/tenant/api-key` | Get current API key (masked) | Settings - API Keys |
| `POST` | `/admin/tenant/api-key/regenerate` | Regenerate API key | Settings - API Keys |
| `GET` | `/admin/stripe-account` | Stripe connection status | Settings - Stripe |
| `PUT` | `/admin/stripe-account` | Connect/update Stripe account | Settings - Stripe |
| `GET` | `/admin/webhook-logs` | Paginated webhook delivery log | Settings - Webhooks |

**New Backend Requirements:**
1. **Admin auth module** — OIDC token validation (Keycloak). New `AdminGuard` that validates Bearer token and resolves admin → tenant.
2. **AdminUser entity** — Links OIDC subject to a Tenant. Fields: `id`, `oidcSubject`, `email`, `tenantId`, `role`.
3. **Dashboard stats service** — Aggregates from existing data (COUNT customers, active subscriptions via Stripe API or cached, webhook event counts from Bull/Redis).
4. **Webhook log persistence** — Currently, webhook delivery results are not stored. The `WebhookProcessor` needs to log delivery attempts (status, response code, timestamp) to a new `WebhookDeliveryLog` entity.

**Existing Endpoints That Can Be Reused (via admin auth wrapper):**
- Customer sync → same `CustomerService.syncCustomer()`
- Checkout/portal creation → same services, different guard
- Subscription cancel → same `SubscriptionService`

**Generated API Client:**
Following Boardbot's pattern, the frontend will auto-generate a TypeScript-Axios client from Payflow's OpenAPI spec:

```json
// openapitools.json
{
  "generator-cli": {
    "generators": {
      "backend": {
        "generatorName": "typescript-axios",
        "inputSpec": "../backend/openapi.json",
        "output": "./src/clients/backend-client"
      }
    }
  }
}
```

---

## 5. Proposed New Features

### Must-Have (required for dashboard launch)

| # | Feature | Description | Why | Complexity |
|---|---------|-------------|-----|------------|
| 1 | **Admin Authentication** | OIDC-based admin login via Keycloak. New `AdminUser` entity linking OIDC subject → Tenant. `AdminGuard` for dashboard API routes. | The dashboard has no way to authenticate humans today. Everything is API-key-based. | **High** |
| 2 | **Admin API Layer** | New `/admin/*` endpoints wrapping existing services with admin auth. Read-only access to customers, subscriptions, tenant settings. | The existing API is designed for machine integrations, not human browsing. The dashboard needs list/detail/search endpoints. | **Medium** |
| 3 | **Webhook Delivery Logs** | Persist webhook delivery attempts (event type, status code, response body, timestamp) to a `WebhookDeliveryLog` entity. Surface in dashboard. | Tenant admins have zero visibility into whether webhooks are reaching their systems. This is the #1 debugging pain point. | **Medium** |
| 4 | **API Key Management** | Endpoints to view (masked) and regenerate tenant API keys. Regeneration invalidates the old key immediately. | Admins need to rotate keys without DB access. Currently keys are set only via seed script. | **Low** |
| 5 | **Dashboard Statistics** | Aggregate endpoint returning customer count, active subscription count, estimated MRR, and webhook success rate for the tenant. | Admins need a quick health check of their Payflow integration without querying Stripe directly. | **Medium** |

### Nice-to-Have (high value, build after launch)

| # | Feature | Description | Why | Complexity |
|---|---------|-------------|-----|------------|
| 6 | **Webhook Retry (Manual)** | "Retry" button on failed webhook deliveries in the dashboard. Re-queues the job in BullMQ. | When a tenant fixes their endpoint, they shouldn't have to wait for the next event to verify it works. | **Low** |
| 7 | **Subscription Metrics Over Time** | Store daily snapshots of subscription counts and MRR per tenant. Power time-series charts on the dashboard. | The dashboard currently can only show point-in-time stats. Trends require historical data. | **Medium** |
| 8 | **Tenant Self-Service Registration** | New tenant creation flow in the dashboard: register → create tenant → connect Stripe → get API key. Fully self-service. | Currently, tenants are created via seed script or direct DB manipulation. This blocks adoption. | **Medium** |
| 9 | **Sandbox / Test Mode** | Per-tenant toggle between Stripe test keys and live keys. Visual indicator in dashboard. Separate webhook logs per mode. | Developers need a safe way to test their integration without processing real payments. | **Medium** |
| 10 | **Customer Search & Filtering** | Full-text search on customer email/userRef, filter by subscription status (active, cancelled, none), sort by created date. | With hundreds of customers, scrolling a flat list becomes unusable. | **Low** |

### Future (valuable but not urgent)

| # | Feature | Description | Why | Complexity |
|---|---------|-------------|-----|------------|
| 11 | **Multi-User Tenant Access** | Multiple admin users per tenant with roles (owner, viewer). Invite flow via email. | Teams need shared access. Currently one implicit admin per tenant. | **High** |
| 12 | **Audit Log** | Record all admin actions (key regeneration, Stripe config changes, subscription cancellations) with actor, timestamp, and diff. | Compliance and debugging. "Who changed the webhook URL last Tuesday?" | **Medium** |
| 13 | **Usage-Based Billing Support** | Extend the subscription model to support metered/usage-based billing via Stripe Usage Records. | Some products charge by usage (API calls, storage) rather than flat subscriptions. | **High** |
| 14 | **SDK Generation** | Auto-generate client SDKs (TypeScript, Python, Go) from the OpenAPI spec. Publish to npm/PyPI. | Reduces integration friction for tenants. Currently they must hand-write HTTP calls. | **Medium** |
| 15 | **Notifications & Alerts** | Email/Slack notifications for: fraud warnings, repeated webhook failures, subscription churn spikes. | Admins shouldn't need to check the dashboard to learn about critical events. | **Medium** |
| 16 | **Coupon / Promotion Support** | API endpoints to create and apply Stripe coupons/promotion codes to customers. | Common billing feature request. Currently requires direct Stripe dashboard access. | **Low** |

---

## 6. Codebase Improvement Suggestions

### Security

| Issue | Severity | Recommendation |
|-------|----------|----------------|
| **Stripe keys stored in plain-text DB columns** | High | Encrypt at rest using a KMS or at minimum AES-256 column-level encryption. The `StripeAccount` entity stores `stripeSecretKey` and `stripeWebhookSecret` as plain strings. |
| **No rate limiting** | Medium | Add `@nestjs/throttler` to API key-authenticated endpoints. A compromised API key can currently hammer the API unlimited. |
| **STRIPE_SKIP_SIGNATURE_VERIFICATION flag** | Low | Add a startup warning log if this is enabled. Consider removing it entirely and using Stripe CLI's `stripe listen --forward-to` for local dev instead. |

### Error Handling & Resilience

| Issue | Recommendation |
|-------|----------------|
| **Webhook delivery failures are silent** | The `WebhookProcessor` catches errors but doesn't persist them. Add a `WebhookDeliveryLog` entity (also needed for Feature #3). |
| **Partial subscription cancellation in fraud handler** | `handleEarlyFraudWarning` logs but accepts partial failures when cancelling subscriptions. Consider emitting a separate alert event when cancellations fail. |
| **No dead-letter queue for webhooks** | After 20 retries, failed webhook jobs are silently dropped. Add a BullMQ dead-letter queue and surface stuck jobs in the dashboard. |

### Architecture

| Issue | Recommendation |
|-------|----------------|
| **No pagination on subscription list** | `getSubscriptions` returns all subscriptions for a customer. Add Stripe API pagination params. Low risk today (1 sub per user per product), but will break with scale. |
| **Tenant → StripeAccount is M2M but only 1:1 is used** | The join table supports many-to-many, but the code assumes one Stripe account per tenant. Either enforce this with a unique constraint or document the intended multi-account use case. |
| **No customer deletion** | No soft-delete or hard-delete for customers. Consider adding soft-delete (with Stripe customer archival) for GDPR data deletion requests. |
| **CheckoutSession/PortalSession cleanup** | Expired sessions (24h TTL) are never cleaned up. Add a scheduled job to purge expired sessions. |

### Testing

| Issue | Recommendation |
|-------|----------------|
| **No E2E tests for webhook flow** | The most critical path (Stripe webhook → internal processing → tenant webhook delivery) has no end-to-end test. Add an E2E test that sends a mock Stripe event and verifies the full chain. |
| **No tests for fraud warning handler** | `EarlyFraudWarningWebhookHandler` has complex branching logic (actionable check, guest checkout skip, refund already-done). This needs dedicated unit tests. |
| **Missing service tests** | Several services (CheckoutSessionService, PortalSessionService) lack unit tests. |

### Developer Experience

| Issue | Recommendation |
|-------|----------------|
| **Seed script requires manual env vars** | `db:seed` needs 4 Stripe-specific env vars set manually. Provide a `.env.seed.example` or make the seed script work with mock data when Stripe keys are absent. |
| **No OpenAPI spec export script** | Boardbot has `generate-openapi` in its backend. Payflow needs the same to enable frontend client generation. Add `npm run generate-openapi` that boots the app and writes `openapi.json`. |
| **No Swagger auth in dev** | The Swagger UI at `/api` doesn't have an API key input configured. Add `addApiKey` security scheme to the Swagger config so developers can test endpoints from the UI. |

---

## 7. Open Questions

1. **Auth provider:** Should Payflow use the same Keycloak instance as Boardbot, or a separate realm? A shared instance simplifies ops; a separate realm keeps auth boundaries clean. **Recommendation:** Same Keycloak instance, new `payflow` realm.

2. **Tenant onboarding:** Should the first admin user automatically create a Tenant, or should tenant creation be a separate step? **Recommendation:** Auto-create a Tenant on first login (zero-friction onboarding).

3. **Multi-admin access:** Do we need multiple admin users per tenant at launch, or is single-admin sufficient for v1? **Recommendation:** Single admin for v1. Multi-user is Feature #11 (Future).

4. **External documentation:** Where should API docs live — inline Swagger at `/api`, a separate docs site (e.g., Mintlify/Docusaurus), or both? **Recommendation:** Swagger at `/api` for now. Dedicated docs site when SDK generation (Feature #14) lands.

5. **Dashboard stats — real-time vs. cached:** Should dashboard stats query Stripe on every load, or cache metrics periodically? Stripe API rate limits are 25 read/s in test, 100/s in live. **Recommendation:** Cache daily snapshots in the DB. Show "as of [timestamp]" on the dashboard.

6. **Stripe account connection UX:** Should admins paste keys manually, or use Stripe Connect OAuth? OAuth is more secure but adds complexity. **Recommendation:** Manual key entry for v1 (matches current model). Stripe Connect OAuth as a future upgrade.

7. **Frontend deployment:** Should the frontend be served by the NestJS backend (SPA served from `/`), or deployed as a separate static site? **Recommendation:** Separate static site (same as Boardbot). Vite builds to `dist/`, served by nginx/CDN. Backend is API-only.
