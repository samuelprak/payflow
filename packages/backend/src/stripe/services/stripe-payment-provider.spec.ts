import { Test, TestingModule } from "@nestjs/testing"
import { StripePaymentProvider } from "src/stripe/services/stripe-payment-provider"
import { StripePaymentProviderClientFactory } from "src/stripe/services/stripe-payment-provider-client-factory"
import { StripeAccountRepository } from "src/stripe/repositories/stripe-account.repository"
import { PaymentProviderClientInterface } from "src/payment-provider/interfaces/payment-provider-client.interface"
import { StripeAccountFactory } from "src/stripe/factories/stripe-account.factory"

describe("StripePaymentProvider", () => {
  let module: TestingModule
  let provider: StripePaymentProvider
  let stripeAccountRepository: StripeAccountRepository
  let clientFactory: StripePaymentProviderClientFactory

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [
        StripePaymentProvider,
        {
          provide: StripeAccountRepository,
          useValue: {
            findOneByTenantId: jest.fn(),
          },
        },
        {
          provide: StripePaymentProviderClientFactory,
          useValue: {
            create: jest.fn(),
          },
        },
      ],
    }).compile()

    provider = module.get(StripePaymentProvider)
    stripeAccountRepository = module.get(StripeAccountRepository)
    clientFactory = module.get(StripePaymentProviderClientFactory)
  })

  describe("getClientForTenant", () => {
    it("should return null if no stripe account is found", async () => {
      jest
        .spyOn(stripeAccountRepository, "findOneByTenantId")
        .mockResolvedValue(null)

      const result = await provider.getClientForTenant("tenant-id")

      expect(result).toBeNull()
      expect(stripeAccountRepository.findOneByTenantId).toHaveBeenCalledWith(
        "tenant-id",
      )
    })

    it("should return a client if stripe account is found", async () => {
      const stripeAccount = await new StripeAccountFactory().make()
      jest
        .spyOn(stripeAccountRepository, "findOneByTenantId")
        .mockResolvedValue(stripeAccount)
      const client = {} as PaymentProviderClientInterface
      jest.spyOn(clientFactory, "create").mockReturnValue(client)

      const result = await provider.getClientForTenant("tenant-id")

      expect(result).toBe(client)
      expect(stripeAccountRepository.findOneByTenantId).toHaveBeenCalledWith(
        "tenant-id",
      )
      expect(clientFactory.create).toHaveBeenCalledWith({
        secretKey: stripeAccount.stripeSecretKey,
        publishableKey: stripeAccount.stripePublishableKey,
      })
    })
  })
})
