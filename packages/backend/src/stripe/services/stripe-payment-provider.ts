import { Injectable } from "@nestjs/common"
import { PaymentProvider } from "src/payment-provider/decorators/payment-provider.decorator"
import { PaymentProviderClientInterface } from "src/payment-provider/interfaces/payment-provider-client.interface"
import { PaymentProviderInterface } from "src/payment-provider/interfaces/payment-provider.interface"
import { StripeAccountRepository } from "src/stripe/repositories/stripe-account.repository"
import { StripePaymentProviderClientFactory } from "src/stripe/services/stripe-payment-provider-client-factory"

@Injectable()
@PaymentProvider()
export class StripePaymentProvider implements PaymentProviderInterface {
  constructor(
    private readonly stripeAccountRepository: StripeAccountRepository,
    private readonly clientFactory: StripePaymentProviderClientFactory,
  ) {}

  async getClientForTenant(
    tenantId: string,
  ): Promise<PaymentProviderClientInterface | null> {
    const stripeAccount =
      await this.stripeAccountRepository.findOneByTenantId(tenantId)

    if (!stripeAccount) {
      return null
    }

    return this.clientFactory.create({
      secretKey: stripeAccount.stripeSecretKey,
      publishableKey: stripeAccount.stripePublishableKey,
    })
  }
}
