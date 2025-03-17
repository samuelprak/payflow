import { Injectable } from "@nestjs/common"
import { PaymentProviderService } from "src/payment-provider/services/payment-provider.service"
import { Tenant } from "src/tenant/entities/tenant.entity"
import { Customer } from "src/customer/entities/customer.entity"

type CreatePortalSessionParams = {
  tenant: Tenant
  customer: Customer
}

@Injectable()
export class PortalSessionService {
  constructor(
    private readonly paymentProviderService: PaymentProviderService,
  ) {}

  async createPortalSession({ tenant, customer }: CreatePortalSessionParams) {
    const client = await this.paymentProviderService.forTenant(tenant.id)
    return client.createPortalSession({ customerId: customer.id })
  }
}
