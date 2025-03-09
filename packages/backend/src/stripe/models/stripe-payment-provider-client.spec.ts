import { StripeCustomerFactory } from "src/stripe/factories/stripe-customer.factory"
import { StripePaymentProviderClient } from "src/stripe/models/stripe-payment-provider-client"
import { createCustomer } from "src/stripe/models/stripe/create-customer"
import { StripeCustomerRepository } from "src/stripe/repositories/stripe-customer.repository"
import Stripe from "stripe"
import { v4 as uuidv4 } from "uuid"

jest.mock("./stripe/create-customer", () => ({
  createCustomer: jest.fn(),
}))
const createCustomerMock = createCustomer as jest.Mock

describe("StripePaymentProviderClient", () => {
  let stripeCustomerRepository: StripeCustomerRepository
  let client: StripePaymentProviderClient

  beforeEach(() => {
    stripeCustomerRepository = {
      findOneByCustomerId: jest.fn(),
      create: jest.fn(),
    } as unknown as StripeCustomerRepository
    client = new StripePaymentProviderClient(stripeCustomerRepository, {
      secretKey: "fake-api-key",
      publishableKey: "fake-publishable-key",
    })
  })

  describe("syncCustomer", () => {
    it("creates a new customer if no customer exists", async () => {
      jest
        .spyOn(stripeCustomerRepository, "findOneByCustomerId")
        .mockResolvedValue(null)
      createCustomerMock.mockResolvedValue({ id: "cus_12345" })

      const baseCustomer = {
        id: uuidv4(),
        email: "test@email.com",
        tenantId: "tenant123",
        userRef: "userRef123",
      }

      await client.syncCustomer(baseCustomer)

      expect(createCustomerMock).toHaveBeenCalledWith(
        expect.any(Stripe),
        baseCustomer,
      )
      expect(stripeCustomerRepository.create).toHaveBeenCalledWith({
        customerId: baseCustomer.id,
        stripeCustomerId: "cus_12345",
      })
    })

    it("does not create a new customer if customer already exists", async () => {
      const stripeCustomer = new StripeCustomerFactory().make()
      jest
        .spyOn(stripeCustomerRepository, "findOneByCustomerId")
        .mockResolvedValue(stripeCustomer)

      const baseCustomer = {
        id: "user123",
        email: "test@email.com",
        tenantId: "tenant123",
        userRef: "userRef123",
      }

      await client.syncCustomer(baseCustomer)

      expect(createCustomerMock).not.toHaveBeenCalled()
      expect(stripeCustomerRepository.create).not.toHaveBeenCalled()
    })
  })
})
