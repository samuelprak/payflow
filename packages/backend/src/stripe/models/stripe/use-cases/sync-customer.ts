import { BaseCustomer } from "src/payment-provider/interfaces/base-customer"
import { createCustomer } from "src/stripe/models/stripe/client/create-customer"
import { retrieveCustomer } from "src/stripe/models/stripe/client/retrieve-customer"
import { updateCustomer } from "src/stripe/models/stripe/client/update-customer"
import { StripeCustomerRepository } from "src/stripe/repositories/stripe-customer.repository"
import Stripe from "stripe"

type Params = {
  stripeCustomerRepository: StripeCustomerRepository
  baseCustomer: BaseCustomer
  stripe: Stripe
}

export async function syncCustomer({
  baseCustomer,
  stripe,
  stripeCustomerRepository,
}: Params) {
  const existingCustomer = await stripeCustomerRepository.findOneByCustomerId(
    baseCustomer.id,
  )

  if (existingCustomer) {
    const customerFromStripe = await retrieveCustomer({
      stripe,
      customerId: existingCustomer.stripeCustomerId,
    })

    if (customerFromStripe.deleted) {
      throw new Error("The customer has been deleted from Stripe")
    }

    if (customerFromStripe.email !== baseCustomer.email) {
      await updateCustomer({
        stripe,
        customerId: existingCustomer.stripeCustomerId,
        params: { email: baseCustomer.email },
      })
    }

    return existingCustomer
  }

  const stripeCustomer = await createCustomer(stripe, baseCustomer)
  return stripeCustomerRepository.create({
    stripeCustomerId: stripeCustomer.id,
    customerId: baseCustomer.id,
  })
}
