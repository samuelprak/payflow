import { PaymentProviderClientInterface } from "src/payment-provider/interfaces/payment-provider-client.interface"

export class StubPaymentProviderClient
  implements PaymentProviderClientInterface
{
  async syncCustomer(): Promise<void> {}
}
