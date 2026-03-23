import {
  FactorizedAttrs,
  Factory,
  LazyInstanceAttribute,
  SingleSubfactory,
} from "@jorgebodega/typeorm-factory"
import { Customer } from "src/customer/entities/customer.entity"
import { TenantFactory } from "src/tenant/factories/tenant.factory"
import { SharedDatabaseModule } from "@lyrolab/nest-shared/database"

export class CustomerFactory extends Factory<Customer> {
  protected entity = Customer
  protected dataSource = SharedDatabaseModule.getTestDataSource()
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
