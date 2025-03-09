import { Injectable } from "@nestjs/common"
import { DiscoveryModule } from "@nestjs/core"
import { Test, TestingModule } from "@nestjs/testing"
import { PaymentProvider } from "src/payment-provider/decorators/payment-provider.decorator"
import { PaymentProviderClientInterface } from "src/payment-provider/interfaces/payment-provider-client.interface"
import { PaymentProviderInterface } from "src/payment-provider/interfaces/payment-provider.interface"
import { PaymentProviderService } from "src/payment-provider/services/payment-provider.service"

const mockedClient = {} as PaymentProviderClientInterface

@Injectable()
@PaymentProvider()
class DummyPaymentProvider implements PaymentProviderInterface {
  getClientForTenant(
    tenantId: string,
  ): Promise<PaymentProviderClientInterface | null> {
    if (tenantId === "test-tenant") {
      return Promise.resolve(mockedClient)
    }

    return Promise.resolve(null)
  }
}

describe("PaymentProviderService", () => {
  let module: TestingModule
  let service: PaymentProviderService

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [DiscoveryModule],
      providers: [PaymentProviderService, DummyPaymentProvider],
    }).compile()

    service = module.get(PaymentProviderService)
  })

  describe("forTenant", () => {
    it("returns a client for the given tenant", async () => {
      const tenantId = "test-tenant"
      const client = await service.forTenant(tenantId)
      expect(client).toBe(mockedClient)
    })

    it("throws an error when the tenant is unknown", async () => {
      const tenantId = "unknown-tenant"
      await expect(() => service.forTenant(tenantId)).rejects.toThrow(
        `No payment provider found for tenant ${tenantId}`,
      )
    })
  })
})
