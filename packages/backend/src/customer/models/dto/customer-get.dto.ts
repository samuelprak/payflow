import { Customer } from "src/customer/entities/customer.entity"

export class CustomerGet {
  id: string
  email: string
  userRef: string

  static fromEntity(entity: Customer): CustomerGet {
    return {
      id: entity.id,
      email: entity.email,
      userRef: entity.userRef,
    }
  }
}
