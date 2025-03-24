import { CheckoutSessionProduct } from "src/payment-provider/interfaces/checkout-session-params"
import { StripeCustomerFactory } from "src/stripe/factories/stripe-customer.factory"
import { StripePaymentProviderClient } from "src/stripe/models/stripe-payment-provider-client"
import { createCheckout } from "src/stripe/models/stripe/use-cases/create-checkout"
import { createPortalSession } from "src/stripe/models/stripe/use-cases/create-portal-session"
import { syncCustomer } from "src/stripe/models/stripe/use-cases/sync-customer"
import { StripeCustomerRepository } from "src/stripe/repositories/stripe-customer.repository"
import { v4 as uuidv4 } from "uuid"

jest.mock("./stripe/use-cases/sync-customer", () => ({
  syncCustomer: jest.fn(),
}))
jest.mock("./stripe/use-cases/create-checkout", () => ({
  createCheckout: jest.fn(),
}))
jest.mock("./stripe/use-cases/create-portal-session", () => ({
  createPortalSession: jest.fn(),
}))
const syncCustomerMock = syncCustomer as jest.Mock
const createCheckoutMock = createCheckout as jest.Mock
const createPortalSessionMock = createPortalSession as jest.Mock

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
        stripe: client["stripe"],
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
      const products: CheckoutSessionProduct[] = [
        {
          externalRef: "price_12345",
          quantity: 1,
        },
      ]

      createCheckoutMock.mockResolvedValue({
        checkoutUrl: "https://checkout.url",
      })

      const result = await client.createCheckoutSession({
        customerId: "customer123",
        products,
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
      })

      expect(createCheckoutMock).toHaveBeenCalledWith({
        stripe: client["stripe"],
        products,
        stripeCustomer,
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
      })
      expect(result).toEqual({ checkoutUrl: "https://checkout.url" })
    })

    it("throws an error if customer not found", async () => {
      jest
        .spyOn(stripeCustomerRepository, "findOneByCustomerId")
        .mockResolvedValue(null)

      await expect(
        client.createCheckoutSession({
          customerId: "customer123",
          products: [],
          successUrl: "https://example.com/success",
          cancelUrl: "https://example.com/cancel",
        }),
      ).rejects.toThrow("Stripe customer not found, please sync customer first")
    })
  })

  describe("createPortalSession", () => {
    it("creates a portal session successfully", async () => {
      const stripeCustomer = await new StripeCustomerFactory().make()
      jest
        .spyOn(stripeCustomerRepository, "findOneByCustomerId")
        .mockResolvedValue(stripeCustomer)

      createPortalSessionMock.mockResolvedValue({
        portalUrl: "https://portal.url",
      })

      const result = await client.createPortalSession({
        customerId: "customer123",
        returnUrl: "https://example.com/return",
      })

      expect(createPortalSessionMock).toHaveBeenCalledWith({
        stripe: client["stripe"],
        stripeCustomerId: stripeCustomer.stripeCustomerId,
        returnUrl: "https://example.com/return",
      })
      expect(result).toEqual({ portalUrl: "https://portal.url" })
    })
  })
})
