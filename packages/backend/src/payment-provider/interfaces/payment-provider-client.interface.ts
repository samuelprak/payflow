import { SubscriptionGet } from "src/customer/models/dto/subscription-get.dto"
import { BaseCustomer } from "src/payment-provider/interfaces/base-customer"
import { CheckoutSession } from "src/payment-provider/interfaces/checkout-session"
import { CheckoutSessionParams } from "src/payment-provider/interfaces/checkout-session-params"
import { PortalSession } from "src/payment-provider/interfaces/portal-session"
import { PortalSessionParams } from "src/payment-provider/interfaces/portal-session-params"

export interface PaymentProviderClientInterface {
  syncCustomer(customer: BaseCustomer): Promise<void>
  createCheckoutSession(params: CheckoutSessionParams): Promise<CheckoutSession>
  createPortalSession(params: PortalSessionParams): Promise<PortalSession>
  getSubscriptions(customerId: string): Promise<SubscriptionGet[]>
}
