import Stripe from "stripe"

type Params = {
  stripe: Stripe
  customerId: string
}

export async function retrieveCustomer({ stripe, customerId }: Params) {
  const stripeCustomer = await stripe.customers.retrieve(customerId)
  return stripeCustomer
}
