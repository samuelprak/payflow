import { Test, TestingModule } from "@nestjs/testing"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { EarlyFraudWarningWebhookHandler } from "./early-fraud-warning-webhook.handler"
import { StripeCustomerRepository } from "src/stripe/repositories/stripe-customer.repository"
import { CustomerUpdatedEvent } from "src/customer/events/customer-updated.event"
import { StripeWebhookContext } from "src/stripe/interfaces/stripe-webhook-handler.interface"
import { StripeCustomer } from "src/stripe/entities/stripe-customer.entity"
import { handleEarlyFraudWarning } from "src/stripe/models/stripe/use-cases/handle-early-fraud-warning"
import { retrieveCharge } from "src/stripe/models/stripe/client/retrieve-charge"
import Stripe from "stripe"

jest.mock("src/stripe/models/stripe/use-cases/handle-early-fraud-warning")
jest.mock("src/stripe/models/stripe/client/retrieve-charge")

const mockHandleEarlyFraudWarning =
  handleEarlyFraudWarning as jest.MockedFunction<typeof handleEarlyFraudWarning>

const mockRetrieveCharge = retrieveCharge as jest.MockedFunction<
  typeof retrieveCharge
>

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

    mockRetrieveCharge.mockResolvedValue({
      id: "ch_123",
      customer: "cus_123",
      refunded: false,
    } as unknown as Stripe.Charge)

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
      })

      await handler.handle(event, mockContext)

      expect(mockRetrieveCharge).toHaveBeenCalledWith({
        stripe: mockContext.stripe,
        chargeId: "ch_123",
      })

      expect(
        stripeCustomerRepository.findOneByStripeCustomerId,
      ).toHaveBeenCalledWith("cus_123")

      expect(mockHandleEarlyFraudWarning).toHaveBeenCalledWith({
        stripe: mockContext.stripe,
        earlyFraudWarning: event.data.object,
        stripeCustomerId: "cus_123",
      })

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
            subscriptionCancellationsFailed: 0,
          },
        }),
      )
    })

    it("should skip non-actionable warning without any Stripe calls", async () => {
      const event = createEvent({ actionable: false })

      await handler.handle(event, mockContext)

      expect(mockRetrieveCharge).not.toHaveBeenCalled()
      expect(mockHandleEarlyFraudWarning).not.toHaveBeenCalled()
      expect(
        stripeCustomerRepository.findOneByStripeCustomerId,
      ).not.toHaveBeenCalled()
      expect(eventEmitter.emitAsync).not.toHaveBeenCalled()
    })

    it("should skip guest checkout when charge has no customer", async () => {
      const event = createEvent()

      mockRetrieveCharge.mockResolvedValue({
        id: "ch_123",
        customer: null,
        refunded: false,
      } as unknown as Stripe.Charge)

      await handler.handle(event, mockContext)

      expect(mockHandleEarlyFraudWarning).not.toHaveBeenCalled()
      expect(
        stripeCustomerRepository.findOneByStripeCustomerId,
      ).not.toHaveBeenCalled()
      expect(eventEmitter.emitAsync).not.toHaveBeenCalled()
    })

    it("should skip when customer not found in our system", async () => {
      const event = createEvent()

      stripeCustomerRepository.findOneByStripeCustomerId.mockResolvedValue(null)

      await handler.handle(event, mockContext)

      expect(
        stripeCustomerRepository.findOneByStripeCustomerId,
      ).toHaveBeenCalledWith("cus_123")
      expect(mockHandleEarlyFraudWarning).not.toHaveBeenCalled()
      expect(eventEmitter.emitAsync).not.toHaveBeenCalled()
    })

    it("should handle charge as object instead of string", async () => {
      const event = createEvent({
        charge: { id: "ch_456" } as unknown as Stripe.Charge,
      })

      mockRetrieveCharge.mockResolvedValue({
        id: "ch_456",
        customer: "cus_123",
        refunded: false,
      } as unknown as Stripe.Charge)

      mockHandleEarlyFraudWarning.mockResolvedValue({
        skipped: false,
        chargeRefunded: true,
        subscriptionsCancelled: 0,
        subscriptionCancellationsFailed: 0,
      })

      await handler.handle(event, mockContext)

      expect(mockRetrieveCharge).toHaveBeenCalledWith({
        stripe: mockContext.stripe,
        chargeId: "ch_456",
      })

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

    it("should log warning on partial subscription cancellation failure", async () => {
      const event = createEvent()
      const loggerWarnSpy = jest.spyOn(handler["logger"], "warn")

      mockHandleEarlyFraudWarning.mockResolvedValue({
        skipped: false,
        chargeRefunded: true,
        subscriptionsCancelled: 2,
        subscriptionCancellationsFailed: 1,
      })

      await handler.handle(event, mockContext)

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        `Partial subscription cancellation failure for customer cust_123`,
        {
          customerId: "cust_123",
          stripeCustomerId: "cus_123",
          fraudWarningId: "issfr_123",
          subscriptionsCancelled: 2,
          subscriptionCancellationsFailed: 1,
        },
      )
    })

    it("should include subscriptionCancellationsFailed in emitted event", async () => {
      const event = createEvent()

      mockHandleEarlyFraudWarning.mockResolvedValue({
        skipped: false,
        chargeRefunded: true,
        subscriptionsCancelled: 2,
        subscriptionCancellationsFailed: 1,
      })

      await handler.handle(event, mockContext)

      expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
        CustomerUpdatedEvent.eventName,
        expect.objectContaining({
          data: expect.objectContaining({
            subscriptionCancellationsFailed: 1,
          }),
        }),
      )
    })
  })
})
