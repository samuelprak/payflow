## 1. Create new test helpers

- [x] 1.1 Create `test/helpers/database.ts` exporting `TestDatabaseModule` via `SharedDatabaseModule.forTest({ entities: [Tenant, Customer, StripeAccount, StripeCustomer, StripeWebhookEvent, PortalSession, CheckoutSession] })`
- [x] 1.2 Verify `@lyrolab/nest-shared` exports `SharedRedisModule` and `SharedBullModule` are accessible from the current dependency

## 2. Update test setup lifecycle

- [x] 2.1 Rewrite `test/setup-tests.ts` to use `SharedDatabaseModule.setupTestDatabase()` in `beforeAll` and `SharedDatabaseModule.clearTestDatabase()` in `beforeEach`
- [x] 2.2 Keep `closeTestingApplications()` in `afterAll` for NestJS app cleanup
- [x] 2.3 Remove the `REDIS_URL` fallback assignment (it should come from environment or `.env`)

## 3. Update factories

- [x] 3.1 Update `TenantFactory` — change `TestDatabaseModule.getDataSource()` to `SharedDatabaseModule.getTestDataSource()`
- [x] 3.2 Update `CustomerFactory` — same DataSource change
- [x] 3.3 Update `StripeAccountFactory` — same DataSource change
- [x] 3.4 Update `StripeCustomerFactory` — same DataSource change
- [x] 3.5 Update `StripeWebhookEventFactory` — same DataSource change
- [x] 3.6 Update `PortalSessionFactory` — same DataSource change
- [x] 3.7 Update `CheckoutSessionFactory` — same DataSource change

## 4. Update e2e test imports

- [x] 4.1 Update `customer.controller.e2e.spec.ts` — replace `TestDatabaseModule.forRoot()` and `TestBullModule.forRoot()` with `TestDatabaseModule`, `SharedRedisModule.forTest()`, `SharedBullModule.forRoot()`
- [x] 4.2 Update `checkout.controller.e2e.spec.ts` — same import changes
- [x] 4.3 Update `checkout-session.controller.e2e.spec.ts` — same import changes
- [x] 4.4 Update `portal.controller.e2e.spec.ts` — same import changes
- [x] 4.5 Update `portal-session.controller.e2e.spec.ts` — same import changes
- [x] 4.6 Update `subscription.controller.e2e.spec.ts` — same import changes
- [x] 4.7 Update `stripe.e2e.spec.ts` — same import changes

## 5. Update repository/service tests

- [x] 5.1 Find and update any repository specs importing `TestDatabaseModule` from `test/utils/test-database/test-database.module` to import from `test/helpers/database`

## 6. Remove old test infrastructure

- [x] 6.1 Delete `test/utils/test-database/test-database.module.ts`
- [x] 6.2 Delete `test/utils/test-bull.module.ts`
- [x] 6.3 Remove `testcontainers` from `package.json` devDependencies and run `npm install`

## 7. Verify

- [x] 7.1 Run the full test suite and confirm all tests pass
- [x] 7.2 Verify no remaining imports of `testcontainers` or the deleted modules exist in the codebase
