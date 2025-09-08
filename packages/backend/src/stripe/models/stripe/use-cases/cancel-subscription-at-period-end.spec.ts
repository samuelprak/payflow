import { UnprocessableEntityException } from "@nestjs/common"
import * as cancelStripeSubscriptionAtPeriodEndModule from "src/stripe/models/stripe/client/cancel-subscription-at-period-end"
import * as listActiveSubscriptionsModule from "src/stripe/models/stripe/client/list-active-subscriptions"
import Stripe from "stripe"
import { cancelSubscriptionAtPeriodEnd } from "./cancel-subscription-at-period-end"

jest.mock("src/stripe/models/stripe/client/list-active-subscriptions")
jest.mock("src/stripe/models/stripe/client/cancel-subscription-at-period-end")

describe("cancelSubscriptionAtPeriodEnd use case", () => {
  let stripe: jest.Mocked<Stripe>
  let stripeCustomerId: string
  let mockListActiveSubscriptions: jest.MockedFunction<
    typeof listActiveSubscriptionsModule.listActiveSubscriptions
  >
  let mockCancelStripeSubscriptionAtPeriodEnd: jest.MockedFunction<
    typeof cancelStripeSubscriptionAtPeriodEndModule.cancelSubscriptionAtPeriodEnd
  >

  beforeEach(() => {
    stripe = new Stripe("fake-api-key") as jest.Mocked<Stripe>
    stripeCustomerId = "cus_12345"
    mockListActiveSubscriptions = jest.mocked(
      listActiveSubscriptionsModule.listActiveSubscriptions,
    )
    mockCancelStripeSubscriptionAtPeriodEnd = jest.mocked(
      cancelStripeSubscriptionAtPeriodEndModule.cancelSubscriptionAtPeriodEnd,
    )
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe("successful cancellation", () => {
    it("should call cancelStripeSubscriptionAtPeriodEnd with correct parameters for cancellation", async () => {
      const mockSubscription = {
        id: "sub_12345",
        status: "active",
      } as Stripe.Subscription

      mockListActiveSubscriptions.mockResolvedValue([mockSubscription])
      mockCancelStripeSubscriptionAtPeriodEnd.mockResolvedValue(undefined)

      await cancelSubscriptionAtPeriodEnd({
        stripe,
        stripeCustomerId,
        cancelAtPeriodEnd: true,
      })

      expect(mockListActiveSubscriptions).toHaveBeenCalledWith({
        stripe,
        stripeCustomerId,
      })

      expect(mockCancelStripeSubscriptionAtPeriodEnd).toHaveBeenCalledWith({
        stripe,
        subscriptionId: "sub_12345",
        cancelAtPeriodEnd: true,
      })
    })

    it("should call cancelStripeSubscriptionAtPeriodEnd with correct parameters for resumption", async () => {
      const mockSubscription = {
        id: "sub_67890",
        status: "active",
      } as Stripe.Subscription

      mockListActiveSubscriptions.mockResolvedValue([mockSubscription])
      mockCancelStripeSubscriptionAtPeriodEnd.mockResolvedValue(undefined)

      await cancelSubscriptionAtPeriodEnd({
        stripe,
        stripeCustomerId,
        cancelAtPeriodEnd: false,
      })

      expect(mockListActiveSubscriptions).toHaveBeenCalledWith({
        stripe,
        stripeCustomerId,
      })

      expect(mockCancelStripeSubscriptionAtPeriodEnd).toHaveBeenCalledWith({
        stripe,
        subscriptionId: "sub_67890",
        cancelAtPeriodEnd: false,
      })
    })
  })

  describe("error cases", () => {
    it("should throw UnprocessableEntityException when no active subscriptions found", async () => {
      mockListActiveSubscriptions.mockResolvedValue([])

      await expect(
        cancelSubscriptionAtPeriodEnd({
          stripe,
          stripeCustomerId,
          cancelAtPeriodEnd: true,
        }),
      ).rejects.toThrow(
        new UnprocessableEntityException(
          "No active subscription found for customer",
        ),
      )

      expect(mockCancelStripeSubscriptionAtPeriodEnd).not.toHaveBeenCalled()
    })

    it("should throw UnprocessableEntityException when multiple active subscriptions found", async () => {
      const mockSubscriptions = [
        { id: "sub_1", status: "active" } as Stripe.Subscription,
        { id: "sub_2", status: "active" } as Stripe.Subscription,
      ]

      mockListActiveSubscriptions.mockResolvedValue(mockSubscriptions)

      await expect(
        cancelSubscriptionAtPeriodEnd({
          stripe,
          stripeCustomerId,
          cancelAtPeriodEnd: true,
        }),
      ).rejects.toThrow(
        new UnprocessableEntityException(
          "Multiple active subscriptions found for customer",
        ),
      )

      expect(mockCancelStripeSubscriptionAtPeriodEnd).not.toHaveBeenCalled()
    })

    it("should propagate errors from listActiveSubscriptions", async () => {
      const listError = new Error("Failed to list subscriptions")
      mockListActiveSubscriptions.mockRejectedValue(listError)

      await expect(
        cancelSubscriptionAtPeriodEnd({
          stripe,
          stripeCustomerId,
          cancelAtPeriodEnd: true,
        }),
      ).rejects.toThrow("Failed to list subscriptions")

      expect(mockCancelStripeSubscriptionAtPeriodEnd).not.toHaveBeenCalled()
    })

    it("should propagate errors from cancelStripeSubscriptionAtPeriodEnd", async () => {
      const mockSubscription = {
        id: "sub_12345",
        status: "active",
      } as Stripe.Subscription

      const cancelError = new Error("Failed to cancel subscription")

      mockListActiveSubscriptions.mockResolvedValue([mockSubscription])
      mockCancelStripeSubscriptionAtPeriodEnd.mockRejectedValue(cancelError)

      await expect(
        cancelSubscriptionAtPeriodEnd({
          stripe,
          stripeCustomerId,
          cancelAtPeriodEnd: true,
        }),
      ).rejects.toThrow("Failed to cancel subscription")

      expect(mockListActiveSubscriptions).toHaveBeenCalledWith({
        stripe,
        stripeCustomerId,
      })
      expect(mockCancelStripeSubscriptionAtPeriodEnd).toHaveBeenCalledWith({
        stripe,
        subscriptionId: "sub_12345",
        cancelAtPeriodEnd: true,
      })
    })
  })
})
