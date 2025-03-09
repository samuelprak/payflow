import { Injectable } from "@nestjs/common"
import { Customer } from "src/customer/entities/customer.entity"
import { CreateCheckoutDto } from "src/customer/models/dto/create-checkout.dto"
import { PaymentProviderService } from "src/payment-provider/services/payment-provider.service"
import { Tenant } from "src/tenant/entities/tenant.entity"

type CreateCheckoutParams = {
  tenant: Tenant
  customer: Customer
  params: CreateCheckoutDto
}

@Injectable()
export class CheckoutService {
  constructor(
    private readonly paymentProviderService: PaymentProviderService,
  ) {}

  async createCheckout({ tenant, customer, params }: CreateCheckoutParams) {
    const client = await this.paymentProviderService.forTenant(tenant.id)
    return client.createCheckout({
      customerId: customer.id,
      products: params.products,
    })
  }
}
