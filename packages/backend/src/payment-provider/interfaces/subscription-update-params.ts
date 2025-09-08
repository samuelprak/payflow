export interface SubscriptionUpdateParams {
  customerId: string
  products: SubscriptionUpdateProduct[]
}

export interface SubscriptionUpdateProduct {
  externalRef: string
  quantity: number
}
