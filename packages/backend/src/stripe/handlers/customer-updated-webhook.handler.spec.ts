import { Test, TestingModule } from "@nestjs/testing"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { CustomerUpdatedWebhookHandler } from "./customer-updated-webhook.handler"
import { CustomerUpdatedEvent } from "src/customer/events/customer-updated.event"
import { StripeWebhookContext } from "src/stripe/interfaces/stripe-webhook-handler.interface"
import { StripeCustomer } from "src/stripe/entities/stripe-customer.entity"
import Stripe from "stripe"

describe("CustomerUpdatedWebhookHandler", () => {
  let handler: CustomerUpdatedWebhookHandler
  let eventEmitter: jest.Mocked<EventEmitter2>

  const mockStripeCustomer = {
    id: "sc_123",
    customerId: "cust_123",
    stripeCustomerId: "cus_123",
  } as StripeCustomer

  beforeEach(async () => {
    eventEmitter = {
      emitAsync: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<EventEmitter2>

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerUpdatedWebhookHandler,
        {
          provide: EventEmitter2,
          useValue: eventEmitter,
        },
      ],
    }).compile()

    handler = module.get<CustomerUpdatedWebhookHandler>(
      CustomerUpdatedWebhookHandler,
    )
  })

  it("should emit CustomerUpdatedEvent when stripeCustomer is present", async () => {
    const event = {
      type: "customer.subscription.updated",
      data: { object: {} },
    } as unknown as Stripe.Event

    const context: StripeWebhookContext = {
      stripeAccountId: "acc_123",
      stripe: new Stripe("sk_test"),
      stripeCustomer: mockStripeCustomer,
    }

    await handler.handle(event, context)

    expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
      CustomerUpdatedEvent.eventName,
      expect.objectContaining({
        customerId: "cust_123",
        data: { type: "customer.updated" },
      }),
    )
  })

  it("should not emit event when stripeCustomer is null", async () => {
    const event = {
      type: "customer.subscription.updated",
      data: { object: {} },
    } as unknown as Stripe.Event

    const context: StripeWebhookContext = {
      stripeAccountId: "acc_123",
      stripe: new Stripe("sk_test"),
      stripeCustomer: null,
    }

    await handler.handle(event, context)

    expect(eventEmitter.emitAsync).not.toHaveBeenCalled()
  })

  it("should handle various event types", async () => {
    const eventTypes = [
      "checkout.session.completed",
      "customer.subscription.created",
      "invoice.paid",
      "payment_intent.succeeded",
    ]

    const context: StripeWebhookContext = {
      stripeAccountId: "acc_123",
      stripe: new Stripe("sk_test"),
      stripeCustomer: mockStripeCustomer,
    }

    for (const eventType of eventTypes) {
      const event = {
        type: eventType,
        data: { object: {} },
      } as unknown as Stripe.Event

      await handler.handle(event, context)
    }

    expect(eventEmitter.emitAsync).toHaveBeenCalledTimes(eventTypes.length)
  })
})
