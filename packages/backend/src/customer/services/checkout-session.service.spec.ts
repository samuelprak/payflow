import { createMock } from "@golevelup/ts-jest"
import { ConfigService } from "@nestjs/config"
import { Test, TestingModule } from "@nestjs/testing"
import { CheckoutSession } from "src/customer/entities/checkout-session.entity"
import { CheckoutSessionFactory } from "src/customer/factories/checkout-session.factory"
import { CustomerFactory } from "src/customer/factories/customer.factory"
import { CreateCheckoutSessionDto } from "src/customer/models/dto/create-checkout.dto"
import { CheckoutSessionRepository } from "src/customer/repositories/checkout-session.repository"
import { BaseCheckoutSession } from "src/payment-provider/interfaces/base-checkout-session"
import { PaymentProviderClientInterface } from "src/payment-provider/interfaces/payment-provider-client.interface"
import { PaymentProviderService } from "src/payment-provider/services/payment-provider.service"
import { TenantFactory } from "src/tenant/factories/tenant.factory"
import { v4 as uuidv4 } from "uuid"
import { CheckoutSessionService } from "./checkout-session.service"

describe("CheckoutSessionService", () => {
  const serverUrl = "https://api.example.com"
  let service: CheckoutSessionService
  let repository: jest.Mocked<CheckoutSessionRepository>
  let configService: jest.Mocked<ConfigService>
  let paymentProviderService: jest.Mocked<PaymentProviderService>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CheckoutSessionService],
    })
      .useMocker(createMock)
      .compile()

    service = module.get<CheckoutSessionService>(CheckoutSessionService)
    repository = module.get(CheckoutSessionRepository)
    configService = module.get(ConfigService)
    paymentProviderService = module.get(PaymentProviderService)
  })

  describe("createCheckoutSession", () => {
    it("creates a checkout session and returns the checkout URL", async () => {
      const checkoutSessionId = uuidv4()
      const tenant = await new TenantFactory().make()
      const customer = await new CustomerFactory().make({ tenant })

      const configuration: CreateCheckoutSessionDto = {
        products: [{ externalRef: "product-1", quantity: 1 }],
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
      }

      const mockCheckoutSession = {
        id: checkoutSessionId,
        tenant,
        customer,
        configuration,
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as CheckoutSession

      repository.create.mockResolvedValue(mockCheckoutSession)

      configService.get.mockReturnValue(serverUrl)

      const result = await service.createCheckoutSession({
        tenant,
        customer,
        configuration,
      })

      expect(repository.create).toHaveBeenCalledWith({
        tenant,
        customer,
        configuration,
      })

      expect(configService.get).toHaveBeenCalledWith("SERVER_URL")

      expect(result).toEqual({
        checkoutUrl: `${serverUrl}/checkout/${checkoutSessionId}`,
      })
    })
  })

  describe("getClientCheckoutSession", () => {
    it("retrieves a checkout session and returns the provider checkout session", async () => {
      const checkoutSessionId = uuidv4()
      const tenant = await new TenantFactory().make()
      const customer = await new CustomerFactory().make({ tenant })

      const configuration: CreateCheckoutSessionDto = {
        products: [{ externalRef: "product-1", quantity: 1 }],
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
      }

      const mockCheckoutSession = {
        id: checkoutSessionId,
        tenant,
        customer,
        configuration,
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as CheckoutSession

      configService.get.mockReturnValue(serverUrl)
      repository.findOneOrFail.mockResolvedValue(mockCheckoutSession)

      const mockProviderCheckoutSession: BaseCheckoutSession = {
        checkoutUrl: "https://provider.com/checkout/session-id",
      }

      const createCheckoutSessionFn = jest
        .fn()
        .mockResolvedValue(mockProviderCheckoutSession)

      paymentProviderService.forTenant.mockResolvedValue({
        createCheckoutSession: createCheckoutSessionFn,
      } as unknown as PaymentProviderClientInterface)

      const result = await service.getClientCheckoutSession(checkoutSessionId)

      expect(repository.findOneOrFail).toHaveBeenCalledWith(checkoutSessionId)

      expect(paymentProviderService.forTenant).toHaveBeenCalledWith(tenant.id)

      expect(createCheckoutSessionFn).toHaveBeenCalledWith({
        customerId: customer.id,
        products: configuration.products,
        successUrl: `https://api.example.com/checkout/${checkoutSessionId}/success`,
        cancelUrl: `https://api.example.com/checkout/${checkoutSessionId}/cancel`,
      })

      expect(result).toEqual(mockProviderCheckoutSession)
    })
  })

  describe("getCheckoutSession", () => {
    it("retrieves a checkout session", async () => {
      const checkoutSession = await new CheckoutSessionFactory().make()
      repository.findOneOrFail.mockResolvedValue(checkoutSession)

      const result = await service.getCheckoutSession(checkoutSession.id)

      expect(result).toEqual(checkoutSession)
    })
  })
})
