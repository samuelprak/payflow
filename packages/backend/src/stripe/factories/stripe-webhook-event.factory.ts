import { FactorizedAttrs, Factory } from "@jorgebodega/typeorm-factory"
import { StripeWebhookEvent } from "src/stripe/entities/stripe-webhook-event.entity"
import { SharedDatabaseModule } from "@lyrolab/nest-shared/database"

export class StripeWebhookEventFactory extends Factory<StripeWebhookEvent> {
  protected entity = StripeWebhookEvent
  protected dataSource = SharedDatabaseModule.getTestDataSource()
  protected attrs(): FactorizedAttrs<StripeWebhookEvent> {
    return {
      stripeEventId: "evt_test_123",
      stripeAccountId: "acc_test_123",
    }
  }
}
