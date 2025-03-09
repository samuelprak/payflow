import {
  FactorizedAttrs,
  Factory,
  LazyInstanceAttribute,
  SingleSubfactory,
} from "@jorgebodega/typeorm-factory"
import { CustomerFactory } from "src/customer/factories/customer.factory"
import { StripeCustomer } from "src/stripe/entities/stripe-customer.entity"
import { TestDatabaseModule } from "test/utils/test-database/test-database.module"

export class StripeCustomerFactory extends Factory<StripeCustomer> {
  protected entity = StripeCustomer
  protected dataSource = TestDatabaseModule.getDataSource()
  protected attrs(): FactorizedAttrs<StripeCustomer> {
    return {
      customer: new LazyInstanceAttribute(
        (instance) =>
          new SingleSubfactory(CustomerFactory, { stripeCustomer: instance }),
      ),
      stripeCustomerId: "cus_123",
    }
  }
}
