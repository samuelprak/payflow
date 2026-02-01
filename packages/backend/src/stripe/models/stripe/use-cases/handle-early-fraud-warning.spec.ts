import Stripe from "stripe"
import { handleEarlyFraudWarning } from "./handle-early-fraud-warning"
import { retrieveCharge } from "../client/retrieve-charge"
import { refundCharge } from "../client/refund-charge"
import { cancelSubscriptionImmediately } from "../client/cancel-subscription-immediately"

jest.mock("../client/retrieve-charge")
jest.mock("../client/refund-charge")
jest.mock("../client/cancel-subscription-immediately")

const mockRetrieveCharge = retrieveCharge as jest.MockedFunction<
  typeof retrieveCharge
>
const mockRefundCharge = refundCharge as jest.MockedFunction<
  typeof refundCharge
>
const mockCancelSubscriptionImmediately =
  cancelSubscriptionImmediately as jest.MockedFunction<
    typeof cancelSubscriptionImmediately
  >

describe("handleEarlyFraudWarning", () => {
  let stripe: jest.Mocked<Stripe>

  beforeEach(() => {
    jest.clearAllMocks()
    stripe = {
      subscriptions: {
        list: jest.fn(),
      },
    } as unknown as jest.Mocked<Stripe>
  })

  const createEarlyFraudWarning = (
    overrides: Partial<Stripe.Radar.EarlyFraudWarning> = {},
  ): Stripe.Radar.EarlyFraudWarning => ({
    id: "issfr_123",
    object: "radar.early_fraud_warning",
    actionable: true,
    charge: "ch_123",
    created: Date.now() / 1000,
    fraud_type: "unauthorized_use_of_card",
    livemode: false,
    payment_intent: "pi_123",
    ...overrides,
  })

  describe("when actionable is false", () => {
    it("should skip processing and return appropriate result", async () => {
      const earlyFraudWarning = createEarlyFraudWarning({ actionable: false })

      const result = await handleEarlyFraudWarning({
        stripe,
        earlyFraudWarning,
      })

      expect(result).toEqual({
        skipped: true,
        skipReason: "Early fraud warning is not actionable",
        chargeRefunded: false,
        subscriptionsCancelled: 0,
        subscriptionCancellationsFailed: 0,
        stripeCustomerId: null,
      })
      expect(mockRetrieveCharge).not.toHaveBeenCalled()
      expect(mockRefundCharge).not.toHaveBeenCalled()
    })
  })

  describe("when charge has no customer", () => {
    it("should skip processing for guest checkout", async () => {
      const earlyFraudWarning = createEarlyFraudWarning()

      mockRetrieveCharge.mockResolvedValue({
        id: "ch_123",
        customer: null,
      } as unknown as Stripe.Charge)

      const result = await handleEarlyFraudWarning({
        stripe,
        earlyFraudWarning,
      })

      expect(result).toEqual({
        skipped: true,
        skipReason: "Charge has no associated customer (guest checkout)",
        chargeRefunded: false,
        subscriptionsCancelled: 0,
        subscriptionCancellationsFailed: 0,
        stripeCustomerId: null,
      })
      expect(mockRefundCharge).not.toHaveBeenCalled()
    })
  })

  describe("when processing a valid fraud warning", () => {
    beforeEach(() => {
      mockRetrieveCharge.mockResolvedValue({
        id: "ch_123",
        customer: "cus_123",
        refunded: false,
      } as unknown as Stripe.Charge)

      mockRefundCharge.mockResolvedValue({
        id: "re_123",
      } as unknown as Stripe.Refund)
    })

    it("should refund charge and cancel active subscriptions", async () => {
      const earlyFraudWarning = createEarlyFraudWarning()

      ;(stripe.subscriptions.list as jest.Mock)
        .mockResolvedValueOnce({
          data: [{ id: "sub_1" }, { id: "sub_2" }],
        })
        .mockResolvedValueOnce({
          data: [],
        })

      mockCancelSubscriptionImmediately.mockResolvedValue({
        id: "sub_1",
        status: "canceled",
      } as unknown as Stripe.Subscription)

      const result = await handleEarlyFraudWarning({
        stripe,
        earlyFraudWarning,
      })

      expect(result).toEqual({
        skipped: false,
        chargeRefunded: true,
        subscriptionsCancelled: 2,
        subscriptionCancellationsFailed: 0,
        stripeCustomerId: "cus_123",
      })

      expect(mockRefundCharge).toHaveBeenCalledWith({
        stripe,
        chargeId: "ch_123",
        reason: "fraudulent",
      })

      expect(mockCancelSubscriptionImmediately).toHaveBeenCalledTimes(2)
      expect(mockCancelSubscriptionImmediately).toHaveBeenCalledWith({
        stripe,
        subscriptionId: "sub_1",
      })
      expect(mockCancelSubscriptionImmediately).toHaveBeenCalledWith({
        stripe,
        subscriptionId: "sub_2",
      })
    })

    it("should cancel trialing subscriptions as well", async () => {
      const earlyFraudWarning = createEarlyFraudWarning()

      ;(stripe.subscriptions.list as jest.Mock)
        .mockResolvedValueOnce({
          data: [{ id: "sub_active" }],
        })
        .mockResolvedValueOnce({
          data: [{ id: "sub_trialing" }],
        })

      mockCancelSubscriptionImmediately.mockResolvedValue({
        id: "sub_1",
        status: "canceled",
      } as unknown as Stripe.Subscription)

      const result = await handleEarlyFraudWarning({
        stripe,
        earlyFraudWarning,
      })

      expect(result.subscriptionsCancelled).toBe(2)
      expect(mockCancelSubscriptionImmediately).toHaveBeenCalledWith({
        stripe,
        subscriptionId: "sub_active",
      })
      expect(mockCancelSubscriptionImmediately).toHaveBeenCalledWith({
        stripe,
        subscriptionId: "sub_trialing",
      })
    })

    it("should handle no active subscriptions", async () => {
      const earlyFraudWarning = createEarlyFraudWarning()

      ;(stripe.subscriptions.list as jest.Mock)
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: [] })

      const result = await handleEarlyFraudWarning({
        stripe,
        earlyFraudWarning,
      })

      expect(result).toEqual({
        skipped: false,
        chargeRefunded: true,
        subscriptionsCancelled: 0,
        subscriptionCancellationsFailed: 0,
        stripeCustomerId: "cus_123",
      })

      expect(mockCancelSubscriptionImmediately).not.toHaveBeenCalled()
    })

    it("should handle already refunded charge", async () => {
      mockRetrieveCharge.mockResolvedValue({
        id: "ch_123",
        customer: "cus_123",
        refunded: true,
      } as unknown as Stripe.Charge)

      const earlyFraudWarning = createEarlyFraudWarning()

      ;(stripe.subscriptions.list as jest.Mock)
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: [] })

      const result = await handleEarlyFraudWarning({
        stripe,
        earlyFraudWarning,
      })

      expect(result.chargeRefunded).toBe(false)
      expect(mockRefundCharge).not.toHaveBeenCalled()
    })

    it("should handle refund error for already refunded charge gracefully", async () => {
      const earlyFraudWarning = createEarlyFraudWarning()

      mockRefundCharge.mockRejectedValue(
        new Error("Charge ch_123 has already been refunded"),
      )
      ;(stripe.subscriptions.list as jest.Mock)
        .mockResolvedValueOnce({ data: [{ id: "sub_1" }] })
        .mockResolvedValueOnce({ data: [] })

      mockCancelSubscriptionImmediately.mockResolvedValue({
        id: "sub_1",
        status: "canceled",
      } as unknown as Stripe.Subscription)

      const result = await handleEarlyFraudWarning({
        stripe,
        earlyFraudWarning,
      })

      expect(result.chargeRefunded).toBe(false)
      expect(result.subscriptionsCancelled).toBe(1)
    })

    it("should propagate unexpected refund errors", async () => {
      const earlyFraudWarning = createEarlyFraudWarning()

      mockRefundCharge.mockRejectedValue(new Error("Unexpected Stripe error"))

      await expect(
        handleEarlyFraudWarning({ stripe, earlyFraudWarning }),
      ).rejects.toThrow("Unexpected Stripe error")
    })

    it("should continue cancelling subscriptions even if one fails", async () => {
      const earlyFraudWarning = createEarlyFraudWarning()

      ;(stripe.subscriptions.list as jest.Mock)
        .mockResolvedValueOnce({
          data: [{ id: "sub_1" }, { id: "sub_2" }, { id: "sub_3" }],
        })
        .mockResolvedValueOnce({ data: [] })

      mockCancelSubscriptionImmediately
        .mockResolvedValueOnce({
          id: "sub_1",
          status: "canceled",
        } as unknown as Stripe.Subscription)
        .mockRejectedValueOnce(new Error("Failed to cancel sub_2"))
        .mockResolvedValueOnce({
          id: "sub_3",
          status: "canceled",
        } as unknown as Stripe.Subscription)

      const result = await handleEarlyFraudWarning({
        stripe,
        earlyFraudWarning,
      })

      expect(result.subscriptionsCancelled).toBe(2)
      expect(result.subscriptionCancellationsFailed).toBe(1)
      expect(mockCancelSubscriptionImmediately).toHaveBeenCalledTimes(3)
    })

    it("should handle charge object instead of string", async () => {
      const earlyFraudWarning = createEarlyFraudWarning({
        charge: { id: "ch_456" } as unknown as Stripe.Charge,
      })

      ;(stripe.subscriptions.list as jest.Mock)
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: [] })

      await handleEarlyFraudWarning({ stripe, earlyFraudWarning })

      expect(mockRetrieveCharge).toHaveBeenCalledWith({
        stripe,
        chargeId: "ch_456",
      })
    })

    it("should handle customer object instead of string", async () => {
      mockRetrieveCharge.mockResolvedValue({
        id: "ch_123",
        customer: { id: "cus_789" } as Stripe.Customer,
        refunded: false,
      } as unknown as Stripe.Charge)

      const earlyFraudWarning = createEarlyFraudWarning()

      ;(stripe.subscriptions.list as jest.Mock)
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: [] })

      const result = await handleEarlyFraudWarning({
        stripe,
        earlyFraudWarning,
      })

      expect(result.stripeCustomerId).toBe("cus_789")
    })
  })
})
