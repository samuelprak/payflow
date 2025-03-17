import { createBillingPortalSession } from "src/stripe/models/stripe/client/create-billing-portal-session"
import { createPortalSession } from "src/stripe/models/stripe/use-cases/create-portal-session"
import Stripe from "stripe"

jest.mock("../client/create-billing-portal-session", () => ({
  createBillingPortalSession: jest.fn(),
}))
const createBillingPortalSessionMock = createBillingPortalSession as jest.Mock

describe("createPortalSession", () => {
  it("should create a portal session", async () => {
    const stripe = new Stripe("fake-api-key")

    createBillingPortalSessionMock.mockResolvedValue({
      url: "https://example.com/portal",
    })

    const result = await createPortalSession({
      stripe,
      stripeCustomerId: "123",
    })

    expect(result).toEqual({ portalUrl: "https://example.com/portal" })
  })
})
