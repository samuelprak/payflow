import Stripe from "stripe"

export function webhooksConstructEvent(
  stripe: Stripe,
  payload: Buffer,
  signature: string,
  webhookSecret: string,
): Stripe.Event {
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret)
}
