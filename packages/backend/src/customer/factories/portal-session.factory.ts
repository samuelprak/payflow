import {
  FactorizedAttrs,
  Factory,
  LazyInstanceAttribute,
  SingleSubfactory,
} from "@jorgebodega/typeorm-factory"
import {
  PortalSession,
  DEFAULT_EXPIRATION_TIME,
} from "src/customer/entities/portal-session.entity"
import { TestDatabaseModule } from "test/utils/test-database/test-database.module"
import { TenantFactory } from "src/tenant/factories/tenant.factory"
import { CustomerFactory } from "src/customer/factories/customer.factory"

export class PortalSessionFactory extends Factory<PortalSession> {
  protected entity = PortalSession
  protected dataSource = TestDatabaseModule.getDataSource()

  protected attrs(): FactorizedAttrs<PortalSession> {
    return {
      returnUrl: "https://example.com/dashboard",
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
