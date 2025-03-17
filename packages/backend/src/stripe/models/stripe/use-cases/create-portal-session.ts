import { PortalSession } from "src/payment-provider/interfaces/portal-session"
import { createBillingPortalSession } from "src/stripe/models/stripe/client/create-billing-portal-session"
import Stripe from "stripe"

type Params = {
  stripe: Stripe
  stripeCustomerId: string
}

export async function createPortalSession({
  stripe,
  stripeCustomerId,
}: Params): Promise<PortalSession> {
  const stripePortal = await createBillingPortalSession({
    stripe,
    stripeCustomerId,
  })

  return { portalUrl: stripePortal.url }
}
