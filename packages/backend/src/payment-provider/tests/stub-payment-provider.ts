import { Injectable } from "@nestjs/common"
import { PaymentProvider } from "src/payment-provider/decorators/payment-provider.decorator"
import { PaymentProviderClientInterface } from "src/payment-provider/interfaces/payment-provider-client.interface"
import { PaymentProviderInterface } from "src/payment-provider/interfaces/payment-provider.interface"
import { StubPaymentProviderClient } from "src/payment-provider/tests/stub-payment-provider-client"

@Injectable()
@PaymentProvider()
export class StubPaymentProvider implements PaymentProviderInterface {
  getClientForTenant(
    _tenantId: string,
  ): Promise<PaymentProviderClientInterface | null> {
    return Promise.resolve(new StubPaymentProviderClient())
  }
}
