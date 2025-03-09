import Stripe from "stripe"

type Params = {
  stripe: Stripe
  stripeCutomerId: string
}

export async function listSubscriptions({ stripe, stripeCutomerId }: Params) {
  const subscriptions = await stripe.subscriptions.list({
    customer: stripeCutomerId,
    status: "all",
    expand: ["data.default_payment_method"],
  })

  return subscriptions.data
}
