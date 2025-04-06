import { getSubscriptions } from "./get-subscriptions"
import { listSubscriptions } from "../client/list-subscriptions"
import Stripe from "stripe"

jest.mock("../client/list-subscriptions", () => ({
  listSubscriptions: jest.fn(),
}))
const listSubscriptionsMock = listSubscriptions as jest.Mock

describe("getSubscriptions", () => {
  const stripe = new Stripe("fake-api-key")
  const stripeCutomerId = "cus_12345"

  it("returns running subscriptions", async () => {
    listSubscriptionsMock.mockResolvedValue([
      {
        id: "sub_123",
        status: "active",
        current_period_start: 1633046400,
        current_period_end: 1635724800,
        cancel_at_period_end: false,
        default_payment_method: {
          card: {
            brand: "visa",
            last4: "4242",
            exp_month: 12,
            exp_year: 2023,
          },
        },
        items: {
          data: [
            {
              price: { id: "price_123", unit_amount: 1000, currency: "usd" },
            },
          ],
        },
      },
    ])

    const result = await getSubscriptions({ stripe, stripeCutomerId })

    expect(listSubscriptionsMock).toHaveBeenCalledWith({
      stripe,
      stripeCutomerId,
    })
    expect(result).toEqual([
      {
        shouldProvideProduct: true,
        hasPastDueSubscription: false,
        externalRef: "sub_123",
        productExternalRef: "price_123",
        currentPeriodStart: new Date(1633046400 * 1000),
        currentPeriodEnd: new Date(1635724800 * 1000),
        cancelAtPeriodEnd: false,
        paymentMethod: {
          brand: "visa",
          last_digits: "4242",
          expiry: "12/2023",
        },
        amount: 1000,
        currency: "usd",
      },
    ])
  })

  it("filters out non-running subscriptions", async () => {
    listSubscriptionsMock.mockResolvedValue([
      {
        id: "sub_123",
        status: "canceled",
        current_period_start: 1633046400,
        current_period_end: 1635724800,
        default_payment_method: null,
        cancel_at_period_end: false,
        items: {
          data: [
            {
              price: { id: "price_123", unit_amount: 1000, currency: "usd" },
            },
          ],
        },
      },
    ])

    const result = await getSubscriptions({ stripe, stripeCutomerId })

    expect(listSubscriptionsMock).toHaveBeenCalledWith({
      stripe,
      stripeCutomerId,
    })
    expect(result).toEqual([])
  })

  it("handles subscriptions with no payment method", async () => {
    listSubscriptionsMock.mockResolvedValue([
      {
        id: "sub_123",
        status: "active",
        current_period_start: 1633046400,
        current_period_end: 1635724800,
        default_payment_method: null,
        cancel_at_period_end: false,
        items: {
          data: [
            {
              price: { id: "price_123", unit_amount: 1000, currency: "usd" },
            },
          ],
        },
      },
    ])

    const result = await getSubscriptions({ stripe, stripeCutomerId })

    expect(listSubscriptionsMock).toHaveBeenCalledWith({
      stripe,
      stripeCutomerId,
    })
    expect(result).toEqual([
      {
        shouldProvideProduct: true,
        hasPastDueSubscription: false,
        externalRef: "sub_123",
        productExternalRef: "price_123",
        currentPeriodStart: new Date(1633046400 * 1000),
        currentPeriodEnd: new Date(1635724800 * 1000),
        paymentMethod: undefined,
        amount: 1000,
        currency: "usd",
        cancelAtPeriodEnd: false,
      },
    ])
  })

  it("handles past due subscriptions", async () => {
    listSubscriptionsMock.mockResolvedValue([
      {
        id: "sub_123",
        status: "past_due",
        current_period_start: 1633046400,
        current_period_end: 1635724800,
        cancel_at_period_end: false,
        default_payment_method: {
          card: {
            brand: "visa",
            last4: "4242",
            exp_month: 12,
            exp_year: 2023,
          },
        },
        items: {
          data: [
            {
              price: { id: "price_123", unit_amount: 1000, currency: "usd" },
            },
          ],
        },
      },
    ])

    const result = await getSubscriptions({ stripe, stripeCutomerId })

    expect(listSubscriptionsMock).toHaveBeenCalledWith({
      stripe,
      stripeCutomerId,
    })
    expect(result).toEqual([
      {
        shouldProvideProduct: false,
        hasPastDueSubscription: true,
        externalRef: "sub_123",
        productExternalRef: "price_123",
        currentPeriodStart: new Date(1633046400 * 1000),
        currentPeriodEnd: new Date(1635724800 * 1000),
        paymentMethod: {
          brand: "visa",
          last_digits: "4242",
          expiry: "12/2023",
        },
        amount: 1000,
        currency: "usd",
        cancelAtPeriodEnd: false,
      },
    ])
  })

  it("handles cancellation requested subscriptions", async () => {
    listSubscriptionsMock.mockResolvedValue([
      {
        id: "sub_123",
        status: "active",
        current_period_start: 1633046400,
        current_period_end: 1635724800,
        cancel_at_period_end: false,
        default_payment_method: {
          card: {
            brand: "visa",
            last4: "4242",
            exp_month: 12,
            exp_year: 2023,
          },
        },
        items: {
          data: [
            {
              price: { id: "price_123", unit_amount: 1000, currency: "usd" },
            },
          ],
        },
        cancellation_details: {
          reason: "cancellation_requested",
        },
      },
    ])

    const result = await getSubscriptions({ stripe, stripeCutomerId })

    expect(listSubscriptionsMock).toHaveBeenCalledWith({
      stripe,
      stripeCutomerId,
    })

    expect(result).toMatchObject([
      expect.objectContaining({
        cancelAtPeriodEnd: true,
      }),
    ])
  })
})
