import Stripe from "stripe"
import { retrieveCharge } from "./retrieve-charge"

jest.mock("stripe")

describe("retrieveCharge client", () => {
  let stripe: jest.Mocked<Stripe>
  const chargeId = "ch_12345"

  beforeEach(() => {
    stripe = new Stripe("fake-api-key") as jest.Mocked<Stripe>
    stripe.charges = {
      retrieve: jest.fn(),
    } as unknown as Stripe.ChargesResource
  })

  it("should retrieve charge successfully", async () => {
    const mockCharge = {
      id: chargeId,
      amount: 1000,
      currency: "usd",
      customer: "cus_12345",
      refunded: false,
    } as Stripe.Charge

    stripe.charges.retrieve = jest.fn().mockResolvedValue(mockCharge)

    const result = await retrieveCharge({ stripe, chargeId })

    expect(stripe.charges.retrieve).toHaveBeenCalledWith(chargeId)
    expect(result).toEqual(mockCharge)
    expect(result.id).toBe(chargeId)
  })

  it("should propagate Stripe retrieve errors", async () => {
    const retrieveError = new Error("Stripe retrieve error")

    stripe.charges.retrieve = jest.fn().mockRejectedValue(retrieveError)

    await expect(retrieveCharge({ stripe, chargeId })).rejects.toThrow(
      "Stripe retrieve error",
    )

    expect(stripe.charges.retrieve).toHaveBeenCalledWith(chargeId)
  })

  it("should handle non-existent charge", async () => {
    const notFoundError = new Error("No such charge: ch_invalid")
    notFoundError.name = "StripeInvalidRequestError"

    stripe.charges.retrieve = jest.fn().mockRejectedValue(notFoundError)

    await expect(
      retrieveCharge({ stripe, chargeId: "ch_invalid" }),
    ).rejects.toThrow("No such charge: ch_invalid")

    expect(stripe.charges.retrieve).toHaveBeenCalledWith("ch_invalid")
  })
})
