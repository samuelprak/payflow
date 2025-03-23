import { BadRequestException } from "@nestjs/common"
import { CheckoutSessionProduct } from "src/payment-provider/interfaces/checkout-session-params"
import Stripe from "stripe"

type Params = {
  stripe: Stripe
  products: CheckoutSessionProduct[]
  stripeCustomerId: string
  successUrl?: string
  cancelUrl?: string
}

export async function createCheckoutSession({
  stripe,
  products,
  stripeCustomerId,
  successUrl,
  cancelUrl,
}: Params) {
  const priceIds = products.map((product) => product.externalRef)
  const prices = await Promise.all(
    priceIds.map((id) => stripe.prices.retrieve(id)),
  ).catch(() => {
    throw new BadRequestException("Failed to retrieve prices from Stripe")
  })

  const recurringMode = prices.some((price) => price.type === "recurring")

  return stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    success_url: successUrl,
    cancel_url: cancelUrl,
    mode: recurringMode ? "subscription" : "payment",
    line_items: prices.map((price) => ({
      price: price.id,
      quantity: 1,
    })),
    allow_promotion_codes: true,
    automatic_tax: { enabled: true },
    customer_update: {
      address: "auto",
    },
  })
}
