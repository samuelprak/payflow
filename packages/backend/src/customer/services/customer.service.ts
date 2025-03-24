import { Injectable, NotFoundException } from "@nestjs/common"
import { CustomerGet } from "src/customer/models/dto/customer-get.dto"
import { CustomerRepository } from "src/customer/repositories/customer.repository"
import { PaymentProviderService } from "src/payment-provider/services/payment-provider.service"
import { Tenant } from "src/tenant/entities/tenant.entity"

type SyncCustomerParams = {
  email: string
  userRef: string
  tenant: Tenant
}

@Injectable()
export class CustomerService {
  constructor(
    private readonly repository: CustomerRepository,
    private readonly paymentProviderService: PaymentProviderService,
  ) {}

  async syncCustomer({ email, userRef, tenant }: SyncCustomerParams) {
    const customer = await this.repository.sync({ email, userRef, tenant })

    const client = await this.paymentProviderService.forTenant(tenant.id)
    await client.syncCustomer(customer.toBaseCustomer())
    const subscriptions = await client.getSubscriptions(customer.id)

    return CustomerGet.fromEntity(customer, subscriptions)
  }

  async findById(id: string) {
    return this.repository.findOneWithTenant(id)
  }

  async findByIdOrFail(id: string) {
    const customer = await this.findById(id)

    if (!customer) {
      throw new NotFoundException(`Customer with id ${id} not found`)
    }

    return customer
  }
}
