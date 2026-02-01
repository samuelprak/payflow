import { ApiProperty, getSchemaPath } from "@nestjs/swagger"
import { CustomerUpdatedWebhookEvent } from "src/customer/models/dto/customer-updated-webhook-event.dto"
import { EarlyFraudWarningWebhookEvent } from "src/customer/models/dto/early-fraud-warning-webhook-event.dto"
import { InvoicePaidWebhookEvent } from "src/customer/models/dto/invoice-paid-webhook-event.dto"

export class WebhookEvent {
  @ApiProperty({
    oneOf: [
      { $ref: getSchemaPath(CustomerUpdatedWebhookEvent) },
      { $ref: getSchemaPath(InvoicePaidWebhookEvent) },
      { $ref: getSchemaPath(EarlyFraudWarningWebhookEvent) },
    ],
  })
  data:
    | CustomerUpdatedWebhookEvent
    | InvoicePaidWebhookEvent
    | EarlyFraudWarningWebhookEvent
}
