import Stripe from "stripe"

export async function createCheckoutSession(stripe: Stripe) {
  await stripe.checkout.sessions.create({
    line_items: [
      {
        price: "price_1MotwRLkdIwHu7ixYcPLm5uZ",
        quantity: 2,
      },
    ],
  })
}
