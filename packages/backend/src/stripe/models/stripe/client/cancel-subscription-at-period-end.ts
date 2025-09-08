import Stripe from "stripe"

type Params = {
  stripe: Stripe
  subscriptionId: string
  cancelAtPeriodEnd: boolean
}

export async function cancelSubscriptionAtPeriodEnd({
  stripe,
  subscriptionId,
  cancelAtPeriodEnd,
}: Params) {
  await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: cancelAtPeriodEnd,
  })
}
