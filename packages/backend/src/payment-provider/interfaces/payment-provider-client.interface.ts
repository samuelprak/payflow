import { BaseCustomer } from "src/payment-provider/interfaces/base-customer"

export interface PaymentProviderClientInterface {
  syncCustomer(customer: BaseCustomer): Promise<void>
}
