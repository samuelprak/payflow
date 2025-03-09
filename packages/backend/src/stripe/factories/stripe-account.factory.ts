import {
  CollectionSubfactory,
  FactorizedAttrs,
  Factory,
  LazyInstanceAttribute,
} from "@jorgebodega/typeorm-factory"
import { StripeAccount } from "src/stripe/entities/stripe-account.entity"
import { TenantFactory } from "src/tenant/factories/tenant.factory"
import { TestDatabaseModule } from "test/utils/test-database/test-database.module"

export class StripeAccountFactory extends Factory<StripeAccount> {
  protected entity = StripeAccount
  protected dataSource = TestDatabaseModule.getDataSource()
  protected attrs(): FactorizedAttrs<StripeAccount> {
    return {
      stripePublishableKey: "pk_test_123",
      stripeSecretKey: "sk_test_123",
      stripeWebhookSecret: "whsec_123",
      tenants: new LazyInstanceAttribute(
        (instance) =>
          new CollectionSubfactory(TenantFactory, 1, {
            stripeAccounts: [instance],
          }),
      ),
    }
  }
}
