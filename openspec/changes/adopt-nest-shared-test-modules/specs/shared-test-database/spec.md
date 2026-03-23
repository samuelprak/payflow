## ADDED Requirements

### Requirement: Test database module uses SharedDatabaseModule from nest-shared
The test infrastructure SHALL use `SharedDatabaseModule.forTest()` from `@lyrolab/nest-shared/database` to provide the test database module, configured with all project entities.

#### Scenario: TestDatabaseModule is exported from test/helpers/database.ts
- **WHEN** a test file imports `TestDatabaseModule` from `test/helpers/database`
- **THEN** it receives a pre-configured `DynamicModule` created by `SharedDatabaseModule.forTest({ entities: [all project entities] })`

#### Scenario: All entities are registered
- **WHEN** `SharedDatabaseModule.forTest()` is called
- **THEN** it MUST include all 7 entity classes: `Tenant`, `Customer`, `StripeAccount`, `StripeCustomer`, `StripeWebhookEvent`, `PortalSession`, `CheckoutSession`

### Requirement: Test database lifecycle hooks in setup-tests.ts
The global test setup SHALL call `SharedDatabaseModule.setupTestDatabase()` before all tests and `SharedDatabaseModule.clearTestDatabase()` before each test.

#### Scenario: Database schema created before test suite
- **WHEN** the test suite starts (`beforeAll`)
- **THEN** `SharedDatabaseModule.setupTestDatabase()` MUST be called to create the worker-specific test database and synchronize the schema

#### Scenario: Database cleared between tests
- **WHEN** each individual test begins (`beforeEach`)
- **THEN** `SharedDatabaseModule.clearTestDatabase()` MUST be called to truncate all tables

### Requirement: Factories use SharedDatabaseModule DataSource
All test data factories SHALL use `SharedDatabaseModule.getTestDataSource()` as their DataSource.

#### Scenario: Factory creates persisted entity
- **WHEN** a factory's `.create()` method is called
- **THEN** the entity is persisted to the test database provided by `SharedDatabaseModule.getTestDataSource()`

### Requirement: Testcontainers PostgreSQL removed
The `testcontainers` package and the custom `TestDatabaseModule` in `test/utils/test-database/` SHALL be removed entirely.

#### Scenario: No Docker container for PostgreSQL
- **WHEN** tests run
- **THEN** no PostgreSQL Docker container is started — tests connect to the PostgreSQL instance specified by `DATABASE_URL`

### Requirement: DATABASE_URL environment variable required for tests
Tests SHALL require a `DATABASE_URL` environment variable pointing to a running PostgreSQL instance.

#### Scenario: Missing DATABASE_URL
- **WHEN** `DATABASE_URL` is not set and tests attempt to start
- **THEN** `SharedDatabaseModule.setupTestDatabase()` SHALL fail with a connection error
