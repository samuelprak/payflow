import { createMock } from "@golevelup/ts-jest"
import { Test } from "@nestjs/testing"
import { CustomerFactory } from "src/customer/factories/customer.factory"
import { PortalSessionService } from "src/customer/services/portal-session.service"
import { PaymentProviderClientInterface } from "src/payment-provider/interfaces/payment-provider-client.interface"
import { PaymentProviderService } from "src/payment-provider/services/payment-provider.service"
import { TenantFactory } from "src/tenant/factories/tenant.factory"

describe("PortalSessionService", () => {
  let service: PortalSessionService
  let paymentProviderService: jest.Mocked<PaymentProviderService>

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [PortalSessionService],
    })
      .useMocker(createMock)
      .compile()

    service = module.get(PortalSessionService)
    paymentProviderService = module.get(PaymentProviderService)
  })

  describe("createPortalSession", () => {
    it("creates a portal session", async () => {
      const tenant = await new TenantFactory().make()
      const customer = await new CustomerFactory().make({ tenant })

      const createPortalSessionFn = jest.fn()
      paymentProviderService.forTenant.mockResolvedValue({
        createPortalSession: createPortalSessionFn,
      } as unknown as PaymentProviderClientInterface)

      await service.createPortalSession({ tenant, customer })

      expect(paymentProviderService.forTenant).toHaveBeenCalledWith(tenant.id)
      expect(createPortalSessionFn).toHaveBeenCalledWith({
        customerId: customer.id,
      })
    })
  })
})
