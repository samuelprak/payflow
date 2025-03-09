export class CustomerUpdatedEvent {
  static eventName = "customer.updated"

  constructor(public readonly customerId: string) {}
}
