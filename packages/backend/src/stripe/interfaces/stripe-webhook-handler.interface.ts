import { StripeCustomer } from "src/stripe/entities/stripe-customer.entity"
import Stripe from "stripe"

export interface StripeWebhookContext {
  stripeAccountId: string
  stripe: Stripe
  stripeCustomer: StripeCustomer | null
}

export interface StripeWebhookHandlerInterface {
  handle(event: Stripe.Event, context: StripeWebhookContext): Promise<void>
}
