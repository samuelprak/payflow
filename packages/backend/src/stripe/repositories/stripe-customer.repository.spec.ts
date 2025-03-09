import { Test, TestingModule } from "@nestjs/testing"
import { TypeOrmModule } from "@nestjs/typeorm"
import { CustomerFactory } from "src/customer/factories/customer.factory"
import { StripeCustomer } from "src/stripe/entities/stripe-customer.entity"
import { StripeCustomerFactory } from "src/stripe/factories/stripe-customer.factory"
import { StripeCustomerRepository } from "src/stripe/repositories/stripe-customer.repository"
import { assertDifference } from "test/helpers/assert-difference"
import { TestDatabaseModule } from "test/utils/test-database/test-database.module"
import { v4 as uuidv4 } from "uuid"

describe("StripeCustomerRepository", () => {
  let module: TestingModule
  let repository: StripeCustomerRepository

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TestDatabaseModule.forRoot(),
        TypeOrmModule.forFeature([StripeCustomer]),
      ],
      providers: [StripeCustomerRepository],
    }).compile()

    repository = module.get(StripeCustomerRepository)
  })

  describe("findOneByStripeCustomerId", () => {
    it("finds a stripe customer by stripeCustomerId", async () => {
      const stripeCustomer = await new StripeCustomerFactory().create()

      const resultOrNull = await repository.findOneByStripeCustomerId(
        stripeCustomer.stripeCustomerId,
      )

      expect(resultOrNull).toBeDefined()
      const result = resultOrNull as StripeCustomer
      expect(result.id).toEqual(stripeCustomer.id)
    })

    it("returns null if no stripe customer is found", async () => {
      const result = await repository.findOneByStripeCustomerId(uuidv4())

      expect(result).toBeNull()
    })
  })

  describe("findOneByCustomerId", () => {
    it("finds a stripe customer by customerId", async () => {
      const stripeCustomer = await new StripeCustomerFactory().create()

      const resultOrNull = await repository.findOneByCustomerId(
        stripeCustomer.customer.id,
      )

      expect(resultOrNull).toBeDefined()
      const result = resultOrNull as StripeCustomer
      expect(result.id).toEqual(stripeCustomer.id)
    })

    it("returns null if no stripe customer is found", async () => {
      const result = await repository.findOneByCustomerId(uuidv4())

      expect(result).toBeNull()
    })
  })

  describe("create", () => {
    it("creates a stripe customer", async () => {
      const stripeCustomerId = "cus_123"
      const customer = await new CustomerFactory().create()

      const result = await assertDifference([[StripeCustomer, 1]], () =>
        repository.create({ stripeCustomerId, customerId: customer.id }),
      )

      expect(result).toBeDefined()
      expect(result.stripeCustomerId).toEqual(stripeCustomerId)
    })
  })
})
