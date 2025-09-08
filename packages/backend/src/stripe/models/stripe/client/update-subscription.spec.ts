import Stripe from "stripe"
import { updateSubscription } from "./update-subscription"

jest.mock("stripe")

describe("updateSubscription client", () => {
  let stripe: jest.Mocked<Stripe>
  let subscriptionId: string
  let items: Array<
    { price: string; quantity: number } | { id: string; deleted: boolean }
  >

  beforeEach(() => {
    stripe = new Stripe("fake-api-key") as jest.Mocked<Stripe>
    stripe.subscriptions = {
      update: jest.fn(),
    } as unknown as Stripe.SubscriptionsResource
    subscriptionId = "sub_12345"
    items = [
      { id: "si_existing_1", deleted: true },
      { price: "price_123", quantity: 1 },
    ]
  })

  it("should update subscription successfully", async () => {
    const mockUpdatedSubscription = {
      id: "sub_12345",
      status: "active",
    }

    stripe.subscriptions.update = jest
      .fn()
      .mockResolvedValue(mockUpdatedSubscription)

    await updateSubscription({
      stripe,
      subscriptionId,
      items,
    })

    expect(stripe.subscriptions.update).toHaveBeenCalledWith("sub_12345", {
      items: [
        { id: "si_existing_1", deleted: true },
        { price: "price_123", quantity: 1 },
      ],
      proration_behavior: "create_prorations",
    })
  })

  it("should handle multiple items", async () => {
    const multipleItems = [
      { id: "si_existing_1", deleted: true },
      { id: "si_existing_2", deleted: true },
      { price: "price_123", quantity: 2 },
      { price: "price_456", quantity: 1 },
    ]
    const mockUpdatedSubscription = {
      id: "sub_12345",
      status: "active",
    }

    stripe.subscriptions.update = jest
      .fn()
      .mockResolvedValue(mockUpdatedSubscription)

    await updateSubscription({
      stripe,
      subscriptionId,
      items: multipleItems,
    })

    expect(stripe.subscriptions.update).toHaveBeenCalledWith("sub_12345", {
      items: [
        { id: "si_existing_1", deleted: true },
        { id: "si_existing_2", deleted: true },
        { price: "price_123", quantity: 2 },
        { price: "price_456", quantity: 1 },
      ],
      proration_behavior: "create_prorations",
    })
  })

  it("should handle subscription with only new items", async () => {
    const newItemsOnly = [{ price: "price_123", quantity: 1 }]
    const mockUpdatedSubscription = {
      id: "sub_12345",
      status: "active",
    }

    stripe.subscriptions.update = jest
      .fn()
      .mockResolvedValue(mockUpdatedSubscription)

    await updateSubscription({
      stripe,
      subscriptionId,
      items: newItemsOnly,
    })

    expect(stripe.subscriptions.update).toHaveBeenCalledWith("sub_12345", {
      items: [{ price: "price_123", quantity: 1 }],
      proration_behavior: "create_prorations",
    })
  })

  it("should propagate Stripe update errors", async () => {
    const updateError = new Error("Stripe update error")

    stripe.subscriptions.update = jest.fn().mockRejectedValue(updateError)

    await expect(
      updateSubscription({
        stripe,
        subscriptionId,
        items,
      }),
    ).rejects.toThrow("Stripe update error")

    expect(stripe.subscriptions.update).toHaveBeenCalledWith("sub_12345", {
      items: [
        { id: "si_existing_1", deleted: true },
        { price: "price_123", quantity: 1 },
      ],
      proration_behavior: "create_prorations",
    })
  })
})
