import { Test, TestingModule } from "@nestjs/testing"
import { TypeOrmModule } from "@nestjs/typeorm"
import { PortalSession } from "src/customer/entities/portal-session.entity"
import { PortalSessionRepository } from "src/customer/repositories/portal-session.repository"
import { CustomerFactory } from "src/customer/factories/customer.factory"
import { TenantFactory } from "src/tenant/factories/tenant.factory"
import { assertDifference } from "test/helpers/assert-difference"
import { getRepository } from "test/helpers/get-repository"
import { TestDatabaseModule } from "test/utils/test-database/test-database.module"
import { PortalSessionFactory } from "src/customer/factories/portal-session.factory"
import { NotFoundException } from "@nestjs/common"
import { v4 } from "uuid"
import { EntityNotFoundError } from "typeorm"

describe("PortalSessionRepository", () => {
  let module: TestingModule
  let repository: PortalSessionRepository

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TestDatabaseModule.forRoot(),
        TypeOrmModule.forFeature([PortalSession]),
      ],
      providers: [PortalSessionRepository],
    }).compile()

    repository = module.get(PortalSessionRepository)
  })

  describe("create", () => {
    it("creates a portal session", async () => {
      const tenant = await new TenantFactory().create()
      const customer = await new CustomerFactory().create({ tenant })

      const returnUrl = "https://example.com/dashboard"

      const createdSession = await assertDifference([[PortalSession, 1]], () =>
        repository.create({
          returnUrl,
          customer,
          tenant,
        }),
      )

      const savedSession = await getRepository(
        module,
        PortalSession,
      ).findOneOrFail({
        where: { id: createdSession.id },
        relations: ["customer", "tenant"],
      })

      expect(savedSession).toBeDefined()
      expect(savedSession.id).toEqual(createdSession.id)
      expect(savedSession.returnUrl).toEqual(returnUrl)
      expect(savedSession.customer.id).toEqual(customer.id)
      expect(savedSession.tenant.id).toEqual(tenant.id)
    })
  })

  describe("findOneOrFail", () => {
    it("returns a portal session", async () => {
      const portalSession = await new PortalSessionFactory().create()

      const foundPortalSession = await repository.findOneOrFail(
        portalSession.id,
      )

      expect(foundPortalSession.id).toEqual(portalSession.id)
      expect(foundPortalSession.tenant.id).toEqual(portalSession.tenant.id)
      expect(foundPortalSession.customer.id).toEqual(portalSession.customer.id)
    })

    it("throws an error if the portal session does not exist", async () => {
      await expect(repository.findOneOrFail(v4())).rejects.toThrow(
        EntityNotFoundError,
      )
    })

    it("throws an error if the portal session has expired", async () => {
      const portalSession = await new PortalSessionFactory().create({
        expiresAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
      })

      await expect(repository.findOneOrFail(portalSession.id)).rejects.toThrow(
        NotFoundException,
      )
    })
  })
})
