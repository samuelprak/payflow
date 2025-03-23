import { BaseCheckoutSession } from "src/payment-provider/interfaces/base-checkout-session"
import { CheckoutSessionProduct } from "src/payment-provider/interfaces/checkout-session-params"
import { StripeCustomer } from "src/stripe/entities/stripe-customer.entity"
import { createCheckoutSession } from "src/stripe/models/stripe/client/create-checkout-session"
import Stripe from "stripe"

type Params = {
  stripe: Stripe
  products: CheckoutSessionProduct[]
  stripeCustomer: StripeCustomer
  successUrl?: string
  cancelUrl?: string
}

export async function createCheckout({
  stripe,
  products,
  stripeCustomer,
  successUrl,
  cancelUrl,
}: Params): Promise<BaseCheckoutSession> {
  const checkout = await createCheckoutSession({
    stripe,
    products,
    stripeCustomerId: stripeCustomer.stripeCustomerId,
    successUrl,
    cancelUrl,
  })

  if (!checkout.url) {
    throw new Error("Failed to create checkout session")
  }

  return {
    checkoutUrl: checkout.url,
  }
}
