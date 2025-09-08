import { createMock } from "@golevelup/ts-jest"
import { NotFoundException } from "@nestjs/common"
import { Test, TestingModule } from "@nestjs/testing"
import { CustomerFactory } from "src/customer/factories/customer.factory"
import { CustomerRepository } from "src/customer/repositories/customer.repository"
import { PaymentProviderClientInterface } from "src/payment-provider/interfaces/payment-provider-client.interface"
import { SubscriptionUpdateProduct } from "src/payment-provider/interfaces/subscription-update-params"
import { PaymentProviderService } from "src/payment-provider/services/payment-provider.service"
import { TenantFactory } from "src/tenant/factories/tenant.factory"
import { v4 as uuidv4 } from "uuid"
import { SubscriptionService } from "./subscription.service"

describe("SubscriptionService", () => {
  let service: SubscriptionService
  let customerRepository: jest.Mocked<CustomerRepository>
  let paymentProviderService: jest.Mocked<PaymentProviderService>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SubscriptionService],
    })
      .useMocker(createMock)
      .compile()

    service = module.get<SubscriptionService>(SubscriptionService)
    customerRepository = module.get(CustomerRepository)
    paymentProviderService = module.get(PaymentProviderService)
  })

  describe("updateSubscription", () => {
    it("should update subscription successfully", async () => {
      const tenant = await new TenantFactory().make()
      const customer = await new CustomerFactory().make({
        id: uuidv4(),
        userRef: "test-user-ref",
        tenant,
      })
      const products: SubscriptionUpdateProduct[] = [
        {
          externalRef: "price_123",
          quantity: 1,
        },
      ]

      const mockClient = {
        updateSubscription: jest.fn().mockResolvedValue(undefined),
      } as unknown as PaymentProviderClientInterface

      customerRepository.findOneByUserRef.mockResolvedValue(customer)
      paymentProviderService.forTenant.mockResolvedValue(mockClient)

      await service.updateSubscription({
        userRef: "test-user-ref",
        products,
        tenant,
      })

      expect(customerRepository.findOneByUserRef).toHaveBeenCalledWith(
        "test-user-ref",
        tenant,
      )
      expect(paymentProviderService.forTenant).toHaveBeenCalledWith(tenant.id)
      expect(mockClient.updateSubscription).toHaveBeenCalledWith({
        customerId: customer.id,
        products,
      })
    })

    it("should handle multiple products", async () => {
      const tenant = await new TenantFactory().make()
      const customer = await new CustomerFactory().make({
        id: uuidv4(),
        userRef: "test-user-ref",
        tenant,
      })
      const products: SubscriptionUpdateProduct[] = [
        {
          externalRef: "price_123",
          quantity: 2,
        },
        {
          externalRef: "price_456",
          quantity: 1,
        },
      ]

      const mockClient = {
        updateSubscription: jest.fn().mockResolvedValue(undefined),
      } as unknown as PaymentProviderClientInterface

      customerRepository.findOneByUserRef.mockResolvedValue(customer)
      paymentProviderService.forTenant.mockResolvedValue(mockClient)

      await service.updateSubscription({
        userRef: "test-user-ref",
        products,
        tenant,
      })

      expect(customerRepository.findOneByUserRef).toHaveBeenCalledWith(
        "test-user-ref",
        tenant,
      )
      expect(paymentProviderService.forTenant).toHaveBeenCalledWith(tenant.id)
      expect(mockClient.updateSubscription).toHaveBeenCalledWith({
        customerId: customer.id,
        products,
      })
    })

    it("should throw NotFoundException when customer not found", async () => {
      const tenant = await new TenantFactory().make()
      const products: SubscriptionUpdateProduct[] = [
        {
          externalRef: "price_123",
          quantity: 1,
        },
      ]

      const error = new NotFoundException("Customer not found")
      customerRepository.findOneByUserRef.mockRejectedValue(error)

      await expect(
        service.updateSubscription({
          userRef: "nonexistent-user-ref",
          products,
          tenant,
        }),
      ).rejects.toThrow(NotFoundException)

      expect(customerRepository.findOneByUserRef).toHaveBeenCalledWith(
        "nonexistent-user-ref",
        tenant,
      )
      expect(paymentProviderService.forTenant).not.toHaveBeenCalled()
    })

    it("should propagate payment provider client errors", async () => {
      const tenant = await new TenantFactory().make()
      const customer = await new CustomerFactory().make({
        id: uuidv4(),
        userRef: "test-user-ref",
        tenant,
      })
      const products: SubscriptionUpdateProduct[] = [
        {
          externalRef: "price_123",
          quantity: 1,
        },
      ]

      const clientError = new Error("Payment provider error")
      const mockClient = {
        updateSubscription: jest.fn().mockRejectedValue(clientError),
      } as unknown as PaymentProviderClientInterface

      customerRepository.findOneByUserRef.mockResolvedValue(customer)
      paymentProviderService.forTenant.mockResolvedValue(mockClient)

      await expect(
        service.updateSubscription({
          userRef: "test-user-ref",
          products,
          tenant,
        }),
      ).rejects.toThrow("Payment provider error")

      expect(customerRepository.findOneByUserRef).toHaveBeenCalledWith(
        "test-user-ref",
        tenant,
      )
      expect(paymentProviderService.forTenant).toHaveBeenCalledWith(tenant.id)
      expect(mockClient.updateSubscription).toHaveBeenCalledWith({
        customerId: customer.id,
        products,
      })
    })

    it("should propagate payment provider service errors", async () => {
      const tenant = await new TenantFactory().make()
      const customer = await new CustomerFactory().make({
        id: uuidv4(),
        userRef: "test-user-ref",
        tenant,
      })
      const products: SubscriptionUpdateProduct[] = [
        {
          externalRef: "price_123",
          quantity: 1,
        },
      ]

      const serviceError = new Error("Payment provider service error")
      customerRepository.findOneByUserRef.mockResolvedValue(customer)
      paymentProviderService.forTenant.mockRejectedValue(serviceError)

      await expect(
        service.updateSubscription({
          userRef: "test-user-ref",
          products,
          tenant,
        }),
      ).rejects.toThrow("Payment provider service error")

      expect(customerRepository.findOneByUserRef).toHaveBeenCalledWith(
        "test-user-ref",
        tenant,
      )
      expect(paymentProviderService.forTenant).toHaveBeenCalledWith(tenant.id)
    })
  })

  describe("cancelSubscriptionAtPeriodEnd", () => {
    it("should cancel subscription at period end successfully", async () => {
      const tenant = await new TenantFactory().make()
      const customer = await new CustomerFactory().make({
        id: uuidv4(),
        userRef: "test-user-ref",
        tenant,
      })

      const mockClient = {
        cancelSubscriptionAtPeriodEnd: jest.fn().mockResolvedValue(undefined),
      } as unknown as PaymentProviderClientInterface

      customerRepository.findOneByUserRef.mockResolvedValue(customer)
      paymentProviderService.forTenant.mockResolvedValue(mockClient)

      await service.cancelSubscriptionAtPeriodEnd({
        userRef: "test-user-ref",
        cancelAtPeriodEnd: true,
        tenant,
      })

      expect(customerRepository.findOneByUserRef).toHaveBeenCalledWith(
        "test-user-ref",
        tenant,
      )
      expect(paymentProviderService.forTenant).toHaveBeenCalledWith(tenant.id)
      expect(mockClient.cancelSubscriptionAtPeriodEnd).toHaveBeenCalledWith({
        customerId: customer.id,
        cancelAtPeriodEnd: true,
      })
    })

    it("should resume subscription successfully", async () => {
      const tenant = await new TenantFactory().make()
      const customer = await new CustomerFactory().make({
        id: uuidv4(),
        userRef: "test-user-ref",
        tenant,
      })

      const mockClient = {
        cancelSubscriptionAtPeriodEnd: jest.fn().mockResolvedValue(undefined),
      } as unknown as PaymentProviderClientInterface

      customerRepository.findOneByUserRef.mockResolvedValue(customer)
      paymentProviderService.forTenant.mockResolvedValue(mockClient)

      await service.cancelSubscriptionAtPeriodEnd({
        userRef: "test-user-ref",
        cancelAtPeriodEnd: false,
        tenant,
      })

      expect(customerRepository.findOneByUserRef).toHaveBeenCalledWith(
        "test-user-ref",
        tenant,
      )
      expect(paymentProviderService.forTenant).toHaveBeenCalledWith(tenant.id)
      expect(mockClient.cancelSubscriptionAtPeriodEnd).toHaveBeenCalledWith({
        customerId: customer.id,
        cancelAtPeriodEnd: false,
      })
    })

    it("should throw NotFoundException when customer not found", async () => {
      const tenant = await new TenantFactory().make()

      const error = new NotFoundException("Customer not found")
      customerRepository.findOneByUserRef.mockRejectedValue(error)

      await expect(
        service.cancelSubscriptionAtPeriodEnd({
          userRef: "nonexistent-user-ref",
          cancelAtPeriodEnd: true,
          tenant,
        }),
      ).rejects.toThrow(NotFoundException)

      expect(customerRepository.findOneByUserRef).toHaveBeenCalledWith(
        "nonexistent-user-ref",
        tenant,
      )
      expect(paymentProviderService.forTenant).not.toHaveBeenCalled()
    })

    it("should propagate payment provider client errors", async () => {
      const tenant = await new TenantFactory().make()
      const customer = await new CustomerFactory().make({
        id: uuidv4(),
        userRef: "test-user-ref",
        tenant,
      })

      const clientError = new Error("Payment provider error")
      const mockClient = {
        cancelSubscriptionAtPeriodEnd: jest.fn().mockRejectedValue(clientError),
      } as unknown as PaymentProviderClientInterface

      customerRepository.findOneByUserRef.mockResolvedValue(customer)
      paymentProviderService.forTenant.mockResolvedValue(mockClient)

      await expect(
        service.cancelSubscriptionAtPeriodEnd({
          userRef: "test-user-ref",
          cancelAtPeriodEnd: true,
          tenant,
        }),
      ).rejects.toThrow("Payment provider error")

      expect(customerRepository.findOneByUserRef).toHaveBeenCalledWith(
        "test-user-ref",
        tenant,
      )
      expect(paymentProviderService.forTenant).toHaveBeenCalledWith(tenant.id)
      expect(mockClient.cancelSubscriptionAtPeriodEnd).toHaveBeenCalledWith({
        customerId: customer.id,
        cancelAtPeriodEnd: true,
      })
    })

    it("should propagate payment provider service errors", async () => {
      const tenant = await new TenantFactory().make()
      const customer = await new CustomerFactory().make({
        id: uuidv4(),
        userRef: "test-user-ref",
        tenant,
      })

      const serviceError = new Error("Payment provider service error")
      customerRepository.findOneByUserRef.mockResolvedValue(customer)
      paymentProviderService.forTenant.mockRejectedValue(serviceError)

      await expect(
        service.cancelSubscriptionAtPeriodEnd({
          userRef: "test-user-ref",
          cancelAtPeriodEnd: true,
          tenant,
        }),
      ).rejects.toThrow("Payment provider service error")

      expect(customerRepository.findOneByUserRef).toHaveBeenCalledWith(
        "test-user-ref",
        tenant,
      )
      expect(paymentProviderService.forTenant).toHaveBeenCalledWith(tenant.id)
    })
  })
})
