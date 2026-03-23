import Stripe from "stripe"

type Params = {
  stripe: Stripe
  subscriptionId: string
}

export async function cancelSubscriptionImmediately({
  stripe,
  subscriptionId,
}: Params): Promise<Stripe.Subscription> {
  return stripe.subscriptions.cancel(subscriptionId)
}
