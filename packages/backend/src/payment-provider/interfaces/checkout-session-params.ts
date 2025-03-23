export interface CheckoutSessionParams {
  customerId: string
  products: CheckoutSessionProduct[]
  successUrl?: string
  cancelUrl?: string
}

export interface CheckoutSessionProduct {
  externalRef: string
  quantity: number
}
