import { Injectable, UnprocessableEntityException } from "@nestjs/common"
import { DiscoveryService } from "@nestjs/core"
import { PaymentProvider } from "src/payment-provider/decorators/payment-provider.decorator"
import { PaymentProviderInterface } from "src/payment-provider/interfaces/payment-provider.interface"

@Injectable()
export class PaymentProviderService {
  constructor(private readonly discoveryService: DiscoveryService) {}

  async forTenant(tenantId: string) {
    const possibleClients = await Promise.all(
      this.getRegisteredPaymentProviders().map((provider) =>
        provider.getClientForTenant(tenantId),
      ),
    )
    const client = possibleClients.find((client) => Boolean(client))

    if (!client) {
      throw new UnprocessableEntityException(
        `No payment provider found for tenant ${tenantId}`,
      )
    }

    return client
  }

  private getRegisteredPaymentProviders() {
    return this.discoveryService
      .getProviders({ metadataKey: PaymentProvider.KEY })
      .map((wrapper) => wrapper.instance as PaymentProviderInterface)
  }
}
