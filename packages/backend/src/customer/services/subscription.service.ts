import { Injectable } from "@nestjs/common"
import { CustomerRepository } from "src/customer/repositories/customer.repository"
import { SubscriptionUpdateProduct } from "src/payment-provider/interfaces/subscription-update-params"
import { PaymentProviderService } from "src/payment-provider/services/payment-provider.service"
import { Tenant } from "src/tenant/entities/tenant.entity"

type UpdateSubscriptionParams = {
  userRef: string
  products: SubscriptionUpdateProduct[]
  tenant: Tenant
}

type CancelSubscriptionAtPeriodEndParams = {
  userRef: string
  cancelAtPeriodEnd: boolean
  tenant: Tenant
}

@Injectable()
export class SubscriptionService {
  constructor(
    private readonly customerRepository: CustomerRepository,
    private readonly paymentProviderService: PaymentProviderService,
  ) {}

  async updateSubscription({
    userRef,
    products,
    tenant,
  }: UpdateSubscriptionParams) {
    const customer = await this.customerRepository.findOneByUserRef(
      userRef,
      tenant,
    )

    const client = await this.paymentProviderService.forTenant(tenant.id)
    await client.updateSubscription({
      customerId: customer.id,
      products,
    })
  }

  async cancelSubscriptionAtPeriodEnd({
    userRef,
    cancelAtPeriodEnd,
    tenant,
  }: CancelSubscriptionAtPeriodEndParams) {
    const customer = await this.customerRepository.findOneByUserRef(
      userRef,
      tenant,
    )

    const client = await this.paymentProviderService.forTenant(tenant.id)
    await client.cancelSubscriptionAtPeriodEnd({
      customerId: customer.id,
      cancelAtPeriodEnd,
    })
  }
}
