import { Checkout } from "src/payment-provider/interfaces/checkout"
import { PaymentProviderClientInterface } from "src/payment-provider/interfaces/payment-provider-client.interface"

export class StubPaymentProviderClient
  implements PaymentProviderClientInterface
{
  createCheckout(): Promise<Checkout> {
    return Promise.resolve({
      checkoutUrl: "https://example.com/checkout",
    })
  }
  async syncCustomer(): Promise<void> {}
}
