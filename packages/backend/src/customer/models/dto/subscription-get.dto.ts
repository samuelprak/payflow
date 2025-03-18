import { PaymentMethodGet } from "src/customer/models/dto/payment-method-get.dto"

export class SubscriptionGet {
  shouldProvideProduct: boolean
  hasPastDueSubscription: boolean
  externalRef: string
  productExternalRef: string
  currentPeriodStart: Date
  currentPeriodEnd: Date
  paymentMethod?: PaymentMethodGet
  cancelAtPeriodEnd: boolean
  amount?: number
  currency: string
}
