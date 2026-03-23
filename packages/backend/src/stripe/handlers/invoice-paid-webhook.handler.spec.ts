import { Test, TestingModule } from "@nestjs/testing"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { InvoicePaidWebhookHandler } from "./invoice-paid-webhook.handler"
import { CustomerUpdatedEvent } from "src/customer/events/customer-updated.event"
import { StripeWebhookContext } from "src/stripe/interfaces/stripe-webhook-handler.interface"
import { StripeCustomer } from "src/stripe/entities/stripe-customer.entity"
import Stripe from "stripe"

describe("InvoicePaidWebhookHandler", () => {
  let handler: InvoicePaidWebhookHandler
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
        InvoicePaidWebhookHandler,
        {
          provide: EventEmitter2,
          useValue: eventEmitter,
        },
      ],
    }).compile()

    handler = module.get<InvoicePaidWebhookHandler>(InvoicePaidWebhookHandler)
  })

  it("should emit CustomerUpdatedEvent with receiptUrl for invoice.paid event", async () => {
    const hostedInvoiceUrl = "https://stripe.com/invoice/123"
    const event = {
      type: "invoice.paid",
      data: {
        object: {
          hosted_invoice_url: hostedInvoiceUrl,
        },
      },
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
        data: {
          type: "invoice.paid",
          receiptUrl: hostedInvoiceUrl,
        },
      }),
    )
  })

  it("should not emit event when stripeCustomer is null", async () => {
    const event = {
      type: "invoice.paid",
      data: {
        object: {
          hosted_invoice_url: "https://stripe.com/invoice/123",
        },
      },
    } as unknown as Stripe.Event

    const context: StripeWebhookContext = {
      stripeAccountId: "acc_123",
      stripe: new Stripe("sk_test"),
      stripeCustomer: null,
    }

    await handler.handle(event, context)

    expect(eventEmitter.emitAsync).not.toHaveBeenCalled()
  })

  it("should not emit event when hosted_invoice_url is null", async () => {
    const event = {
      type: "invoice.paid",
      data: {
        object: {
          hosted_invoice_url: null,
        },
      },
    } as unknown as Stripe.Event

    const context: StripeWebhookContext = {
      stripeAccountId: "acc_123",
      stripe: new Stripe("sk_test"),
      stripeCustomer: mockStripeCustomer,
    }

    await handler.handle(event, context)

    expect(eventEmitter.emitAsync).not.toHaveBeenCalled()
  })

  it("should not emit event when hosted_invoice_url is undefined", async () => {
    const event = {
      type: "invoice.paid",
      data: {
        object: {},
      },
    } as unknown as Stripe.Event

    const context: StripeWebhookContext = {
      stripeAccountId: "acc_123",
      stripe: new Stripe("sk_test"),
      stripeCustomer: mockStripeCustomer,
    }

    await handler.handle(event, context)

    expect(eventEmitter.emitAsync).not.toHaveBeenCalled()
  })
})
