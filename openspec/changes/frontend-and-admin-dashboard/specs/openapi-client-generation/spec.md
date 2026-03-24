## ADDED Requirements

### Requirement: Backend OpenAPI spec export script
The system SHALL provide an `npm run generate-openapi` script in `packages/backend` that boots the NestJS application, extracts the OpenAPI JSON document, writes it to `packages/backend/openapi.json`, and exits.

#### Scenario: OpenAPI spec is generated
- **WHEN** `npm run generate-openapi` is run in `packages/backend`
- **THEN** an `openapi.json` file is written containing the full API specification including all endpoints, DTOs, and security schemes

#### Scenario: Spec includes admin endpoints
- **WHEN** the OpenAPI spec is generated after admin endpoints are added
- **THEN** `openapi.json` includes all `/admin/*` endpoints with their request/response schemas

### Requirement: Frontend OpenAPI Generator configuration
The system SHALL include an `openapitools.json` file in `packages/frontend` configured to generate a TypeScript-Axios client from the backend's `openapi.json`, outputting to `src/clients/backend-client/`.

#### Scenario: Client is generated
- **WHEN** `npm run generate-api-clients` is run in `packages/frontend`
- **THEN** TypeScript-Axios client code is generated at `src/clients/backend-client/` with typed API classes and model interfaces

### Requirement: Generated client is gitignored
The system SHALL add `src/clients/backend-client/` to `.gitignore` in `packages/frontend`, ensuring generated code is not committed to version control.

#### Scenario: Generated files are not tracked
- **WHEN** the API client is regenerated
- **THEN** `git status` does not show changes in `src/clients/backend-client/`

### Requirement: Root-level generate-api-clients script
The system SHALL provide an `npm run generate-api-clients` script in the root `package.json` that runs OpenAPI generation in the backend followed by client generation in the frontend.

#### Scenario: Full generation pipeline
- **WHEN** `npm run generate-api-clients` is run from the monorepo root
- **THEN** the backend OpenAPI spec is exported, then the frontend TypeScript client is generated from it

### Requirement: Client Configuration with auth token
The system SHALL provide a `clientConfiguration.ts` file in `modules/core/queries/` that creates an OpenAPI `Configuration` instance with `basePath` from runtime config and `accessToken` provider from the OIDC `userManager`.

#### Scenario: Configuration is used by queries
- **WHEN** a React Query hook calls a generated API method (e.g., `new AdminApi(configuration).adminControllerGetCustomers()`)
- **THEN** the request is sent to the correct backend URL with a Bearer token
