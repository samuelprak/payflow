import Stripe from "stripe"

type Params = {
  stripe: Stripe
  stripeCustomerId: string
}

export async function listActiveSubscriptions({
  stripe,
  stripeCustomerId,
}: Params) {
  const subscriptions = await stripe.subscriptions.list({
    customer: stripeCustomerId,
    status: "active",
  })

  return subscriptions.data
}
