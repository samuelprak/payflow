import Stripe from "stripe"

export async function createBillingPortalSession({
  stripe,
  stripeCustomerId,
}: {
  stripe: Stripe
  stripeCustomerId: string
}) {
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: "https://example.com/account",
  })

  return session
}
