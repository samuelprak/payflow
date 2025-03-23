import { SubscriptionGet } from "src/customer/models/dto/subscription-get.dto"
import { BaseCheckoutSession } from "src/payment-provider/interfaces/base-checkout-session"
import { PaymentProviderClientInterface } from "src/payment-provider/interfaces/payment-provider-client.interface"
import { PortalSession } from "src/payment-provider/interfaces/portal-session"

export class StubPaymentProviderClient
  implements PaymentProviderClientInterface
{
  createCheckoutSession(): Promise<BaseCheckoutSession> {
    return Promise.resolve({ checkoutUrl: "https://example.com/checkout" })
  }

  createPortalSession(): Promise<PortalSession> {
    return Promise.resolve({ portalUrl: "https://example.com/portal" })
  }

  async syncCustomer(): Promise<void> {}

  getSubscriptions(): Promise<SubscriptionGet[]> {
    return Promise.resolve([])
  }
}
