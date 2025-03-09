import { Test, TestingModule } from "@nestjs/testing"
import { TypeOrmModule } from "@nestjs/typeorm"
import { StripeAccount } from "src/stripe/entities/stripe-account.entity"
import { StripeAccountFactory } from "src/stripe/factories/stripe-account.factory"
import { StripeAccountRepository } from "src/stripe/repositories/stripe-account.repository"
import { TestDatabaseModule } from "test/utils/test-database/test-database.module"
import { v4 as uuidv4 } from "uuid"

describe("StripeAccountRepository", () => {
  let module: TestingModule
  let repository: StripeAccountRepository

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TestDatabaseModule.forRoot(),
        TypeOrmModule.forFeature([StripeAccount]),
      ],
      providers: [StripeAccountRepository],
    }).compile()

    repository = module.get(StripeAccountRepository)
  })

  describe("findOneByTenantId", () => {
    it("finds a stripe account by tenantId", async () => {
      const stripeAccount = await new StripeAccountFactory().create()

      const resultOrNull = await repository.findOneByTenantId(
        stripeAccount.tenants[0].id,
      )

      expect(resultOrNull).toBeDefined()
      const result = resultOrNull as StripeAccount
      expect(result.id).toEqual(stripeAccount.id)
    })

    it("returns null if no stripe account is found", async () => {
      await new StripeAccountFactory().create()

      const result = await repository.findOneByTenantId(uuidv4())

      expect(result).toBeNull()
    })
  })
})
