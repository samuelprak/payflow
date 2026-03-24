## Why

Payflow is a backend-only payment middleware with no UI. Product admins who integrate Payflow must manage everything through raw API calls, direct database access, or seed scripts. There is no way to visually monitor subscriptions, debug webhook failures, manage Stripe connections, or rotate API keys. This blocks adoption — teams won't integrate a payment system they can't observe or configure without SSH.

Additionally, Payflow has no public-facing presence to attract new adopters. There is no marketing page explaining what it does, how to get started, or why a team should choose it over building their own Stripe integration.

## What Changes

**Frontend application (new)**
- Bootstrap a React frontend package (`packages/frontend`) following Lyro Lab conventions from Boardbot
- Marketing landing page at `/` selling Payflow to developer teams
- Admin dashboard at `/app/*` for managing Payflow configuration and monitoring subscriptions

**Admin authentication (new)**
- OIDC-based admin login via Keycloak (new `payflow` realm, mirroring Boardbot's auth setup)
- New `AdminUser` entity linking OIDC subjects to tenants
- New `AdminGuard` for dashboard API routes

**Admin API layer (new)**
- New `/admin/*` REST endpoints providing read/write access to tenants, customers, subscriptions, and settings through human-authenticated routes
- Dashboard statistics aggregation endpoint
- Webhook delivery log persistence and retrieval

**Backend enhancements (new)**
- `WebhookDeliveryLog` entity to persist webhook delivery outcomes
- API key rotation endpoints
- OpenAPI spec export script (prerequisite for frontend API client generation)

## Capabilities

### New Capabilities
- `frontend-scaffold`: Vite + React + TanStack Router project bootstrapping in `packages/frontend`, matching Boardbot's tech stack and conventions
- `landing-page`: Public marketing page with hero, features, code examples, and CTA sections
- `admin-auth`: Keycloak OIDC integration for human admin login, `AdminUser` entity, `AdminGuard`, protected route handling
- `admin-dashboard`: Overview page with stat cards (customer count, active subscriptions, MRR, webhook success rate) and recent activity feed
- `customer-management`: Customer list with search/pagination, customer detail view with subscriptions, and admin actions (create checkout, create portal, cancel subscription)
- `settings-management`: Tenant settings (general info, API key rotation, Stripe account connection, webhook delivery logs)
- `admin-api`: Backend REST endpoints under `/admin/*` supporting all dashboard views with OIDC-based authentication
- `webhook-delivery-logs`: Persist webhook delivery attempts (status, response code, timestamp) and surface them in the dashboard
- `openapi-client-generation`: OpenAPI spec export from backend + auto-generated TypeScript-Axios client for the frontend

### Modified Capabilities
_(No existing specs to modify)_

## Impact

**New packages:**
- `packages/frontend` — entire new workspace in the monorepo

**Backend changes:**
- New `admin` module with controllers, guards, and services
- New `AdminUser` entity + migration
- New `WebhookDeliveryLog` entity + migration
- Modified `WebhookProcessor` to persist delivery outcomes
- New OpenAPI export script in backend `package.json`

**Infrastructure:**
- Keycloak instance required (new `payflow` realm, or shared instance with Boardbot)
- Frontend static hosting (nginx/CDN, separate from backend)

**Dependencies (frontend):**
- React 19, Vite 6, TanStack Router, React Query, MUI v7, Zustand, Zod, react-hook-form, react-oidc-context, recharts, sonner, date-fns

**Dependencies (backend):**
- `@nestjs/passport` or OIDC token validation library for admin auth

**API surface:**
- ~15 new `/admin/*` endpoints (non-breaking, additive)
- Existing API key-authenticated endpoints unchanged
