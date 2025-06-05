import { ApiProperty } from "@nestjs/swagger"
import { InvoicePaidGet } from "src/customer/models/dto/invoice-paid-get.dto"

export class InvoicePaidWebhookEvent {
  @ApiProperty({
    type: "string",
    enum: ["invoice.paid"],
  })
  type: "invoice.paid"
  invoice: InvoicePaidGet
}
