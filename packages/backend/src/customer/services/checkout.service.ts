import { Injectable } from "@nestjs/common"
import { Customer } from "src/customer/entities/customer.entity"
import { CreateCheckoutDto } from "src/customer/models/dto/create-checkout.dto"
import { PaymentProviderService } from "src/payment-provider/services/payment-provider.service"
import { Tenant } from "src/tenant/entities/tenant.entity"

type CreateCheckoutSessionParams = {
  tenant: Tenant
  customer: Customer
  params: CreateCheckoutDto
}

@Injectable()
export class CheckoutSessionService {
  constructor(
    private readonly paymentProviderService: PaymentProviderService,
  ) {}

  async createCheckoutSession({
    tenant,
    customer,
    params,
  }: CreateCheckoutSessionParams) {
    const client = await this.paymentProviderService.forTenant(tenant.id)
    return client.createCheckoutSession({
      customerId: customer.id,
      products: params.products,
    })
  }
}
