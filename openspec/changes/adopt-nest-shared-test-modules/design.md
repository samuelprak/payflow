## Context

Payflow's test infrastructure uses Testcontainers to dynamically provision PostgreSQL and Redis Docker containers. While self-contained, this approach suffers from slow startup, poor multi-worker parallelism (single shared container), and diverges from the pattern used by lyrochat and boardbot — both of which use `@lyrolab/nest-shared`'s `SharedDatabaseModule` and `SharedRedisModule`.

The nest-shared library provides:
- **`SharedDatabaseModule.forTest({ entities })`** — creates per-worker test databases (`dbname_test_{workerId}`) from an existing PostgreSQL instance
- **`SharedRedisModule.forTest()`** — connects to an existing Redis with per-worker key prefix isolation (`test_{workerId}`)
- **`SharedBullModule.forRoot()`** — BullMQ configured on top of whatever Redis module is loaded

Payflow already depends on `@lyrolab/nest-shared` (installed via local tarball).

## Goals / Non-Goals

**Goals:**
- Replace Testcontainers with nest-shared's `SharedDatabaseModule` and `SharedRedisModule` for all tests
- Match the exact test infrastructure pattern used by lyrochat and boardbot
- Enable proper multi-worker test parallelism via per-worker DB and Redis isolation
- Remove the `testcontainers` dependency

**Non-Goals:**
- Migrating from Jest to Vitest (boardbot uses Vitest, but that's a separate concern)
- Changing any application/production code
- Adding new test coverage — this is purely infrastructure
- Modifying nest-shared itself

## Decisions

### 1. Test database helper location: `test/helpers/database.ts`

Follow lyrochat/boardbot convention — a single file that exports a pre-configured `TestDatabaseModule`:

```typescript
import { SharedDatabaseModule } from "@lyrolab/nest-shared/database"
// import all 7 entities
export const TestDatabaseModule = SharedDatabaseModule.forTest({ entities: [...] })
```

**Why not keep it in `test/utils/`**: Consistency with other company projects. All use `test/helpers/database.ts`.

### 2. Redis + Bull: two imports, no custom wrapper

For e2e tests needing BullMQ:
```typescript
imports: [
  SharedRedisModule.forTest(),
  SharedBullModule.forRoot(),
]
```

`SharedBullModule` has no `forTest()` — it reads Redis config from whatever `SharedRedisModule` provides. This is the established pattern.

**Alternative considered**: Creating a `TestBullModule` wrapper. Rejected — unnecessary indirection, and the two-import pattern is what lyrochat/boardbot use.

### 3. Setup file lifecycle hooks

```typescript
// test/setup-tests.ts
beforeAll(() => SharedDatabaseModule.setupTestDatabase())
beforeEach(() => SharedDatabaseModule.clearTestDatabase())
```

Drop `afterAll` cleanup for the database — `setupTestDatabase()` does `DROP DATABASE IF EXISTS ... WITH (FORCE)` at the start of each run, so stale state is never a problem.

Keep `afterAll` for `closeTestingApplications()` (NestJS app cleanup).

### 4. Factory DataSource migration

All factories change from:
```typescript
protected dataSource = TestDatabaseModule.getDataSource()
```
to:
```typescript
protected dataSource = SharedDatabaseModule.getTestDataSource()
```

This is a mechanical find-and-replace across 7 factory files.

### 5. E2E test module imports

Current pattern (async):
```typescript
imports: [
  await TestDatabaseModule.forRoot(),  // async — returns Promise<DynamicModule>
  await TestBullModule.forRoot(),      // async
]
```

New pattern (sync):
```typescript
imports: [
  TestDatabaseModule,                  // sync — pre-configured module
  SharedRedisModule.forTest(),         // sync
  SharedBullModule.forRoot(),          // sync
]
```

The `await` calls in `beforeAll` disappear because `SharedDatabaseModule.forTest()` returns a synchronous `DynamicModule`. The async work happens in `setupTestDatabase()` which runs in the global `beforeAll`.

### 6. Environment requirements

Tests require:
- `DATABASE_URL` — pointing to a running PostgreSQL instance
- `REDIS_URL` — pointing to a running Redis instance

For local dev, a `docker-compose.yml` or locally installed services. For CI, GitHub Actions service containers.

### 7. Remove test/utils/test-database/ and test/utils/test-bull.module.ts

Delete entirely. The `test/utils/create-testing-application.ts` stays — it's unrelated to Testcontainers.

## Risks / Trade-offs

- **Local dev setup friction** → Developers now need PG + Redis running locally. Mitigated by documenting setup (docker-compose or brew services). This is already the norm for lyrochat/boardbot devs.
- **CI must provision services** → Add `postgres` and `redis` service containers to GitHub Actions. Standard pattern, well-documented.
- **`synchronize(true)` on setup** → nest-shared drops and recreates the test DB per run, then uses `synchronize: true` to build schema from entities. This means test schema always matches entity definitions, not migrations. Same trade-off the other projects accept.
- **TRUNCATE vs DROP+resync between tests** → `clearTestDatabase()` uses `TRUNCATE CASCADE` (fast) vs the old `synchronize(true)` per test (slow). This is a performance improvement, not a risk.
