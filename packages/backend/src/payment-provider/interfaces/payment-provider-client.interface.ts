import { SubscriptionGet } from "src/customer/models/dto/subscription-get.dto"
import { BaseCustomer } from "src/payment-provider/interfaces/base-customer"
import { Checkout } from "src/payment-provider/interfaces/checkout"
import { CheckoutParams } from "src/payment-provider/interfaces/checkout-params"

export interface PaymentProviderClientInterface {
  syncCustomer(customer: BaseCustomer): Promise<void>
  createCheckout(params: CheckoutParams): Promise<Checkout>
  getSubscriptions(customerId: string): Promise<SubscriptionGet[]>
}
