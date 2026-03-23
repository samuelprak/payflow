import { FactorizedAttrs, Factory } from "@jorgebodega/typeorm-factory"
import { Tenant } from "src/tenant/entities/tenant.entity"
import { SharedDatabaseModule } from "@lyrolab/nest-shared/database"

export class TenantFactory extends Factory<Tenant> {
  protected entity = Tenant
  protected dataSource = SharedDatabaseModule.getTestDataSource()
  protected attrs(): FactorizedAttrs<Tenant> {
    return {
      name: "Test Tenant",
      apiKey: "test-api-key",
      webhookUrl: "https://test-webhook.com",
    }
  }
}
