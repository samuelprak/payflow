import { ForbiddenException, Injectable } from "@nestjs/common"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { CustomerUpdatedEvent } from "src/customer/events/customer-updated.event"
import { webhooksConstructEvent } from "src/stripe/models/stripe/client/webhooks-construct-event"
import { StripeAccountRepository } from "src/stripe/repositories/stripe-account.repository"
import { StripeCustomerRepository } from "src/stripe/repositories/stripe-customer.repository"
import Stripe from "stripe"

const ALLOWED_EVENTS: Stripe.Event.Type[] = [
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
]

@Injectable()
export class StripeWebhookService {
  constructor(
    private readonly stripeAccountRepository: StripeAccountRepository,
    private readonly stripeCustomerRepository: StripeCustomerRepository,
    private eventEmitter: EventEmitter2,
  ) {}

  async handleWebhook(
    stripeAccountId: string,
    signature: string,
    rawBody: Buffer,
  ) {
    const stripeAccount =
      await this.stripeAccountRepository.findOneById(stripeAccountId)
    const stripe = new Stripe(stripeAccount.stripeSecretKey)

    try {
      const event = webhooksConstructEvent(
        stripe,
        rawBody,
        signature,
        stripeAccount.stripeWebhookSecret,
      )
      await this.processEvent(event)
    } catch (error) {
      throw new ForbiddenException("Invalid webhook signature")
    }
  }

  private async processEvent(event: Stripe.Event) {
    if (!ALLOWED_EVENTS.includes(event.type)) return

    const { customer: stripeCustomerId } = event?.data?.object as {
      customer: string
    }
    const stripeCustomer =
      await this.stripeCustomerRepository.findOneByStripeCustomerId(
        stripeCustomerId,
      )

    if (!stripeCustomer) return

    await this.eventEmitter.emitAsync(
      CustomerUpdatedEvent.eventName,
      new CustomerUpdatedEvent(stripeCustomer.customerId, {
        type: "customer.updated",
      }),
    )

    if (event.type === "invoice.paid") {
      const { hosted_invoice_url } = event.data.object

      if (hosted_invoice_url) {
        await this.eventEmitter.emitAsync(
          CustomerUpdatedEvent.eventName,
          new CustomerUpdatedEvent(stripeCustomer.customerId, {
            type: "invoice.paid",
            receiptUrl: hosted_invoice_url,
          }),
        )
      }
    }
  }
}
