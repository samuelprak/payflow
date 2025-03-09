import { FactorizedAttrs, Factory } from "@jorgebodega/typeorm-factory"
import { Tenant } from "src/tenant/entities/tenant.entity"
import { TestDatabaseModule } from "test/utils/test-database/test-database.module"

export class TenantFactory extends Factory<Tenant> {
  protected entity = Tenant
  protected dataSource = TestDatabaseModule.getDataSource()
  protected attrs(): FactorizedAttrs<Tenant> {
    return {
      name: "Test Tenant",
      apiKey: "test-api-key",
    }
  }
}
