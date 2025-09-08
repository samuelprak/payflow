import { UnprocessableEntityException } from "@nestjs/common"
import { BaseCustomer } from "src/payment-provider/interfaces/base-customer"
import { CheckoutSessionParams } from "src/payment-provider/interfaces/checkout-session-params"
import { PaymentProviderClientInterface } from "src/payment-provider/interfaces/payment-provider-client.interface"
import { PortalSessionParams } from "src/payment-provider/interfaces/portal-session-params"
import { SubscriptionCancelParams } from "src/payment-provider/interfaces/subscription-cancel-params"
import { SubscriptionUpdateParams } from "src/payment-provider/interfaces/subscription-update-params"
import { cancelSubscriptionAtPeriodEnd } from "src/stripe/models/stripe/use-cases/cancel-subscription-at-period-end"
import { createCheckout } from "src/stripe/models/stripe/use-cases/create-checkout"
import { createPortalSession } from "src/stripe/models/stripe/use-cases/create-portal-session"
import { getSubscriptions } from "src/stripe/models/stripe/use-cases/get-subscriptions"
import { syncCustomer } from "src/stripe/models/stripe/use-cases/sync-customer"
import { updateSubscription } from "src/stripe/models/stripe/use-cases/update-subscription"
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

  async createCheckoutSession({
    customerId,
    products,
    successUrl,
    cancelUrl,
  }: CheckoutSessionParams) {
    const stripeCustomer = await this.getStripeCustomer(customerId)

    return createCheckout({
      stripe: this.stripe,
      products,
      stripeCustomer,
      successUrl,
      cancelUrl,
    })
  }

  async createPortalSession({ customerId, returnUrl }: PortalSessionParams) {
    const stripeCustomer = await this.getStripeCustomer(customerId)

    return createPortalSession({
      stripe: this.stripe,
      stripeCustomerId: stripeCustomer.stripeCustomerId,
      returnUrl,
    })
  }

  async getSubscriptions(customerId: string) {
    const stripeCustomer =
      await this.stripeCustomerRepository.findOneByCustomerId(customerId)
    if (!stripeCustomer) return []

    return getSubscriptions({
      stripe: this.stripe,
      stripeCustomerId: stripeCustomer.stripeCustomerId,
    })
  }

  async updateSubscription({ customerId, products }: SubscriptionUpdateParams) {
    const stripeCustomer = await this.getStripeCustomer(customerId)

    return updateSubscription({
      stripe: this.stripe,
      products,
      stripeCustomerId: stripeCustomer.stripeCustomerId,
    })
  }

  async cancelSubscriptionAtPeriodEnd({
    customerId,
    cancelAtPeriodEnd,
  }: SubscriptionCancelParams) {
    const stripeCustomer = await this.getStripeCustomer(customerId)

    return cancelSubscriptionAtPeriodEnd({
      stripe: this.stripe,
      stripeCustomerId: stripeCustomer.stripeCustomerId,
      cancelAtPeriodEnd,
    })
  }

  private async getStripeCustomer(customerId: string) {
    const stripeCustomer =
      await this.stripeCustomerRepository.findOneByCustomerId(customerId)
    if (!stripeCustomer) {
      throw new UnprocessableEntityException(
        "Stripe customer not found, please sync customer first",
      )
    }

    return stripeCustomer
  }
}
