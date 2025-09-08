import { UnprocessableEntityException } from "@nestjs/common"
import { SubscriptionUpdateProduct } from "src/payment-provider/interfaces/subscription-update-params"
import * as updateStripeSubscriptionModule from "src/stripe/models/stripe/client/update-subscription"
import * as listActiveSubscriptionsModule from "src/stripe/models/stripe/client/list-active-subscriptions"
import Stripe from "stripe"
import { updateSubscription } from "./update-subscription"

jest.mock("src/stripe/models/stripe/client/list-active-subscriptions")
jest.mock("src/stripe/models/stripe/client/update-subscription")

describe("updateSubscription use case", () => {
  let stripe: jest.Mocked<Stripe>
  let stripeCustomerId: string
  let products: SubscriptionUpdateProduct[]
  let mockListActiveSubscriptions: jest.MockedFunction<
    typeof listActiveSubscriptionsModule.listActiveSubscriptions
  >
  let mockUpdateStripeSubscription: jest.MockedFunction<
    typeof updateStripeSubscriptionModule.updateSubscription
  >

  beforeEach(() => {
    stripe = new Stripe("fake-api-key") as jest.Mocked<Stripe>
    stripeCustomerId = "cus_12345"
    products = [
      {
        externalRef: "price_123",
        quantity: 1,
      },
    ]
    mockListActiveSubscriptions = jest.mocked(
      listActiveSubscriptionsModule.listActiveSubscriptions,
    )
    mockUpdateStripeSubscription = jest.mocked(
      updateStripeSubscriptionModule.updateSubscription,
    )
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe("successful update", () => {
    it("should call updateStripeSubscription with correct parameters", async () => {
      const mockSubscription = {
        id: "sub_12345",
        items: {
          data: [{ id: "si_existing_1" }],
        },
      } as Stripe.Subscription

      mockListActiveSubscriptions.mockResolvedValue([mockSubscription])
      mockUpdateStripeSubscription.mockResolvedValue(undefined)

      await updateSubscription({
        stripe,
        products,
        stripeCustomerId,
      })

      expect(mockListActiveSubscriptions).toHaveBeenCalledWith({
        stripe,
        stripeCustomerId,
      })

      expect(mockUpdateStripeSubscription).toHaveBeenCalledWith({
        stripe,
        subscriptionId: "sub_12345",
        items: [
          { id: "si_existing_1", deleted: true },
          { price: "price_123", quantity: 1 },
        ],
      })
    })

    it("should handle multiple existing items", async () => {
      const mockSubscription = {
        id: "sub_67890",
        items: {
          data: [{ id: "si_existing_1" }, { id: "si_existing_2" }],
        },
      } as Stripe.Subscription

      const multipleProducts = [
        { externalRef: "price_123", quantity: 1 },
        { externalRef: "price_456", quantity: 2 },
      ]

      mockListActiveSubscriptions.mockResolvedValue([mockSubscription])
      mockUpdateStripeSubscription.mockResolvedValue(undefined)

      await updateSubscription({
        stripe,
        products: multipleProducts,
        stripeCustomerId,
      })

      expect(mockUpdateStripeSubscription).toHaveBeenCalledWith({
        stripe,
        subscriptionId: "sub_67890",
        items: [
          { id: "si_existing_1", deleted: true },
          { id: "si_existing_2", deleted: true },
          { price: "price_123", quantity: 1 },
          { price: "price_456", quantity: 2 },
        ],
      })
    })
  })

  describe("error cases", () => {
    it("should throw UnprocessableEntityException when no active subscriptions found", async () => {
      mockListActiveSubscriptions.mockResolvedValue([])

      await expect(
        updateSubscription({
          stripe,
          products,
          stripeCustomerId,
        }),
      ).rejects.toThrow(
        new UnprocessableEntityException(
          "No active subscription found for customer",
        ),
      )

      expect(mockUpdateStripeSubscription).not.toHaveBeenCalled()
    })

    it("should throw UnprocessableEntityException when multiple active subscriptions found", async () => {
      const mockSubscriptions = [
        { id: "sub_1" } as Stripe.Subscription,
        { id: "sub_2" } as Stripe.Subscription,
      ]

      mockListActiveSubscriptions.mockResolvedValue(mockSubscriptions)

      await expect(
        updateSubscription({
          stripe,
          products,
          stripeCustomerId,
        }),
      ).rejects.toThrow(
        new UnprocessableEntityException(
          "Multiple active subscriptions found for customer",
        ),
      )

      expect(mockUpdateStripeSubscription).not.toHaveBeenCalled()
    })
  })
})
