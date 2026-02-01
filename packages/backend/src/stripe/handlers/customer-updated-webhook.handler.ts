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
  eventTypes: [
    "checkout.session.async_payment_succeeded",
    "checkout.session.completed",
    "customer.subscription.created",
    "customer.subscription.deleted",
    "customer.subscription.paused",
    "customer.subscription.pending_update_applied",
    "customer.subscription.pending_update_expired",
    "customer.subscription.resumed",
    "customer.subscription.trial_will_end",
    "customer.subscription.updated",
    "invoice.marked_uncollectible",
    "invoice.paid",
    "invoice.payment_action_required",
    "invoice.payment_failed",
    "invoice.payment_succeeded",
    "invoice.upcoming",
    "payment_intent.canceled",
    "payment_intent.payment_failed",
    "payment_intent.succeeded",
  ],
})
export class CustomerUpdatedWebhookHandler implements StripeWebhookHandlerInterface {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  async handle(
    _event: Stripe.Event,
    context: StripeWebhookContext,
  ): Promise<void> {
    if (!context.stripeCustomer) return

    await this.eventEmitter.emitAsync(
      CustomerUpdatedEvent.eventName,
      new CustomerUpdatedEvent(context.stripeCustomer.customerId, {
        type: "customer.updated",
      }),
    )
  }
}
