import { createMock } from "@golevelup/ts-jest"
import { Test } from "@nestjs/testing"
import { CustomerFactory } from "src/customer/factories/customer.factory"
import { CreateCheckoutDto } from "src/customer/models/dto/create-checkout.dto"
import { CheckoutService } from "src/customer/services/checkout.service"
import { PaymentProviderClientInterface } from "src/payment-provider/interfaces/payment-provider-client.interface"
import { PaymentProviderService } from "src/payment-provider/services/payment-provider.service"
import { TenantFactory } from "src/tenant/factories/tenant.factory"

describe("CheckoutService", () => {
  let service: CheckoutService
  let paymentProviderService: jest.Mocked<PaymentProviderService>

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [CheckoutService],
    })
      .useMocker(createMock)
      .compile()

    service = module.get(CheckoutService)
    paymentProviderService = module.get(PaymentProviderService)
  })

  describe("createCheckout", () => {
    it("creates a checkout", async () => {
      const tenant = await new TenantFactory().make()
      const customer = await new CustomerFactory().make({ tenant })

      const createCheckoutFn = jest.fn()
      paymentProviderService.forTenant.mockResolvedValue({
        createCheckout: createCheckoutFn,
      } as unknown as PaymentProviderClientInterface)

      const params: CreateCheckoutDto = {
        products: [
          {
            externalRef: "product-1",
            quantity: 1,
          },
        ],
      }

      await service.createCheckout({ tenant, customer, params })

      expect(paymentProviderService.forTenant).toHaveBeenCalledWith(tenant.id)
      expect(createCheckoutFn).toHaveBeenCalledWith({
        customerId: customer.id,
        products: params.products,
      })
    })
  })
})
