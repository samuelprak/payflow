import { Customer } from "src/customer/entities/customer.entity"

export class InvoicePaidGet {
  id: string
  email: string
  userRef: string
  receiptUrl: string

  static fromEntity(entity: Customer, receiptUrl: string): InvoicePaidGet {
    return {
      id: entity.id,
      email: entity.email,
      userRef: entity.userRef,
      receiptUrl,
    }
  }
}
