export type CustomerUpdatedEventData =
  | {
      type: "customer.updated"
    }
  | {
      type: "invoice.paid"
      receiptUrl: string
    }
  | {
      type: "early_fraud_warning"
      fraudType: string
      chargeId: string
      chargeRefunded: boolean
      subscriptionsCancelled: number
    }

export class CustomerUpdatedEvent {
  static eventName = "customer.updated"

  constructor(
    public readonly customerId: string,
    public readonly data: CustomerUpdatedEventData,
  ) {}
}
