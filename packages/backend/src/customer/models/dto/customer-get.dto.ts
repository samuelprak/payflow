import { Customer } from "src/customer/entities/customer.entity"
import { SubscriptionGet } from "src/customer/models/dto/subscription-get.dto"

export class CustomerGet {
  id: string
  email: string
  userRef: string
  subscriptions: SubscriptionGet[]

  static fromEntity(
    entity: Customer,
    subscriptions: SubscriptionGet[],
  ): CustomerGet {
    return {
      id: entity.id,
      email: entity.email,
      userRef: entity.userRef,
      subscriptions,
    }
  }
}
