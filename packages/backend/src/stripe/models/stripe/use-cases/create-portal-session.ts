import { BasePortalSession } from "src/payment-provider/interfaces/base-portal-session"
import { createBillingPortalSession } from "src/stripe/models/stripe/client/create-billing-portal-session"
import Stripe from "stripe"

type Params = {
  stripe: Stripe
  stripeCustomerId: string
  returnUrl: string
}

export async function createPortalSession({
  stripe,
  stripeCustomerId,
  returnUrl,
}: Params): Promise<BasePortalSession> {
  const stripePortal = await createBillingPortalSession({
    stripe,
    stripeCustomerId,
    returnUrl,
  })

  return { portalUrl: stripePortal.url }
}
