## Context

Payflow is a backend-only NestJS payment middleware in a monorepo (`packages/backend`). It has API-key-based machine auth, Stripe integration, and webhook forwarding. No frontend exists. Boardbot, a sister Lyro Lab project, has an established React frontend that defines our conventions: Vite, TanStack Router, React Query, MUI v7, Zustand, Keycloak OIDC.

The frontend requires two new layers:
1. A React SPA in `packages/frontend` serving a marketing landing page and admin dashboard
2. A set of admin-authenticated backend endpoints the dashboard consumes

The existing API-key-authenticated endpoints remain unchanged — the admin API is additive.

## Goals / Non-Goals

**Goals:**
- Bootstrap a frontend package matching Boardbot's stack and conventions exactly
- Deliver a marketing landing page that explains Payflow's value to developer teams
- Deliver an admin dashboard where product admins can: see their customers/subscriptions, manage Stripe connection, rotate API keys, configure webhooks, and view delivery logs
- Add OIDC admin auth to the backend (Keycloak, same as Boardbot)
- Persist webhook delivery outcomes for debugging visibility
- Enable OpenAPI client generation for type-safe frontend ↔ backend communication

**Non-Goals:**
- Replacing or modifying existing API-key-authenticated endpoints
- Multi-user tenant access or role-based permissions (single admin per tenant for v1)
- Real-time dashboard (polling or WebSocket subscriptions)
- Usage-based billing, coupons, or trial support
- SDK generation for external consumers
- Custom documentation site (Swagger at `/api` is sufficient for v1)
- Stripe Connect OAuth flow (manual key entry for v1)
- Mobile-responsive landing page beyond basic readability (desktop-first)

## Decisions

### 1. Frontend framework: Vite + React + TanStack Router

**Decision:** Mirror Boardbot's exact stack — no deviations.

**Rationale:** Consistency across Lyro Lab projects means shared knowledge, copy-paste patterns, and no context-switching overhead. TanStack Router's file-based routing in `src/app/` is already proven in Boardbot. Vite's speed and TanStack Router plugin for route generation work well.

**Alternatives considered:**
- Next.js / TanStack Start: More features (SSR, API routes), but we don't need SSR — the landing page is lightweight and the dashboard is auth-gated. Adding a framework mismatch with Boardbot isn't worth the tradeoff.
- Astro for landing page + separate React app: Unnecessary split. Boardbot handles landing + app in one Vite build.

### 2. Admin authentication: Keycloak OIDC with new realm

**Decision:** Deploy a `payflow` realm on the existing Keycloak instance (shared with Boardbot). Create a `payflow-frontend` OIDC client. Use `react-oidc-context` + `oidc-client-ts` on the frontend (identical to Boardbot). On the backend, validate OIDC JWT tokens in a new `AdminGuard`.

**Rationale:** Reusing the Keycloak instance avoids standing up a new auth service. A separate realm keeps Payflow's users isolated from Boardbot's. The frontend auth pattern is copy-paste from Boardbot's `modules/auth/`.

**Alternatives considered:**
- Auth0 / Clerk: External dependency, cost, different patterns from Boardbot.
- Custom JWT auth: Reinventing the wheel. Keycloak gives us registration, login, password reset, MFA for free.
- Extending API key auth to the dashboard: API keys are for machines, not humans. No session management, no user identity.

### 3. Backend admin API: Separate `/admin/*` route prefix

**Decision:** All dashboard-facing endpoints live under `/admin/*` with `AdminGuard` (OIDC token validation). They reuse existing services (CustomerService, SubscriptionService, etc.) but through admin-authenticated controllers.

**Rationale:** Clean separation between machine API (API key) and human API (OIDC). Existing integrations are unaffected. The admin controllers are thin wrappers over existing services — minimal code duplication.

**Alternatives considered:**
- Adding OIDC auth as an alternative on existing endpoints: Muddies the auth model. A single endpoint accepting both API keys and OIDC tokens is confusing.
- GraphQL for the dashboard: Overkill for 15 endpoints. REST with OpenAPI generation gives us type-safe clients with zero runtime overhead.

### 4. Admin ↔ Tenant linking: AdminUser entity

**Decision:** New `AdminUser` entity with fields: `id` (UUID), `oidcSubject` (string, unique), `email` (string), `tenantId` (FK → Tenant). Auto-created on first login — the `AdminGuard` resolves the OIDC token, finds or creates the AdminUser, and attaches the tenant to the request.

**Rationale:** Simple 1:1 mapping for v1. First login auto-creates both AdminUser and Tenant (zero-friction onboarding). The OIDC subject is the stable identifier across sessions.

**First-login flow:**
1. User registers in Keycloak → redirected to `/app/dashboard`
2. First API call hits `AdminGuard` → no AdminUser found for this OIDC subject
3. Guard creates AdminUser + Tenant (with generated API key) → attaches to request
4. Dashboard renders with setup checklist (connect Stripe, set webhook URL)

