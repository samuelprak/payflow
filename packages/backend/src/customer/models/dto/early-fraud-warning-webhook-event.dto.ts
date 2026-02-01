import { ApiProperty } from "@nestjs/swagger"
import { EarlyFraudWarningGet } from "src/customer/models/dto/early-fraud-warning-get.dto"

export class EarlyFraudWarningWebhookEvent {
  @ApiProperty({
    type: "string",
    enum: ["early_fraud_warning"],
  })
  type: "early_fraud_warning"
  earlyFraudWarning: EarlyFraudWarningGet
}
