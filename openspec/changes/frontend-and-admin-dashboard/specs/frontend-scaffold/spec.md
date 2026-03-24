## ADDED Requirements

### Requirement: Frontend package exists in monorepo
The system SHALL have a `packages/frontend` workspace in the Payflow monorepo, registered in the root `package.json` workspaces array.

#### Scenario: Frontend workspace is recognized by npm
- **WHEN** `npm install` is run from the monorepo root
- **THEN** the `packages/frontend` workspace is installed with all its dependencies

### Requirement: Vite dev server serves the frontend
The system SHALL use Vite 6 as the build tool with a dev server configured on a dedicated port.

#### Scenario: Dev server starts
- **WHEN** `npm run dev` is run in `packages/frontend`
- **THEN** a Vite dev server starts and serves the React application with hot module replacement

#### Scenario: Production build
- **WHEN** `npm run build` is run in `packages/frontend`
- **THEN** Vite produces an optimized static build in `packages/frontend/dist/`

### Requirement: TanStack Router file-based routing
The system SHALL use TanStack Router with file-based routing, configured to read routes from `src/app/` and generate the route tree at `src/routeTree.gen.ts`.

#### Scenario: Route tree generation
- **WHEN** a new `.tsx` file is added to `src/app/`
- **THEN** the TanStack Router Vite plugin regenerates `src/routeTree.gen.ts` with the new route

#### Scenario: Root layout exists
- **WHEN** the application loads
- **THEN** `src/app/__root.tsx` renders as the root layout with a Sonner `<Toaster />` and an `<Outlet />`

### Requirement: MUI theme with dark mode
The system SHALL configure a MUI v7 theme in `src/theme.ts` with dark mode palette, Geist Variable font, custom sidebar dimensions, and component overrides for Button, Card, and Chip — matching Boardbot's theme structure.

#### Scenario: Theme is applied globally
- **WHEN** the application renders
- **THEN** `<ThemeProvider>` and `<CssBaseline />` wrap the entire application in `main.tsx`

### Requirement: TypeScript path aliases
The system SHALL configure TypeScript path aliases so `@/*` resolves to `./src/*` and `@/test/*` resolves to `./test/*`, with Vite resolving them via `vite-tsconfig-paths`.

#### Scenario: Import with alias
- **WHEN** a file imports `@/modules/auth/components/AuthProvider`
- **THEN** TypeScript and Vite resolve it to `src/modules/auth/components/AuthProvider`

### Requirement: Provider hierarchy in main.tsx
The system SHALL render providers in this order in `main.tsx`: `ThemeProvider` → `CssBaseline` → `AuthProvider` → `RouterProvider`.

#### Scenario: App entry point renders
- **WHEN** the application starts
- **THEN** `main.tsx` creates a React root and renders the provider hierarchy

### Requirement: App shell layout for protected routes
The system SHALL provide an app layout at `src/app/app.tsx` that wraps protected routes with: `QueryClientProvider` → `RequireAuth` → `BreadcrumbProvider` → `SidebarProvider` → Sidebar + main content area with header and breadcrumbs.

#### Scenario: Authenticated user sees app shell
- **WHEN** an authenticated user navigates to `/app/*`
- **THEN** they see a sidebar, header with breadcrumbs, and the route content

#### Scenario: QueryClient error handling
- **WHEN** an API call returns 401
- **THEN** the QueryClient's error handler triggers `userManager.signinRedirect()`

#### Scenario: Non-401 API error
- **WHEN** an API call fails with a non-401 error and the query/mutation has `meta.showErrorToast`
- **THEN** a Sonner toast displays the error message

### Requirement: ESLint and Prettier configuration
The system SHALL include ESLint 9 with Prettier integration and TanStack Query plugin, matching Boardbot's linting setup.

#### Scenario: Lint check passes
- **WHEN** `npm run lint:check` is run
- **THEN** ESLint validates all TypeScript/React files without errors

### Requirement: Vitest testing setup
The system SHALL configure Vitest with jsdom environment, Testing Library setup, and MSW helpers for API mocking.

#### Scenario: Test suite runs
- **WHEN** `npm run test` is run
- **THEN** Vitest executes all `*.test.tsx` and `*.spec.tsx` files with Testing Library and MSW available

### Requirement: Runtime configuration support
The system SHALL support runtime configuration via `window.__CONFIG__` (loaded from `/config.js`) with fallback to `import.meta.env.*` variables, matching Boardbot's pattern.

#### Scenario: Runtime config override
- **WHEN** `window.__CONFIG__.VITE_BACKEND_URL` is set
- **THEN** the API client uses that value instead of `import.meta.env.VITE_BACKEND_URL`
