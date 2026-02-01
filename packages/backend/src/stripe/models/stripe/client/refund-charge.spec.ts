import Stripe from "stripe"
import { refundCharge } from "./refund-charge"

jest.mock("stripe")

describe("refundCharge client", () => {
  let stripe: jest.Mocked<Stripe>
  const chargeId = "ch_12345"

  beforeEach(() => {
    stripe = new Stripe("fake-api-key") as jest.Mocked<Stripe>
    stripe.refunds = {
      create: jest.fn(),
    } as unknown as Stripe.RefundsResource
  })

  it("should refund charge with fraudulent reason successfully", async () => {
    const mockRefund = {
      id: "re_12345",
      charge: chargeId,
      amount: 1000,
      reason: "fraudulent",
      status: "succeeded",
    } as unknown as Stripe.Refund

    stripe.refunds.create = jest.fn().mockResolvedValue(mockRefund)

    const result = await refundCharge({
      stripe,
      chargeId,
      reason: "fraudulent",
    })

    expect(stripe.refunds.create).toHaveBeenCalledWith({
      charge: chargeId,
      reason: "fraudulent",
    })
    expect(result).toEqual(mockRefund)
    expect(result.reason).toBe("fraudulent")
  })

  it("should refund charge with duplicate reason successfully", async () => {
    const mockRefund = {
      id: "re_12345",
      charge: chargeId,
      amount: 1000,
      reason: "duplicate",
      status: "succeeded",
    } as unknown as Stripe.Refund

    stripe.refunds.create = jest.fn().mockResolvedValue(mockRefund)

    const result = await refundCharge({
      stripe,
      chargeId,
      reason: "duplicate",
    })

    expect(stripe.refunds.create).toHaveBeenCalledWith({
      charge: chargeId,
      reason: "duplicate",
    })
    expect(result.reason).toBe("duplicate")
  })

  it("should refund charge with requested_by_customer reason successfully", async () => {
    const mockRefund = {
      id: "re_12345",
      charge: chargeId,
      amount: 1000,
      reason: "requested_by_customer",
      status: "succeeded",
    } as unknown as Stripe.Refund

    stripe.refunds.create = jest.fn().mockResolvedValue(mockRefund)

    const result = await refundCharge({
      stripe,
      chargeId,
      reason: "requested_by_customer",
    })

    expect(stripe.refunds.create).toHaveBeenCalledWith({
      charge: chargeId,
      reason: "requested_by_customer",
    })
    expect(result.reason).toBe("requested_by_customer")
  })

  it("should propagate Stripe refund errors", async () => {
    const refundError = new Error("Stripe refund error")

    stripe.refunds.create = jest.fn().mockRejectedValue(refundError)

    await expect(
      refundCharge({ stripe, chargeId, reason: "fraudulent" }),
    ).rejects.toThrow("Stripe refund error")

    expect(stripe.refunds.create).toHaveBeenCalledWith({
      charge: chargeId,
      reason: "fraudulent",
    })
  })

  it("should handle already refunded charge", async () => {
    const alreadyRefundedError = new Error(
      "Charge ch_12345 has already been refunded",
    )
    alreadyRefundedError.name = "StripeInvalidRequestError"

    stripe.refunds.create = jest.fn().mockRejectedValue(alreadyRefundedError)

    await expect(
      refundCharge({ stripe, chargeId, reason: "fraudulent" }),
    ).rejects.toThrow("Charge ch_12345 has already been refunded")

    expect(stripe.refunds.create).toHaveBeenCalledWith({
      charge: chargeId,
      reason: "fraudulent",
    })
  })
})
