import { Injectable } from "@nestjs/common"
import { PaymentProviderClientInterface } from "src/payment-provider/interfaces/payment-provider-client.interface"
import {
  StripePaymentProviderClient,
  StripePaymentProviderClientConstructorParams,
} from "src/stripe/models/stripe-payment-provider-client"
import { StripeCustomerRepository } from "src/stripe/repositories/stripe-customer.repository"

@Injectable()
export class StripePaymentProviderClientFactory {
  constructor(
    private readonly stripeCustomerRepository: StripeCustomerRepository,
  ) {}

  create(
    params: StripePaymentProviderClientConstructorParams,
  ): PaymentProviderClientInterface {
    return new StripePaymentProviderClient(
      this.stripeCustomerRepository,
      params,
    )
  }
}
