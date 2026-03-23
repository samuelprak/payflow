## Why

Payflow uses Testcontainers to spin up PostgreSQL and Redis Docker containers for tests. This causes painful multi-core/parallel test issues — each Jest worker tries to share a single container, and startup is slow. Meanwhile, our other company projects (lyrochat, boardbot) already use `@lyrolab/nest-shared`'s `SharedDatabaseModule` and `SharedRedisModule`, which provide per-worker database isolation and key-prefixed Redis without Docker containers. Aligning payflow with the same pattern removes the Testcontainers pain and brings consistency across all company projects.

## What Changes

- **Remove Testcontainers dependency** (`testcontainers` package) and the custom `TestDatabaseModule` that wraps it
- **Remove custom `TestBullModule`** that spins up a Redis container via Testcontainers
- **Adopt `SharedDatabaseModule.forTest()`** from `@lyrolab/nest-shared/database` for test database setup — per-worker DB isolation via `JEST_WORKER_ID`
- **Adopt `SharedRedisModule.forTest()`** from `@lyrolab/nest-shared/redis` for test Redis setup — per-worker key prefix isolation
- **Adopt `SharedBullModule.forRoot()`** from `@lyrolab/nest-shared/bull` for BullMQ test configuration, layered on top of `SharedRedisModule.forTest()`
- **Update `test/setup-tests.ts`** to use `SharedDatabaseModule.setupTestDatabase()` / `clearTestDatabase()` lifecycle hooks
- **Update all 7 factories** to use `SharedDatabaseModule.getTestDataSource()` instead of `TestDatabaseModule.getDataSource()`
- **Update all 7 e2e test files** to import the new test modules instead of the old Testcontainers-based ones
- **Require `DATABASE_URL` and `REDIS_URL`** environment variables for test runs (local PG + Redis must be running)

## Capabilities

### New Capabilities

- `shared-test-database`: Test database infrastructure using `SharedDatabaseModule.forTest()` from nest-shared, replacing Testcontainers PostgreSQL
- `shared-test-redis`: Test Redis/Bull infrastructure using `SharedRedisModule.forTest()` and `SharedBullModule.forRoot()` from nest-shared, replacing Testcontainers Redis

### Modified Capabilities

_(none — this is a test infrastructure change with no impact on application behavior or APIs)_

## Impact

- **Test infrastructure**: Complete replacement of database and Redis test setup
- **Dependencies**: Remove `testcontainers` package; `@lyrolab/nest-shared` is already a dependency
- **Local dev requirements**: Developers must have PostgreSQL and Redis running locally (or via docker-compose) — Testcontainers no longer handles this automatically
- **CI**: GitHub Actions must provision PostgreSQL and Redis service containers
- **All test files**: 7 e2e specs, 7 factories, `setup-tests.ts`, and any repository specs that import `TestDatabaseModule`
- **No application code changes**: Only test infrastructure is affected
