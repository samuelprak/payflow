import Stripe from "stripe"

type Params = {
  stripe: Stripe
  stripeCustomerId: string
  returnUrl: string
}

export async function createBillingPortalSession({
  stripe,
  stripeCustomerId,
  returnUrl,
}: Params) {
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: returnUrl,
  })

  return session
}
