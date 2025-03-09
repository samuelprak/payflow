import { UnprocessableEntityException } from "@nestjs/common"
import { BaseCustomer } from "src/payment-provider/interfaces/base-customer"
import { CheckoutParams } from "src/payment-provider/interfaces/checkout-params"
import { PaymentProviderClientInterface } from "src/payment-provider/interfaces/payment-provider-client.interface"
import { createCheckout } from "src/stripe/models/stripe/use-cases/create-checkout"
import { syncCustomer } from "src/stripe/models/stripe/use-cases/sync-customer"
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
    await syncCustomer({
      baseCustomer,
      stripe: this.stripe,
      stripeCustomerRepository: this.stripeCustomerRepository,
    })
  }

  async createCheckout({ customerId, products }: CheckoutParams) {
    const stripeCustomer =
      await this.stripeCustomerRepository.findOneByCustomerId(customerId)
    if (!stripeCustomer) {
      throw new UnprocessableEntityException(
        "Stripe customer not found, please sync customer first",
      )
    }

    return createCheckout({
      stripe: this.stripe,
      products,
      stripeCustomer,
    })
  }
}
