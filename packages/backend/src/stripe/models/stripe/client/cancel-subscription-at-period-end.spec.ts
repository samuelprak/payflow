import Stripe from "stripe"
import { cancelSubscriptionAtPeriodEnd } from "./cancel-subscription-at-period-end"

jest.mock("stripe")

describe("cancelSubscriptionAtPeriodEnd client", () => {
  let stripe: jest.Mocked<Stripe>
  let subscriptionId: string

  beforeEach(() => {
    stripe = new Stripe("fake-api-key") as jest.Mocked<Stripe>
    stripe.subscriptions = {
      update: jest.fn(),
    } as unknown as Stripe.SubscriptionsResource
    subscriptionId = "sub_12345"
  })

  it("should cancel subscription at period end successfully", async () => {
    const mockUpdatedSubscription = {
      id: "sub_12345",
      status: "active",
      cancel_at_period_end: true,
    }

    stripe.subscriptions.update = jest
      .fn()
      .mockResolvedValue(mockUpdatedSubscription)

    await cancelSubscriptionAtPeriodEnd({
      stripe,
      subscriptionId,
      cancelAtPeriodEnd: true,
    })

    expect(stripe.subscriptions.update).toHaveBeenCalledWith("sub_12345", {
      cancel_at_period_end: true,
    })
  })

  it("should resume subscription successfully", async () => {
    const mockUpdatedSubscription = {
      id: "sub_12345",
      status: "active",
      cancel_at_period_end: false,
    }

    stripe.subscriptions.update = jest
      .fn()
      .mockResolvedValue(mockUpdatedSubscription)

    await cancelSubscriptionAtPeriodEnd({
      stripe,
      subscriptionId,
      cancelAtPeriodEnd: false,
    })

    expect(stripe.subscriptions.update).toHaveBeenCalledWith("sub_12345", {
      cancel_at_period_end: false,
    })
  })

  it("should propagate Stripe update errors", async () => {
    const updateError = new Error("Stripe update error")

    stripe.subscriptions.update = jest.fn().mockRejectedValue(updateError)

    await expect(
      cancelSubscriptionAtPeriodEnd({
        stripe,
        subscriptionId,
        cancelAtPeriodEnd: true,
      }),
    ).rejects.toThrow("Stripe update error")

    expect(stripe.subscriptions.update).toHaveBeenCalledWith("sub_12345", {
      cancel_at_period_end: true,
    })
  })

  it("should handle Stripe API errors gracefully", async () => {
    const stripeError = new Error("No such subscription: sub_invalid")
    stripeError.name = "StripeInvalidRequestError"

    stripe.subscriptions.update = jest.fn().mockRejectedValue(stripeError)

    await expect(
      cancelSubscriptionAtPeriodEnd({
        stripe,
        subscriptionId: "sub_invalid",
        cancelAtPeriodEnd: true,
      }),
    ).rejects.toThrow("No such subscription: sub_invalid")

    expect(stripe.subscriptions.update).toHaveBeenCalledWith("sub_invalid", {
      cancel_at_period_end: true,
    })
  })
})
