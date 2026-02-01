import { Test, TestingModule } from "@nestjs/testing"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { EarlyFraudWarningWebhookHandler } from "./early-fraud-warning-webhook.handler"
import { StripeCustomerRepository } from "src/stripe/repositories/stripe-customer.repository"
import { CustomerUpdatedEvent } from "src/customer/events/customer-updated.event"
import { StripeWebhookContext } from "src/stripe/interfaces/stripe-webhook-handler.interface"
import { StripeCustomer } from "src/stripe/entities/stripe-customer.entity"
import { handleEarlyFraudWarning } from "src/stripe/models/stripe/use-cases/handle-early-fraud-warning"
import Stripe from "stripe"

jest.mock("src/stripe/models/stripe/use-cases/handle-early-fraud-warning")

const mockHandleEarlyFraudWarning =
  handleEarlyFraudWarning as jest.MockedFunction<typeof handleEarlyFraudWarning>

describe("EarlyFraudWarningWebhookHandler", () => {
  let handler: EarlyFraudWarningWebhookHandler
  let eventEmitter: jest.Mocked<EventEmitter2>
  let stripeCustomerRepository: jest.Mocked<StripeCustomerRepository>

  const mockStripeCustomer = {
    id: "sc_123",
    customerId: "cust_123",
    stripeCustomerId: "cus_123",
  } as StripeCustomer

  const mockContext: StripeWebhookContext = {
    stripeAccountId: "acc_123",
    stripe: new Stripe("sk_test"),
    stripeCustomer: null,
  }

  const createEvent = (
    overrides: Partial<Stripe.Radar.EarlyFraudWarning> = {},
  ): Stripe.Event =>
    ({
      id: "evt_123",
      type: "radar.early_fraud_warning.created",
      object: "event",
      api_version: "2023-10-16",
      created: Date.now() / 1000,
      livemode: false,
      pending_webhooks: 0,
      request: null,
      data: {
        object: {
          id: "issfr_123",
          object: "radar.early_fraud_warning",
          actionable: true,
          charge: "ch_123",
          created: Date.now() / 1000,
          fraud_type: "unauthorized_use_of_card",
          livemode: false,
          payment_intent: "pi_123",
          ...overrides,
        } as Stripe.Radar.EarlyFraudWarning,
      },
    }) as unknown as Stripe.Event

  beforeEach(async () => {
    jest.clearAllMocks()

    eventEmitter = {
      emitAsync: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<EventEmitter2>

    stripeCustomerRepository = {
      findOneByStripeCustomerId: jest
        .fn()
        .mockResolvedValue(mockStripeCustomer),
    } as unknown as jest.Mocked<StripeCustomerRepository>

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EarlyFraudWarningWebhookHandler,
        {
          provide: EventEmitter2,
          useValue: eventEmitter,
        },
        {
          provide: StripeCustomerRepository,
          useValue: stripeCustomerRepository,
        },
      ],
    }).compile()

    handler = module.get<EarlyFraudWarningWebhookHandler>(
      EarlyFraudWarningWebhookHandler,
    )
  })

  describe("handle", () => {
    it("should process early fraud warning and emit event", async () => {
      const event = createEvent()

      mockHandleEarlyFraudWarning.mockResolvedValue({
        skipped: false,
        chargeRefunded: true,
        subscriptionsCancelled: 2,
        subscriptionCancellationsFailed: 0,
        stripeCustomerId: "cus_123",
      })

      await handler.handle(event, mockContext)

      expect(mockHandleEarlyFraudWarning).toHaveBeenCalledWith({
        stripe: mockContext.stripe,
        earlyFraudWarning: event.data.object,
      })

      expect(
        stripeCustomerRepository.findOneByStripeCustomerId,
      ).toHaveBeenCalledWith("cus_123")

      expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
        CustomerUpdatedEvent.eventName,
        expect.objectContaining({
          customerId: "cust_123",
          data: {
            type: "early_fraud_warning",
            fraudType: "unauthorized_use_of_card",
            chargeId: "ch_123",
            chargeRefunded: true,
            subscriptionsCancelled: 2,
          },
        }),
      )
    })

    it("should skip processing when result is skipped", async () => {
      const event = createEvent({ actionable: false })

      mockHandleEarlyFraudWarning.mockResolvedValue({
        skipped: true,
        skipReason: "Early fraud warning is not actionable",
        chargeRefunded: false,
        subscriptionsCancelled: 0,
        subscriptionCancellationsFailed: 0,
        stripeCustomerId: null,
      })

      await handler.handle(event, mockContext)

      expect(
        stripeCustomerRepository.findOneByStripeCustomerId,
      ).not.toHaveBeenCalled()
      expect(eventEmitter.emitAsync).not.toHaveBeenCalled()
    })

    it("should not emit event when stripeCustomerId is null", async () => {
      const event = createEvent()

      mockHandleEarlyFraudWarning.mockResolvedValue({
        skipped: false,
        chargeRefunded: true,
        subscriptionsCancelled: 0,
        subscriptionCancellationsFailed: 0,
        stripeCustomerId: null,
      })

      await handler.handle(event, mockContext)

      expect(
        stripeCustomerRepository.findOneByStripeCustomerId,
      ).not.toHaveBeenCalled()
      expect(eventEmitter.emitAsync).not.toHaveBeenCalled()
    })

    it("should not emit event when customer is not found in our system", async () => {
      const event = createEvent()

      mockHandleEarlyFraudWarning.mockResolvedValue({
        skipped: false,
        chargeRefunded: true,
        subscriptionsCancelled: 1,
        subscriptionCancellationsFailed: 0,
        stripeCustomerId: "cus_unknown",
      })

      stripeCustomerRepository.findOneByStripeCustomerId.mockResolvedValue(null)

      await handler.handle(event, mockContext)

      expect(
        stripeCustomerRepository.findOneByStripeCustomerId,
      ).toHaveBeenCalledWith("cus_unknown")
      expect(eventEmitter.emitAsync).not.toHaveBeenCalled()
    })

    it("should handle charge as object instead of string", async () => {
      const event = createEvent({
        charge: { id: "ch_456" } as unknown as Stripe.Charge,
      })

      mockHandleEarlyFraudWarning.mockResolvedValue({
        skipped: false,
        chargeRefunded: true,
        subscriptionsCancelled: 0,
        subscriptionCancellationsFailed: 0,
        stripeCustomerId: "cus_123",
      })

      await handler.handle(event, mockContext)

      expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
        CustomerUpdatedEvent.eventName,
        expect.objectContaining({
          data: expect.objectContaining({
            chargeId: "ch_456",
          }),
        }),
      )
    })

    it("should handle radar.early_fraud_warning.updated event", async () => {
      const event = createEvent()
      event.type = "radar.early_fraud_warning.updated"

      mockHandleEarlyFraudWarning.mockResolvedValue({
        skipped: false,
        chargeRefunded: false,
        subscriptionsCancelled: 1,
        subscriptionCancellationsFailed: 0,
        stripeCustomerId: "cus_123",
      })

      await handler.handle(event, mockContext)

      expect(mockHandleEarlyFraudWarning).toHaveBeenCalled()
      expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
        CustomerUpdatedEvent.eventName,
        expect.objectContaining({
          data: expect.objectContaining({
            type: "early_fraud_warning",
            chargeRefunded: false,
          }),
        }),
      )
    })

    it("should propagate errors from handleEarlyFraudWarning", async () => {
      const event = createEvent()

      mockHandleEarlyFraudWarning.mockRejectedValue(
        new Error("Stripe API error"),
      )

      await expect(handler.handle(event, mockContext)).rejects.toThrow(
        "Stripe API error",
      )
    })
  })
})
