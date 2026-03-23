import Stripe from "stripe"
import { cancelSubscriptionImmediately } from "./cancel-subscription-immediately"

jest.mock("stripe")

describe("cancelSubscriptionImmediately client", () => {
  let stripe: jest.Mocked<Stripe>
  const subscriptionId = "sub_12345"

  beforeEach(() => {
    stripe = new Stripe("fake-api-key") as jest.Mocked<Stripe>
    stripe.subscriptions = {
      cancel: jest.fn(),
    } as unknown as Stripe.SubscriptionsResource
  })

  it("should cancel subscription immediately", async () => {
    const mockCancelledSubscription = {
      id: subscriptionId,
      status: "canceled",
      cancel_at_period_end: false,
      canceled_at: Date.now() / 1000,
    } as unknown as Stripe.Subscription

    stripe.subscriptions.cancel = jest
      .fn()
      .mockResolvedValue(mockCancelledSubscription)

    const result = await cancelSubscriptionImmediately({
      stripe,
      subscriptionId,
    })

    expect(stripe.subscriptions.cancel).toHaveBeenCalledWith(subscriptionId)
    expect(result).toEqual(mockCancelledSubscription)
    expect(result.status).toBe("canceled")
  })

  it("should propagate Stripe cancel errors", async () => {
    const cancelError = new Error("Stripe cancel error")

    stripe.subscriptions.cancel = jest.fn().mockRejectedValue(cancelError)

    await expect(
      cancelSubscriptionImmediately({ stripe, subscriptionId }),
    ).rejects.toThrow("Stripe cancel error")

    expect(stripe.subscriptions.cancel).toHaveBeenCalledWith(subscriptionId)
  })

  it("should handle non-existent subscription", async () => {
    const notFoundError = new Error("No such subscription: sub_invalid")
    notFoundError.name = "StripeInvalidRequestError"

    stripe.subscriptions.cancel = jest.fn().mockRejectedValue(notFoundError)

    await expect(
      cancelSubscriptionImmediately({
        stripe,
        subscriptionId: "sub_invalid",
      }),
    ).rejects.toThrow("No such subscription: sub_invalid")

    expect(stripe.subscriptions.cancel).toHaveBeenCalledWith("sub_invalid")
  })

  it("should handle already cancelled subscription", async () => {
    const alreadyCancelledError = new Error(
      "Subscription sub_12345 has already been cancelled",
    )
    alreadyCancelledError.name = "StripeInvalidRequestError"

    stripe.subscriptions.cancel = jest
      .fn()
      .mockRejectedValue(alreadyCancelledError)

    await expect(
      cancelSubscriptionImmediately({ stripe, subscriptionId }),
    ).rejects.toThrow("Subscription sub_12345 has already been cancelled")

    expect(stripe.subscriptions.cancel).toHaveBeenCalledWith(subscriptionId)
  })
})
