import { Test, TestingModule } from "@nestjs/testing"
import { getRepositoryToken, TypeOrmModule } from "@nestjs/typeorm"
import { StripeAccount } from "src/stripe/entities/stripe-account.entity"
import { StripeAccountFactory } from "src/stripe/factories/stripe-account.factory"
import { TestDatabaseModule } from "test/utils/test-database/test-database.module"
import { Repository } from "typeorm"

describe("StripeAccountEntity", () => {
  let module: TestingModule
  let repository: Repository<StripeAccount>

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TestDatabaseModule.forRoot(),
        TypeOrmModule.forFeature([StripeAccount]),
      ],
    }).compile()

    repository = module.get(getRepositoryToken(StripeAccount))
  })

  describe("create", () => {
    it("creates a stripe account", async () => {
      const stripeAccount = await new StripeAccountFactory().create()

      const result = await repository.findOneOrFail({
        where: {
          id: stripeAccount.id,
        },
        relations: ["tenants"],
      })
      expect(result).toBeDefined()
      expect(result.stripePublishableKey).toEqual(
        stripeAccount.stripePublishableKey,
      )
      expect(result.stripeSecretKey).toEqual(stripeAccount.stripeSecretKey)
      expect(result.tenants).toHaveLength(1)
    })
  })
})
