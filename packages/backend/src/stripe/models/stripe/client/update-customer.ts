import Stripe from "stripe"

type Params = {
  stripe: Stripe
  customerId: string
  params: {
    email?: string
  }
}

export async function updateCustomer({ stripe, customerId, params }: Params) {
  const stripeCustomer = await stripe.customers.update(customerId, params)
  return stripeCustomer
}
