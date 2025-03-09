import { createMock } from "@golevelup/ts-jest"
import { Test, TestingModule } from "@nestjs/testing"
import { CustomerFactory } from "src/customer/factories/customer.factory"
import { CustomerRepository } from "src/customer/repositories/customer.repository"
import { PaymentProviderService } from "src/payment-provider/services/payment-provider.service"
import { v4 as uuidv4 } from "uuid"
import { CustomerService } from "./customer.service"
import { PaymentProviderClientInterface } from "src/payment-provider/interfaces/payment-provider-client.interface"

describe("CustomerService", () => {
  let service: CustomerService
  let repository: jest.Mocked<CustomerRepository>
  let paymentProviderService: jest.Mocked<PaymentProviderService>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CustomerService],
    })
      .useMocker(createMock)
      .compile()

    service = module.get<CustomerService>(CustomerService)
    repository = module.get(CustomerRepository)
    paymentProviderService = module.get(PaymentProviderService)
  })

  describe("syncCustomer", () => {
    it("returns a customer", async () => {
      const customer = await new CustomerFactory().make({ id: uuidv4() })

      const syncCustomerFn = jest.fn()
      repository.sync.mockResolvedValue(customer)
      paymentProviderService.forTenant.mockResolvedValue({
        syncCustomer: syncCustomerFn,
      } as unknown as PaymentProviderClientInterface)

      const createdCustomer = await service.syncCustomer({
        email: "test@email.com",
        userRef: "test-user-ref",
        tenant: customer.tenant,
      })

      expect(createdCustomer).toBeDefined()
      expect(createdCustomer.id).toEqual(customer.id)
      expect(createdCustomer.email).toEqual("test@email.com")
      expect(createdCustomer.userRef).toEqual("test-user-ref")

      expect(repository.sync).toHaveBeenCalledWith({
        email: "test@email.com",
        userRef: "test-user-ref",
        tenant: customer.tenant,
      })
      expect(paymentProviderService.forTenant).toHaveBeenCalledWith(
        customer.tenant.id,
      )
      expect(syncCustomerFn).toHaveBeenCalledWith(customer.toBaseCustomer())
    })
  })
})
