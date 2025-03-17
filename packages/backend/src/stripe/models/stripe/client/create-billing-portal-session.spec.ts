import { createBillingPortalSession } from "src/stripe/models/stripe/client/create-billing-portal-session"
import Stripe from "stripe"

jest.mock("stripe")

describe("createBillingPortalSession", () => {
  it("should create a billing portal session", async () => {
    const stripe = new Stripe("fake-api-key") as jest.Mocked<Stripe>
    stripe.billingPortal = {
      sessions: {
        create: jest
          .fn()
          .mockResolvedValue({ url: "https://example.com/portal" }),
      } as unknown as Stripe.BillingPortal.SessionsResource,
      configurations:
        {} as unknown as Stripe.BillingPortal.ConfigurationsResource,
    }
    const stripeCustomerId = "cus_123"

    const session = await createBillingPortalSession({
      stripe,
      stripeCustomerId,
    })

    expect(session).toEqual({
      url: "https://example.com/portal",
    })
  })
})
