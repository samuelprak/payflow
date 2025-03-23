import { Test, TestingModule } from "@nestjs/testing"
import { TypeOrmModule } from "@nestjs/typeorm"
import { CheckoutSession } from "src/customer/entities/checkout-session.entity"
import { CheckoutSessionRepository } from "src/customer/repositories/checkout-session.repository"
import { CustomerFactory } from "src/customer/factories/customer.factory"
import { TenantFactory } from "src/tenant/factories/tenant.factory"
import { assertDifference } from "test/helpers/assert-difference"
import { getRepository } from "test/helpers/get-repository"
import { TestDatabaseModule } from "test/utils/test-database/test-database.module"
import { CheckoutSessionFactory } from "src/customer/factories/checkout-session.factory"
import { NotFoundException } from "@nestjs/common"
import { v4 } from "uuid"
import { EntityNotFoundError } from "typeorm"

describe("CheckoutSessionRepository", () => {
  let module: TestingModule
  let repository: CheckoutSessionRepository

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TestDatabaseModule.forRoot(),
        TypeOrmModule.forFeature([CheckoutSession]),
      ],
      providers: [CheckoutSessionRepository],
    }).compile()

    repository = module.get(CheckoutSessionRepository)
  })

  describe("create", () => {
    it("creates a checkout session", async () => {
      const tenant = await new TenantFactory().create()
      const customer = await new CustomerFactory().create({ tenant })

      const configuration = {
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
        products: [{ externalRef: "price_123", quantity: 1 }],
      }

      const createdConfig = await assertDifference([[CheckoutSession, 1]], () =>
        repository.create({
          configuration,
          customer,
          tenant,
        }),
      )

      const savedConfig = await getRepository(
        module,
        CheckoutSession,
      ).findOneOrFail({
        where: { id: createdConfig.id },
        relations: ["customer", "tenant"],
      })

      expect(savedConfig).toBeDefined()
      expect(savedConfig.id).toEqual(createdConfig.id)
      expect(savedConfig.configuration).toEqual(configuration)
      expect(savedConfig.customer.id).toEqual(customer.id)
      expect(savedConfig.tenant.id).toEqual(tenant.id)
    })
  })

  describe("findOneOrFail", () => {
    it("returns a checkout session", async () => {
      const checkoutSession = await new CheckoutSessionFactory().create()

      const foundCheckoutSession = await repository.findOneOrFail(
        checkoutSession.id,
      )

      expect(foundCheckoutSession.id).toEqual(checkoutSession.id)
      expect(foundCheckoutSession.tenant.id).toEqual(checkoutSession.tenant.id)
      expect(foundCheckoutSession.customer.id).toEqual(
        checkoutSession.customer.id,
      )
    })

    it("throws an error if the checkout session does not exist", async () => {
      await expect(repository.findOneOrFail(v4())).rejects.toThrow(
        EntityNotFoundError,
      )
    })

    it("throws an error if the checkout session has expired", async () => {
      const checkoutSession = await new CheckoutSessionFactory().create({
        expiresAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
      })

      await expect(
        repository.findOneOrFail(checkoutSession.id),
      ).rejects.toThrow(NotFoundException)
    })
  })
})
