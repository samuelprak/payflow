## ADDED Requirements

### Requirement: Test Redis module uses SharedRedisModule from nest-shared
E2E tests requiring Redis/BullMQ SHALL use `SharedRedisModule.forTest()` from `@lyrolab/nest-shared/redis` for Redis connectivity, with per-worker key prefix isolation.

#### Scenario: Redis configured in e2e test module
- **WHEN** an e2e test module needs Redis/BullMQ
- **THEN** it MUST import `SharedRedisModule.forTest()` which provides a Redis connection with key prefix `test_{workerId}`

### Requirement: BullMQ uses SharedBullModule on top of SharedRedisModule
E2E tests requiring BullMQ SHALL import `SharedBullModule.forRoot()` from `@lyrolab/nest-shared/bull` alongside `SharedRedisModule.forTest()`.

#### Scenario: Bull configured in e2e test module
- **WHEN** an e2e test module needs BullMQ job queues
- **THEN** it MUST import both `SharedRedisModule.forTest()` and `SharedBullModule.forRoot()` — Bull reads its Redis config from the shared Redis module

### Requirement: Testcontainers Redis removed
The custom `TestBullModule` in `test/utils/test-bull.module.ts` that spins up a Redis Docker container SHALL be removed entirely.

#### Scenario: No Docker container for Redis
- **WHEN** tests run
- **THEN** no Redis Docker container is started — tests connect to the Redis instance specified by `REDIS_URL`

### Requirement: REDIS_URL environment variable required for tests
Tests requiring Redis SHALL require a `REDIS_URL` environment variable pointing to a running Redis instance.

#### Scenario: REDIS_URL used for test Redis connection
- **WHEN** `SharedRedisModule.forTest()` initializes
- **THEN** it connects to the Redis instance at `REDIS_URL` with a worker-specific key prefix
