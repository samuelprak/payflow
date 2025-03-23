import { CheckoutSessionProduct } from "src/payment-provider/interfaces/checkout-session-params"
import { StripeCustomerFactory } from "src/stripe/factories/stripe-customer.factory"
import Stripe from "stripe"
import { createCheckoutSession } from "../client/create-checkout-session"
import { createCheckout } from "./create-checkout"

jest.mock("../client/create-checkout-session", () => ({
  createCheckoutSession: jest.fn(),
}))
const createCheckoutSessionMock = createCheckoutSession as jest.Mock

describe("createCheckout", () => {
  const stripe = new Stripe("fake-api-key")
  const products: CheckoutSessionProduct[] = [
    {
      externalRef: "price_12345",
      quantity: 1,
    },
  ]

  it("creates a checkout session successfully", async () => {
    const stripeCustomer = await new StripeCustomerFactory().make()
    createCheckoutSessionMock.mockResolvedValue({ url: "https://checkout.url" })

    const result = await createCheckout({
      stripe,
      products,
      stripeCustomer,
      successUrl: "https://example.com/success",
      cancelUrl: "https://example.com/cancel",
    })

    expect(createCheckoutSessionMock).toHaveBeenCalledWith({
      stripe,
      products,
      stripeCustomerId: stripeCustomer.stripeCustomerId,
      successUrl: "https://example.com/success",
      cancelUrl: "https://example.com/cancel",
    })
    expect(result).toEqual({ checkoutUrl: "https://checkout.url" })
  })

  it("throws an error if checkout session creation fails", async () => {
    const stripeCustomer = await new StripeCustomerFactory().make()
    createCheckoutSessionMock.mockResolvedValue({ url: null })

    await expect(
      createCheckout({
        stripe,
        products,
        stripeCustomer,
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
      }),
    ).rejects.toThrow("Failed to create checkout session")
  })
})
