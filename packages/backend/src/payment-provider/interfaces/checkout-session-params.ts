export interface CheckoutSessionParams {
  customerId: string
  products: CheckoutSessionProduct[]
}

export interface CheckoutSessionProduct {
  externalRef: string
  quantity: number
}
