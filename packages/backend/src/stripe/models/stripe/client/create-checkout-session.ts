import { BadRequestException } from "@nestjs/common"
import {
  CheckoutParams,
  CheckoutProduct,
} from "src/payment-provider/interfaces/checkout-params"
import Stripe from "stripe"

type Params = {
  stripe: Stripe
  products: CheckoutProduct[]
  stripeCustomerId: string
}

export async function createCheckoutSession({
  stripe,
  products,
  stripeCustomerId,
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
    success_url: "https://example.com/success",
    mode: recurringMode ? "subscription" : "payment",
    line_items: prices.map((price) => ({
      price: price.id,
      quantity: 1,
    })),
    allow_promotion_codes: true,
  })
}
