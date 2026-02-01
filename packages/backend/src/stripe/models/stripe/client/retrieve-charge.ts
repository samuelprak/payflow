import Stripe from "stripe"

type Params = {
  stripe: Stripe
  chargeId: string
}

export async function retrieveCharge({
  stripe,
  chargeId,
}: Params): Promise<Stripe.Charge> {
  return stripe.charges.retrieve(chargeId)
}
