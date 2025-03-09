import { createCheckoutSession } from "./create-checkout-session"
import Stripe from "stripe"
import { BadRequestException } from "@nestjs/common"
import { CheckoutProduct } from "src/payment-provider/interfaces/checkout-params"

jest.mock("stripe")

describe("createCheckoutSession", () => {
  let stripe: jest.Mocked<Stripe>
  let products: CheckoutProduct[]
  let stripeCustomerId: string

  beforeEach(() => {
    stripe = new Stripe("fake-api-key") as jest.Mocked<Stripe>
    stripe.prices = {
      retrieve: jest.fn(),
    } as unknown as Stripe.PricesResource
    stripe.checkout = {
      sessions: {
        create: jest.fn(),
      } as unknown as Stripe.Checkout.SessionsResource,
    }

    products = [
      { externalRef: "price_123", quantity: 1 },
      { externalRef: "price_456", quantity: 1 },
    ]
    stripeCustomerId = "cus_12345"
  })

  it("creates a checkout session and returns the session", async () => {
    const mockPrices = [
      { id: "price_123", type: "one_time" },
      { id: "price_456", type: "one_time" },
    ]
    const mockSession = { id: "sess_12345" }

    stripe.prices.retrieve = jest
      .fn()
      .mockImplementation((id) =>
        Promise.resolve(mockPrices.find((price) => price.id === id)),
      )
    stripe.checkout.sessions.create = jest.fn().mockResolvedValue(mockSession)

    const response = await createCheckoutSession({
      stripe,
      products,
      stripeCustomerId,
    })

    expect(stripe.prices.retrieve).toHaveBeenCalledTimes(products.length)
    products.forEach((product) => {
      expect(stripe.prices.retrieve).toHaveBeenCalledWith(product.externalRef)
    })
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith({
      customer: stripeCustomerId,
      success_url: "https://example.com/success",
      mode: "payment",
      line_items: mockPrices.map((price) => ({
        price: price.id,
        quantity: 1,
      })),
      allow_promotion_codes: true,
    })
    expect(response).toEqual(mockSession)
  })

  it("creates a subscription checkout session if any price is recurring", async () => {
    const mockPrices = [
      { id: "price_123", type: "recurring" },
      { id: "price_456", type: "one_time" },
    ]
    const mockSession = { id: "sess_12345" }

    stripe.prices.retrieve = jest
      .fn()
      .mockImplementation((id) =>
        Promise.resolve(mockPrices.find((price) => price.id === id)),
      )
    stripe.checkout.sessions.create = jest.fn().mockResolvedValue(mockSession)

    const response = await createCheckoutSession({
      stripe,
      products,
      stripeCustomerId,
    })

    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith({
      customer: stripeCustomerId,
      success_url: "https://example.com/success",
      mode: "subscription",
      line_items: mockPrices.map((price) => ({
        price: price.id,
        quantity: 1,
      })),
      allow_promotion_codes: true,
    })
    expect(response).toEqual(mockSession)
  })

  it("throws an error if retrieving prices fails", async () => {
    stripe.prices.retrieve = jest
      .fn()
      .mockRejectedValue(new Error("Stripe error"))

    await expect(
      createCheckoutSession({
        stripe,
        products,
        stripeCustomerId,
      }),
    ).rejects.toThrow(BadRequestException)
  })
})
