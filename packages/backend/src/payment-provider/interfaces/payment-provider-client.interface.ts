import { SubscriptionGet } from "src/customer/models/dto/subscription-get.dto"
import { BaseCheckoutSession } from "src/payment-provider/interfaces/base-checkout-session"
import { BaseCustomer } from "src/payment-provider/interfaces/base-customer"
import { BasePortalSession } from "src/payment-provider/interfaces/base-portal-session"
import { CheckoutSessionParams } from "src/payment-provider/interfaces/checkout-session-params"
import { PortalSessionParams } from "src/payment-provider/interfaces/portal-session-params"
import { SubscriptionUpdateParams } from "src/payment-provider/interfaces/subscription-update-params"

export interface PaymentProviderClientInterface {
  syncCustomer(customer: BaseCustomer): Promise<void>
  createCheckoutSession(
    params: CheckoutSessionParams,
  ): Promise<BaseCheckoutSession>
  createPortalSession(params: PortalSessionParams): Promise<BasePortalSession>
  getSubscriptions(customerId: string): Promise<SubscriptionGet[]>
  updateSubscription(params: SubscriptionUpdateParams): Promise<void>
}
