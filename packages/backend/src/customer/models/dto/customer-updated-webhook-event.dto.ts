import { ApiProperty } from "@nestjs/swagger"
import { CustomerGet } from "src/customer/models/dto/customer-get.dto"

export class CustomerUpdatedWebhookEvent {
  @ApiProperty({
    type: "string",
    enum: ["customer.updated"],
  })
  type: "customer.updated"
  customer: CustomerGet
}
