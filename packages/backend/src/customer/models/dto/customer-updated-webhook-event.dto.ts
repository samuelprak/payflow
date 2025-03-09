import { CustomerGet } from "src/customer/models/dto/customer-get.dto"

export class CustomerUpdatedWebhookEvent {
  type: "customer.updated"
  customer: CustomerGet
}
