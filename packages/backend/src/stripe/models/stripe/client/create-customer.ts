import { BaseCustomer } from "src/payment-provider/interfaces/base-customer"
import Stripe from "stripe"

type Response = {
  id: string
}

export async function createCustomer(
  stripe: Stripe,
  baseCustomer: BaseCustomer,
): Promise<Response> {
  const stripeCustomer = await stripe.customers.create(
    {
      email: baseCustomer.email,
      metadata: {
        tenantId: baseCustomer.tenantId,
        userId: baseCustomer.id,
        userRef: baseCustomer.userRef,
      },
    },
    {
      idempotencyKey: `tenant-${baseCustomer.tenantId}-ref-${baseCustomer.userRef}`,
    },
  )

  return { id: stripeCustomer.id }
}
