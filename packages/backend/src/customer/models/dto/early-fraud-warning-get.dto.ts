import { Customer } from "src/customer/entities/customer.entity"

export class EarlyFraudWarningGet {
  id: string
  email: string
  userRef: string
  fraudType: string
  chargeId: string
  chargeRefunded: boolean
  subscriptionsCancelled: number
  subscriptionCancellationsFailed: number

  static fromEntity(
    entity: Customer,
    fraudType: string,
    chargeId: string,
    chargeRefunded: boolean,
    subscriptionsCancelled: number,
    subscriptionCancellationsFailed: number,
  ): EarlyFraudWarningGet {
    return {
      id: entity.id,
      email: entity.email,
      userRef: entity.userRef,
      fraudType,
      chargeId,
      chargeRefunded,
      subscriptionsCancelled,
      subscriptionCancellationsFailed,
    }
  }
}
