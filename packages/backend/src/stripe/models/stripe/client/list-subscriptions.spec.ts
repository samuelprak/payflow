import { listSubscriptions } from "src/stripe/models/stripe/client/list-subscriptions"
import Stripe from "stripe"

jest.mock("stripe")

describe("listSubscriptions", () => {
  let stripe: jest.Mocked<Stripe>
  let stripeCustomerId: string

  beforeEach(() => {
    stripe = new Stripe("fake-api-key") as jest.Mocked<Stripe>
    stripe.subscriptions = {
      list: jest.fn(),
    } as unknown as Stripe.SubscriptionsResource
    stripeCustomerId = "cus_12345"
  })

  it("should return a list of subscriptions", async () => {
    const mockSubscriptions = [{ id: "sub_12345" }, { id: "sub_67890" }]
    stripe.subscriptions.list = jest
      .fn()
      .mockResolvedValue({ data: mockSubscriptions })

    const response = await listSubscriptions({ stripe, stripeCustomerId })

    expect(stripe.subscriptions.list).toHaveBeenCalledWith({
      customer: stripeCustomerId,
      expand: ["data.default_payment_method"],
      status: "all",
    })
    expect(response).toEqual(mockSubscriptions)
  })
})
