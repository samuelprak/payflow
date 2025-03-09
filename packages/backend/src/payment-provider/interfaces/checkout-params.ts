export interface CheckoutParams {
  customerId: string
  products: CheckoutProduct[]
}

export interface CheckoutProduct {
  externalRef: string
  quantity: number
}
