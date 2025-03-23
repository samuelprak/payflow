import {
  FactorizedAttrs,
  Factory,
  LazyInstanceAttribute,
  SingleSubfactory,
} from "@jorgebodega/typeorm-factory"
import {
  CheckoutSession,
  DEFAULT_EXPIRATION_TIME,
} from "src/customer/entities/checkout-session.entity"
import { TestDatabaseModule } from "test/utils/test-database/test-database.module"
import { TenantFactory } from "src/tenant/factories/tenant.factory"
import { CustomerFactory } from "src/customer/factories/customer.factory"

export class CheckoutSessionFactory extends Factory<CheckoutSession> {
  protected entity = CheckoutSession
  protected dataSource = TestDatabaseModule.getDataSource()

  protected attrs(): FactorizedAttrs<CheckoutSession> {
    return {
      configuration: {
        products: [
          {
            externalRef: "price_123",
            quantity: 1,
          },
        ],
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
      },
      tenant: new LazyInstanceAttribute(
        () => new SingleSubfactory(TenantFactory),
      ),
      customer: new LazyInstanceAttribute(
        () => new SingleSubfactory(CustomerFactory),
      ),
      expiresAt: new Date(Date.now() + DEFAULT_EXPIRATION_TIME),
    }
  }
}
