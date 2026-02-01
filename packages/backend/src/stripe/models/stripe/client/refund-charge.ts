import Stripe from "stripe"

type Params = {
  stripe: Stripe
  chargeId: string
  reason: "fraudulent" | "duplicate" | "requested_by_customer"
}

export async function refundCharge({
  stripe,
  chargeId,
  reason,
}: Params): Promise<Stripe.Refund> {
  return stripe.refunds.create({
    charge: chargeId,
    reason,
  })
}
