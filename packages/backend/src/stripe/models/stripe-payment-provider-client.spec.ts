import { CheckoutProduct } from "src/payment-provider/interfaces/checkout-params"
import { StripeCustomerFactory } from "src/stripe/factories/stripe-customer.factory"
import { StripePaymentProviderClient } from "src/stripe/models/stripe-payment-provider-client"
import { createCheckout } from "src/stripe/models/stripe/use-cases/create-checkout"
import { syncCustomer } from "src/stripe/models/stripe/use-cases/sync-customer"
import { StripeCustomerRepository } from "src/stripe/repositories/stripe-customer.repository"
import Stripe from "stripe"
import { v4 as uuidv4 } from "uuid"

jest.mock("./stripe/use-cases/sync-customer", () => ({
  syncCustomer: jest.fn(),
}))
jest.mock("./stripe/use-cases/create-checkout", () => ({
  createCheckout: jest.fn(),
}))
const syncCustomerMock = syncCustomer as jest.Mock
const createCheckoutMock = createCheckout as jest.Mock

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
    it("calls syncCustomer", async () => {
      const baseCustomer = {
        id: uuidv4(),
        email: "test@email.com",
        tenantId: "tenant123",
        userRef: "userRef123",
      }

      await client.syncCustomer(baseCustomer)

      expect(syncCustomerMock).toHaveBeenCalledWith({
        baseCustomer,
        stripe: expect.any(Stripe),
        stripeCustomerRepository,
      })
    })
  })

  describe("createCheckout", () => {
    it("creates a checkout session successfully", async () => {
      const stripeCustomer = await new StripeCustomerFactory().make()
      jest
        .spyOn(stripeCustomerRepository, "findOneByCustomerId")
        .mockResolvedValue(stripeCustomer)
      const products: CheckoutProduct[] = [
        {
          externalRef: "price_12345",
          quantity: 1,
        },
      ]

      createCheckoutMock.mockResolvedValue({
        checkoutUrl: "https://checkout.url",
      })

      const result = await client.createCheckout({
        customerId: "customer123",
        products,
      })

      expect(createCheckoutMock).toHaveBeenCalledWith({
        stripe: expect.any(Stripe),
        products,
        stripeCustomer,
      })
      expect(result).toEqual({ checkoutUrl: "https://checkout.url" })
    })

    it("throws an error if customer not found", async () => {
      jest
        .spyOn(stripeCustomerRepository, "findOneByCustomerId")
        .mockResolvedValue(null)

      await expect(
        client.createCheckout({ customerId: "customer123", products: [] }),
      ).rejects.toThrow("Stripe customer not found, please sync customer first")
    })
  })
})
