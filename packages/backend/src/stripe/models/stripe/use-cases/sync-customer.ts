import { BaseCustomer } from "src/payment-provider/interfaces/base-customer"
import { createCustomer } from "src/stripe/models/stripe/client/create-customer"
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

  if (existingCustomer) return existingCustomer

  const stripeCustomer = await createCustomer(stripe, baseCustomer)
  return stripeCustomerRepository.create({
    stripeCustomerId: stripeCustomer.id,
    customerId: baseCustomer.id,
  })
}
