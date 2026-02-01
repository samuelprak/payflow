import { Injectable } from "@nestjs/common"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { CustomerUpdatedEvent } from "src/customer/events/customer-updated.event"
import { StripeWebhookHandler } from "src/stripe/decorators/stripe-webhook-handler.decorator"
import {
  StripeWebhookContext,
  StripeWebhookHandlerInterface,
} from "src/stripe/interfaces/stripe-webhook-handler.interface"
import Stripe from "stripe"

@Injectable()
@StripeWebhookHandler({
  eventTypes: ["invoice.paid"],
})
export class InvoicePaidWebhookHandler implements StripeWebhookHandlerInterface {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  async handle(
    event: Stripe.Event,
    context: StripeWebhookContext,
  ): Promise<void> {
    if (!context.stripeCustomer) return

    const invoice = event.data.object as Stripe.Invoice
    const hostedInvoiceUrl = invoice.hosted_invoice_url

    if (!hostedInvoiceUrl) return

    await this.eventEmitter.emitAsync(
      CustomerUpdatedEvent.eventName,
      new CustomerUpdatedEvent(context.stripeCustomer.customerId, {
        type: "invoice.paid",
        receiptUrl: hostedInvoiceUrl,
      }),
    )
  }
}
