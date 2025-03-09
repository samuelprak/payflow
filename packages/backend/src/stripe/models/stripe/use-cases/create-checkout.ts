import { Checkout } from "src/payment-provider/interfaces/checkout"
import { CheckoutProduct } from "src/payment-provider/interfaces/checkout-params"
import { StripeCustomer } from "src/stripe/entities/stripe-customer.entity"
import { createCheckoutSession } from "src/stripe/models/stripe/client/create-checkout-session"
import Stripe from "stripe"

type Params = {
  stripe: Stripe
  products: CheckoutProduct[]
  stripeCustomer: StripeCustomer
}

export async function createCheckout({
  stripe,
  products,
  stripeCustomer,
}: Params): Promise<Checkout> {
  const checkout = await createCheckoutSession({
    stripe,
    products,
    stripeCustomerId: stripeCustomer.stripeCustomerId,
  })

  if (!checkout.url) {
    throw new Error("Failed to create checkout session")
  }

  return {
    checkoutUrl: checkout.url,
  }
}
