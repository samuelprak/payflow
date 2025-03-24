import { createMock } from "@golevelup/ts-jest"
import { ConfigService } from "@nestjs/config"
import { Test, TestingModule } from "@nestjs/testing"
import { CustomerFactory } from "src/customer/factories/customer.factory"
import { PortalSessionFactory } from "src/customer/factories/portal-session.factory"
import { PortalSessionRepository } from "src/customer/repositories/portal-session.repository"
import { PortalSessionService } from "src/customer/services/portal-session.service"
import { BasePortalSession } from "src/payment-provider/interfaces/base-portal-session"
import { PaymentProviderClientInterface } from "src/payment-provider/interfaces/payment-provider-client.interface"
import { PortalSessionParams } from "src/payment-provider/interfaces/portal-session-params"
import { PaymentProviderService } from "src/payment-provider/services/payment-provider.service"
import { TenantFactory } from "src/tenant/factories/tenant.factory"

describe("PortalSessionService", () => {
  let service: PortalSessionService
  let repository: PortalSessionRepository
  let paymentProviderService: PaymentProviderService
  let configService: ConfigService
  let mockClient: PaymentProviderClientInterface

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PortalSessionService],
    })
      .useMocker(createMock)
      .compile()

    service = module.get<PortalSessionService>(PortalSessionService)
    repository = module.get<PortalSessionRepository>(PortalSessionRepository)
    paymentProviderService = module.get<PaymentProviderService>(
      PaymentProviderService,
    )
    configService = module.get<ConfigService>(ConfigService)

    // Create a mock client for payment provider with proper typing
    mockClient = createMock<PaymentProviderClientInterface>()
  })

  describe("createPortalSession", () => {
    it("should create a portal session and return the portal URL", async () => {
      // Create mock entities using factories
      const tenant = await new TenantFactory().make()
      const customer = await new CustomerFactory().make()

      const returnUrl = "https://example.com/dashboard"
      const portalSessionId = "123"
      const serverUrl = "https://api.example.com"

      // Create a properly typed PortalSession using factory
      const portalSession = await new PortalSessionFactory().make()
      // Override specific properties for the test
      portalSession.id = portalSessionId
      portalSession.tenant = tenant
      portalSession.customer = customer
      portalSession.returnUrl = returnUrl

      jest.spyOn(repository, "create").mockResolvedValue(portalSession)
      jest.spyOn(configService, "get").mockReturnValue(serverUrl)

      const result = await service.createPortalSession({
        tenant,
        customer,
        returnUrl,
      })

      expect(result).toEqual({
        portalUrl: `${serverUrl}/portal/${portalSessionId}`,
      })
      expect(repository.create).toHaveBeenCalledWith({
        tenant,
        customer,
        returnUrl,
      })
    })
  })

  describe("getClientPortalSession", () => {
    it("should get a portal session and create a client portal session", async () => {
      // Create mock entities using factories
      const tenant = await new TenantFactory().make()
      const customer = await new CustomerFactory().make()

      const returnUrl = "https://example.com/dashboard"
      const portalSessionId = "123"
      const serverUrl = "https://api.example.com"

      // Create a properly typed PortalSession using factory
      const portalSession = await new PortalSessionFactory().make()
      // Override specific properties for the test
      portalSession.id = portalSessionId
      portalSession.tenant = tenant
      portalSession.customer = customer
      portalSession.returnUrl = returnUrl

      const clientPortalSession: BasePortalSession = {
        portalUrl: "https://stripe.com/billing-portal/session-id",
      }

      jest.spyOn(repository, "findOneOrFail").mockResolvedValue(portalSession)
      jest
        .spyOn(paymentProviderService, "forTenant")
        .mockResolvedValue(mockClient)
      jest
        .spyOn(mockClient, "createPortalSession")
        .mockResolvedValue(clientPortalSession)
      jest.spyOn(configService, "get").mockReturnValue(serverUrl)

      const result = await service.getClientPortalSession(portalSessionId)

      expect(result).toEqual(clientPortalSession)
      expect(repository.findOneOrFail).toHaveBeenCalledWith(portalSessionId)
      expect(paymentProviderService.forTenant).toHaveBeenCalledWith(tenant.id)
      expect(mockClient.createPortalSession).toHaveBeenCalledWith({
        customerId: customer.id,
        returnUrl: `${serverUrl}/portal/${portalSessionId}/return`,
      } as PortalSessionParams)
    })
  })

  describe("getPortalSession", () => {
    it("should get a portal session by ID", async () => {
      const portalSessionId = "123"

      // Create a properly typed PortalSession using factory
      const portalSession = await new PortalSessionFactory().make()
      // Override specific properties for the test
      portalSession.id = portalSessionId

      jest.spyOn(repository, "findOneOrFail").mockResolvedValue(portalSession)

      const result = await service.getPortalSession(portalSessionId)

      expect(result).toEqual(portalSession)
      expect(repository.findOneOrFail).toHaveBeenCalledWith(portalSessionId)
    })
  })
})
