import {
  FactorizedAttrs,
  Factory,
  LazyInstanceAttribute,
  SingleSubfactory,
} from "@jorgebodega/typeorm-factory"
import { Customer } from "src/customer/entities/customer.entity"
import { TenantFactory } from "src/tenant/factories/tenant.factory"
import { TestDatabaseModule } from "test/utils/test-database/test-database.module"

export class CustomerFactory extends Factory<Customer> {
  protected entity = Customer
  protected dataSource = TestDatabaseModule.getDataSource()
  protected attrs(): FactorizedAttrs<Customer> {
    return {
      email: "test@email.com",
      userRef: "test-user-ref",
      tenant: new LazyInstanceAttribute(
        (instance) =>
          new SingleSubfactory(TenantFactory, { customers: [instance] }),
      ),
    }
  }
}
