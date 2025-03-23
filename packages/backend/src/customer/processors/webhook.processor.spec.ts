import { Test, TestingModule } from "@nestjs/testing"
import axios from "axios"
import { Job } from "bullmq"
import { Customer } from "src/customer/entities/customer.entity"
import { CustomerFactory } from "src/customer/factories/customer.factory"
import { PaymentProviderClientInterface } from "src/payment-provider/interfaces/payment-provider-client.interface"
import { PaymentProviderService } from "../../payment-provider/services/payment-provider.service"
import { SEND_WEBHOOK_JOB } from "../customer.constants"
import { CustomerUpdatedEvent } from "../events/customer-updated.event"
import { CustomerRepository } from "../repositories/customer.repository"
import { WebhookProcessor } from "./webhook.processor"

jest.mock("axios")
const mockedAxios = axios as jest.Mocked<typeof axios>

describe("WebhookProcessor", () => {
  let processor: WebhookProcessor
  let customerRepository: jest.Mocked<CustomerRepository>
  let paymentProviderService: jest.Mocked<PaymentProviderService>
  let customer: Customer

  const mockSubscriptions = [
    { id: "sub-1", status: "active" },
    { id: "sub-2", status: "canceled" },
  ]

  const mockClient = {
    getSubscriptions: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookProcessor,
        {
          provide: CustomerRepository,
          useValue: {
            findOneWithTenant: jest.fn(),
          },
        },
        {
          provide: PaymentProviderService,
          useValue: {
            forTenant: jest.fn(),
          },
        },
      ],
    }).compile()

    processor = module.get<WebhookProcessor>(WebhookProcessor)
    customerRepository = module.get(CustomerRepository)
    paymentProviderService = module.get(PaymentProviderService)

    customer = await new CustomerFactory().make()

    // Setup default mocks
    customerRepository.findOneWithTenant.mockResolvedValue(customer)
    paymentProviderService.forTenant.mockResolvedValue(
      mockClient as unknown as PaymentProviderClientInterface,
    )
    mockClient.getSubscriptions.mockResolvedValue(mockSubscriptions)
    mockedAxios.post.mockResolvedValue({ status: 200 })
  })

  describe("process", () => {
    it("should process SEND_WEBHOOK_JOB correctly", async () => {
      // Arrange
      const mockJob = {
        name: SEND_WEBHOOK_JOB,
        data: { customerId: customer.id } as CustomerUpdatedEvent,
      } as Job

      // Act
      await processor.process(mockJob)

      // Assert
      expect(customerRepository.findOneWithTenant).toHaveBeenCalledWith(
        customer.id,
      )
      expect(paymentProviderService.forTenant).toHaveBeenCalledWith(
        customer.tenant.id,
      )
      expect(mockClient.getSubscriptions).toHaveBeenCalledWith(customer.id)
      expect(mockedAxios.post).toHaveBeenCalledWith(
        customer.tenant.webhookUrl,
        {
          data: expect.objectContaining({
            type: "customer.updated",
            customer: expect.anything(),
          }),
        },
      )
    })

    it("should not send webhook if customer is not found", async () => {
      // Arrange
      customerRepository.findOneWithTenant.mockResolvedValue(null)
      const mockJob = {
        name: SEND_WEBHOOK_JOB,
        data: { customerId: "non-existent" } as CustomerUpdatedEvent,
      } as Job

      // Act
      await processor.process(mockJob)

      // Assert
      expect(customerRepository.findOneWithTenant).toHaveBeenCalledWith(
        "non-existent",
      )
      expect(paymentProviderService.forTenant).not.toHaveBeenCalled()
      expect(mockClient.getSubscriptions).not.toHaveBeenCalled()
      expect(mockedAxios.post).not.toHaveBeenCalled()
    })

    it("should ignore jobs with unknown names", async () => {
      // Arrange
      const mockJob = {
        name: "UNKNOWN_JOB",
        data: { customerId: "customer-123" },
      } as Job

      // Act
      await processor.process(mockJob)

      // Assert
      expect(customerRepository.findOneWithTenant).not.toHaveBeenCalled()
    })
  })

  describe("error handling", () => {
    it("should handle webhook request failures", async () => {
      // Arrange
      mockedAxios.post.mockRejectedValue(new Error("Network error"))
      const mockJob = {
        name: SEND_WEBHOOK_JOB,
        data: { customerId: "customer-123" } as CustomerUpdatedEvent,
      } as Job

      // Act & Assert
      await expect(processor.process(mockJob)).rejects.toThrow("Network error")
      expect(mockedAxios.post).toHaveBeenCalled()
    })

    it("should handle payment provider client errors", async () => {
      // Arrange
      mockClient.getSubscriptions.mockRejectedValue(new Error("Provider error"))
      const mockJob = {
        name: SEND_WEBHOOK_JOB,
        data: { customerId: "customer-123" } as CustomerUpdatedEvent,
      } as Job

      // Act & Assert
      await expect(processor.process(mockJob)).rejects.toThrow("Provider error")
      expect(mockClient.getSubscriptions).toHaveBeenCalled()
      expect(mockedAxios.post).not.toHaveBeenCalled()
    })
  })
})
