import { BaseCustomer } from "src/payment-provider/interfaces/base-customer"
import { PaymentProviderClientInterface } from "src/payment-provider/interfaces/payment-provider-client.interface"
import { createCustomer } from "src/stripe/models/stripe/create-customer"
import { StripeCustomerRepository } from "src/stripe/repositories/stripe-customer.repository"
import Stripe from "stripe"

export type StripePaymentProviderClientConstructorParams = {
  secretKey: string
  publishableKey: string
}

export class StripePaymentProviderClient
  implements PaymentProviderClientInterface
{
  private readonly publishableKey: string
  private readonly stripe: Stripe

  constructor(
    private readonly stripeCustomerRepository: StripeCustomerRepository,
    params: StripePaymentProviderClientConstructorParams,
  ) {
    this.publishableKey = params.publishableKey
    this.stripe = new Stripe(params.secretKey)
  }

  async syncCustomer(baseCustomer: BaseCustomer): Promise<void> {
    const existingCustomer =
      await this.stripeCustomerRepository.findOneByCustomerId(baseCustomer.id)

    if (!existingCustomer) {
      const stripeCustomer = await createCustomer(this.stripe, baseCustomer)
      await this.stripeCustomerRepository.create({
        stripeCustomerId: stripeCustomer.id,
        customerId: baseCustomer.id,
      })
    }
  }
}
