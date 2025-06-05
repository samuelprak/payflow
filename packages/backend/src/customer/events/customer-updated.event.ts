export type CustomerUpdatedEventData =
  | {
      type: "customer.updated"
    }
  | {
      type: "invoice.paid"
      receiptUrl: string
    }

export class CustomerUpdatedEvent {
  static eventName = "customer.updated"

  constructor(
    public readonly customerId: string,
    public readonly data: CustomerUpdatedEventData,
  ) {}
}