### 5. Webhook delivery logging: New entity + processor modification

**Decision:** New `WebhookDeliveryLog` entity: `id`, `tenantId`, `eventType`, `payload` (JSONB), `statusCode` (int, nullable), `responseBody` (text, nullable), `success` (boolean), `attemptNumber` (int), `createdAt`. The existing `WebhookProcessor` is modified to persist a log entry after each delivery attempt.

**Rationale:** Tenants need visibility into webhook delivery success/failure. This is the #1 debugging pain point. Logging at the processor level captures both successes and failures with response details.

**Retention:** Keep 30 days of logs. Add a scheduled job to clean up older records.

### 6. API client generation: OpenAPI Generator (typescript-axios)

**Decision:** Add `npm run generate-openapi` to the backend (boots NestJS, extracts OpenAPI JSON, writes to `openapi.json`). Frontend uses `@openapitools/openapi-generator-cli` with `typescript-axios` generator — identical to Boardbot's `openapitools.json` setup. Generated client lives in `src/clients/backend-client/` (gitignored).

**Rationale:** Exact Boardbot pattern. Type-safe API calls with zero manual typing. The generated `Configuration` object injects the OIDC Bearer token automatically.

### 7. Dashboard statistics: Cached aggregation, not real-time

**Decision:** A `GET /admin/dashboard/stats` endpoint that queries: `COUNT(customers)`, active subscription count (from Stripe API, cached 5 minutes in Redis), estimated MRR (sum of subscription amounts, cached), webhook success rate (from WebhookDeliveryLog, last 24h). No historical time-series for v1.

**Rationale:** Real-time Stripe queries on every dashboard load would hit rate limits. Caching in Redis with short TTL gives near-real-time with safety. Historical time-series (Feature #7 in the spec) requires a daily snapshot job — out of scope for v1.

### 8. UI framework: MUI v7 dark mode + separate landing light theme

**Decision:** Dashboard uses MUI v7 with dark mode theme (matching Boardbot). Landing page uses a separate light `landingTheme.ts` with blue/indigo developer-tool palette. Both use `sx` prop styling — no CSS files, no Tailwind.

**Rationale:** Boardbot uses this exact pattern (dark app theme, light landing theme in `modules/landing/theme/`). Developer tools conventionally use dark UI. The landing page needs a distinct, inviting light aesthetic.

### 9. State management: React Query (server) + Zustand (client)

**Decision:** All server state through React Query hooks in `modules/[feature]/queries/`. Client state (sidebar collapse, filter persistence) via Zustand stores with `persist` middleware. No Redux, no Context for data.

**Rationale:** Boardbot pattern. React Query handles caching, revalidation, and loading states. Zustand is minimal overhead for the few pieces of client-only state.

### 10. Project structure: Module-based feature organization

**Decision:**
```
src/
├── app/                    # TanStack Router file-based routes
├── modules/
│   ├── auth/               # OIDC config, AuthProvider, RequireAuth
│   ├── core/               # Shared queries (clientConfiguration), PageHeader
│   ├── landing/            # Marketing page sections + theme
│   ├── dashboard/          # Stats, activity feed
│   ├── customer/           # Customer list, detail, actions
│   └── settings/           # Tenant config, API keys, Stripe, webhooks
├── components/             # Shared UI (DataTable, Sidebar, QuerySuspenseBoundary)
├── clients/                # Generated API client (gitignored)
├── theme.ts
├── main.tsx
└── router.tsx
```

**Rationale:** Mirrors Boardbot's `modules/` structure exactly. Each module owns its components, entrypoints, queries, stores, and types.

## Risks / Trade-offs

**[First-login auto-provisioning creates orphan tenants]** → Mitigation: Add a `setupComplete` boolean on Tenant. Dashboard shows setup checklist until Stripe is connected. Scheduled cleanup job removes tenants with no Stripe account after 30 days.

**[Keycloak adds infrastructure complexity]** → Mitigation: Required anyway for Lyro Lab consistency. Use Docker Compose for local dev (same as Boardbot). Realm export/import for reproducible config.

**[Webhook delivery logs grow unbounded]** → Mitigation: 30-day retention with a scheduled cleanup job. Index on `(tenantId, createdAt)` for efficient queries.

**[OpenAPI client generation creates a build-time backend dependency]** → Mitigation: Generated client is gitignored but the `openapi.json` spec file is committed. Frontend can regenerate anytime but doesn't need a running backend.

**[Dashboard stats cache can show stale data]** → Mitigation: Show "Last updated X minutes ago" timestamp. 5-minute Redis TTL is acceptable for an admin dashboard. Add manual "Refresh" button.

**[Single admin per tenant limits team use]** → Mitigation: Accepted for v1. Multi-user access (Feature #11) is a future capability. The `AdminUser` entity already has a `tenantId` FK — adding multiple users per tenant is additive.
