import { ApiProperty, getSchemaPath } from "@nestjs/swagger"
import { CustomerUpdatedWebhookEvent } from "src/customer/models/dto/customer-updated-webhook-event.dto"
import { InvoicePaidWebhookEvent } from "src/customer/models/dto/invoice-paid-webhook-event.dto"

export class WebhookEvent {
  @ApiProperty({
    oneOf: [
      { $ref: getSchemaPath(CustomerUpdatedWebhookEvent) },
      { $ref: getSchemaPath(InvoicePaidWebhookEvent) },
    ],
  })
  data: CustomerUpdatedWebhookEvent | InvoicePaidWebhookEvent
}
