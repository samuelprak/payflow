import Stripe from "stripe"

type Params = {
  stripe: Stripe
  subscriptionId: string
  items: Array<
    { price: string; quantity: number } | { id: string; deleted: boolean }
  >
}

export async function updateSubscription({
  stripe,
  subscriptionId,
  items,
}: Params) {
  await stripe.subscriptions.update(subscriptionId, {
    items,
    proration_behavior: "create_prorations",
  })
}
