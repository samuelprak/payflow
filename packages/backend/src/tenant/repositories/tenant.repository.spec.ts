import { Test, TestingModule } from "@nestjs/testing"
import { TypeOrmModule } from "@nestjs/typeorm"
import { Tenant } from "src/tenant/entities/tenant.entity"
import { TenantFactory } from "src/tenant/factories/tenant.factory"
import { TenantRepository } from "src/tenant/repositories/tenant.repository"
import { TestDatabaseModule } from "test/utils/test-database/test-database.module"
import { v4 as uuidv4 } from "uuid"

describe("TenantRepository", () => {
  let repository: TenantRepository

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TestDatabaseModule.forRoot(),
        TypeOrmModule.forFeature([Tenant]),
      ],
      providers: [TenantRepository],
    }).compile()

    repository = module.get<TenantRepository>(TenantRepository)
  })

  describe("findOneOrFail", () => {
    it("returns a tenant", async () => {
      const tenant = await new TenantFactory().create()

      const result = await repository.findOneOrFail(tenant.id)

      expect(result).toBeDefined()
      expect(result.id).toBe(tenant.id)
    })
  })

  describe("findOneByApiKey", () => {
    it("returns a tenant", async () => {
      const tenant = await new TenantFactory().create()

      const resultOrNull = await repository.findOneByApiKey(tenant.apiKey)
      expect(resultOrNull).toBeDefined()
      const result = resultOrNull as Tenant
      expect(result.id).toBe(tenant.id)
    })

    it("returns null if no tenant is found", async () => {
      const result = await repository.findOneByApiKey(uuidv4())

      expect(result).toBeNull()
    })
  })
})
