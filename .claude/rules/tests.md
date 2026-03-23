# Test rules

- Test files are along the tested file. Example: board.controller.ts and board.controller.spec.ts in the same folder.
- **Focus on testing public methods only.** Do not test private methods directly.
- **Aim for essential test coverage, not 100%.** Write tests that verify the feature works, not every edge case.
- **Use factories instead of manual object creation** to build test data consistently.
- **For controllers, prefer E2E tests over unit tests.** Create `[module].e2e.spec.ts` files in the module folder instead of controller unit tests.

## Repository

In repository tests, we don't mock TypeORM. Use this to import the database test module:

```
  beforeAll(() => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TestDatabaseModule,
        TypeOrmModule.forFeature([Board]),
      ],
      providers: [BoardRepository],
    }).compile()
  })
```

## Service

In service tests, we do mock everything, even repositories. They are unit tests.
Use createMock, all dependencies will be automatically mocked by Jest.
Use NestJS testing module:

```
import { createMock } from "@golevelup/ts-jest"

  beforeAll(() => {
    module = await Test.createTestingModule({
      imports: [],
      providers: [BoardService],
    })
      .useMocker(createMock)
      .compile()

    service = module.get(BoardService)
  })
```

## Factories

We also use factories. You must use factories in repository tests. Here is an example:

```
import { SharedDatabaseModule } from "@lyrolab/nest-shared/database"

export class TagFactory extends Factory<Tag> {
  protected entity = Tag
  protected dataSource = SharedDatabaseModule.getTestDataSource()
  protected attrs(): FactorizedAttrs<Tag> {
    return {
      title: "Tag",
      description: "Tag description",
      board: new LazyInstanceAttribute(
        (instance) => new SingleSubfactory(BoardFactory, { tags: [instance] }),
      ),
    }
  }
}
```

And to use it:

```
const builtTag = await new TagFactory().make({ title: "Override tag" })
const persistedTag = await new TagFactory().create()
const persistedTags = await new TagFactory().createMany(2, { title: "Updated tag" })
const postLinkedToTag = await new PostFactory().create({ tag: persistedTag })
```

**Important:** Use `.make()` for unit tests (creates objects without persisting to database) and `.create()` for integration tests (persists to database).

## E2E Tests

For controller E2E tests, place the test file in the module root as `[module].e2e.spec.ts`. Mock guards as needed:

```typescript
import { TestDatabaseModule } from "test/helpers/database"
import { INestApplication } from "@nestjs/common"
import { Test, TestingModule } from "@nestjs/testing"
import request from "supertest"
import { SessionGuard } from "src/auth/guards/session.guard"

describe("ModuleController (e2e)", () => {
  let app: INestApplication
  let user: User

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [TestDatabaseModule, ModuleModule],
    })
      .overrideGuard(SessionGuard)
      .useValue({
        canActivate: (context) => {
          const request = context.switchToHttp().getRequest()
          request.user = { user }
          return true
        },
      })
      .compile()

    app = module.createNestApplication()
    await app.init()
  })

  beforeEach(async () => {
    user = await new UserFactory().create()
  })

  it("should test nominal case", async () => {
    const response = await request(app.getHttpServer())
      .get("/endpoint")
      .expect(200)
    
    expect(response.body).toEqual(expectedResponse)
  })
})
```

## Test Assertions

When testing repository methods that return potentially null/undefined values, use the optional pattern with type assertions:

**CORRECT:**
```typescript
const createdMessageOpt = await messageRepository.findOne()

expect(createdMessageOpt).toBeDefined()
const createdMessage = createdMessageOpt as Message
expect(createdMessage.id).toBe(messageData.id)
```

**INCORRECT (avoid non-null assertions):**
```typescript
const createdMessage = await messageRepository.findOne()

expect(createdMessage).toBeDefined()
expect(createdMessage!.id).toBe(messageData.id) // ❌ Forbidden non-null assertion
```
