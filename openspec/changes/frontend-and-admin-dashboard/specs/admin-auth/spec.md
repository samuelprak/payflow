## ADDED Requirements

### Requirement: Keycloak OIDC frontend integration
The system SHALL configure OIDC authentication using `react-oidc-context` and `oidc-client-ts` with a Keycloak `payflow` realm and `payflow-frontend` client. Configuration SHALL support runtime overrides via `window.__CONFIG__` with fallback to environment variables.

#### Scenario: OIDC config is initialized
- **WHEN** the application starts
- **THEN** a `UserManager` is created with authority pointing to the Keycloak `payflow` realm, `payflow-frontend` client ID, `openid profile email` scopes, automatic silent renewal enabled, and session storage for user state

### Requirement: AuthProvider wraps the application
The system SHALL provide an `AuthProvider` component that wraps the application with the OIDC context provider, making auth state available to all components.

#### Scenario: Auth state is accessible
- **WHEN** any component calls `useAuth()`
- **THEN** it receives the current authentication state (isAuthenticated, user, signinRedirect, etc.)

### Requirement: RequireAuth guard for protected routes
The system SHALL provide a `RequireAuth` component that checks authentication status and redirects unauthenticated users to Keycloak login.

#### Scenario: Unauthenticated user visits protected route
- **WHEN** an unauthenticated user navigates to `/app/*`
- **THEN** `RequireAuth` triggers `userManager.signinRedirect()` and redirects to Keycloak

#### Scenario: Authenticated user accesses protected route
- **WHEN** an authenticated user navigates to `/app/*`
- **THEN** `RequireAuth` renders its children (the protected content)

### Requirement: LoginButton component with login/register actions
The system SHALL provide a `LoginButton` component that supports `action` prop ("login" or "register") and triggers the appropriate Keycloak flow.

#### Scenario: Login action
- **WHEN** an unauthenticated user clicks a LoginButton with `action="login"`
- **THEN** `userManager.signinRedirect()` is called (Keycloak login page)

#### Scenario: Register action
- **WHEN** an unauthenticated user clicks a LoginButton with `action="register"`
- **THEN** `userManager.signinRedirect()` is called with the Keycloak registration URL

### Requirement: UserMenu component for authenticated users
The system SHALL provide a `UserMenu` component displaying the user's email/name with a dropdown containing a "Sign Out" action.

#### Scenario: User signs out
- **WHEN** an authenticated user clicks "Sign Out" in the UserMenu
- **THEN** `userManager.signoutRedirect()` is called and the user is redirected to the landing page

### Requirement: AdminUser backend entity
The system SHALL have an `AdminUser` entity with fields: `id` (UUID, PK), `oidcSubject` (string, unique), `email` (string), `tenantId` (UUID, FK → Tenant), `createdAt`, `updatedAt`. The entity SHALL have a ManyToOne relationship to Tenant.

#### Scenario: AdminUser is persisted
- **WHEN** a new admin user is created
- **THEN** a record is stored with the OIDC subject, email, and linked tenant ID

### Requirement: AdminGuard validates OIDC tokens
The system SHALL provide an `AdminGuard` that extracts the Bearer token from the Authorization header, validates it against Keycloak's JWKS endpoint, resolves the `AdminUser` by OIDC subject, and attaches both the `AdminUser` and `Tenant` to the request.

#### Scenario: Valid OIDC token
- **WHEN** a request to `/admin/*` includes a valid Bearer token
- **THEN** the AdminGuard resolves the AdminUser and Tenant, attaching them to `request.adminUser` and `request.tenant`

#### Scenario: Invalid or missing token
- **WHEN** a request to `/admin/*` has no Bearer token or an invalid/expired token
- **THEN** the AdminGuard throws `UnauthorizedException` (401)

#### Scenario: Token valid but no AdminUser exists
- **WHEN** a request has a valid OIDC token but no AdminUser record exists for that subject
- **THEN** the AdminGuard throws `UnauthorizedException` (401)

### Requirement: Auto-provisioning on first login
The system SHALL provide a `POST /admin/auth/register` endpoint that creates an `AdminUser` and associated `Tenant` for a new OIDC user. The endpoint SHALL be protected by OIDC token validation (but not AdminGuard, since no AdminUser exists yet).

#### Scenario: First-time user registers
- **WHEN** an authenticated OIDC user calls `POST /admin/auth/register` and no AdminUser exists for their subject
- **THEN** the system creates a new Tenant (with generated API key) and AdminUser linked to it, returning the AdminUser and Tenant details

#### Scenario: Already registered user calls register
- **WHEN** an authenticated OIDC user calls `POST /admin/auth/register` and an AdminUser already exists
- **THEN** the system returns the existing AdminUser and Tenant details (idempotent)

### Requirement: Admin auth module in NestJS
The system SHALL provide an `AdminAuthModule` that exports the `AdminGuard` and `AdminUserRepository`, and registers the OIDC token validation strategy.

#### Scenario: AdminGuard is available for injection
- **WHEN** a controller uses `@UseGuards(AdminGuard)`
- **THEN** the guard is resolved from the NestJS DI container and validates requests

### Requirement: API client attaches Bearer token
The system SHALL configure the generated API client's `Configuration` object to inject the OIDC access token as a Bearer token on all requests, using the `accessToken` async provider pattern from Boardbot.

#### Scenario: API request includes auth header
- **WHEN** the frontend makes an API call through the generated client
- **THEN** the request includes `Authorization: Bearer <access_token>` header
