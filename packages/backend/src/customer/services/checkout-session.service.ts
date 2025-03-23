import { Injectable } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { CheckoutSession } from "src/customer/entities/checkout-session.entity"
import { Customer } from "src/customer/entities/customer.entity"
import { CreateCheckoutSessionDto } from "src/customer/models/dto/create-checkout.dto"
import { CheckoutSessionRepository } from "src/customer/repositories/checkout-session.repository"
import { BaseCheckoutSession } from "src/payment-provider/interfaces/base-checkout-session"
import { PaymentProviderService } from "src/payment-provider/services/payment-provider.service"
import { Tenant } from "src/tenant/entities/tenant.entity"

type CreateCheckoutSessionParams = {
  tenant: Tenant
  customer: Customer
  configuration: CreateCheckoutSessionDto
}

@Injectable()
export class CheckoutSessionService {
  constructor(
    private readonly repository: CheckoutSessionRepository,
    private readonly configService: ConfigService,
    private readonly paymentProviderService: PaymentProviderService,
  ) {}

  async createCheckoutSession({
    tenant,
    customer,
    configuration,
  }: CreateCheckoutSessionParams) {
    const checkoutSession = await this.repository.create({
      tenant,
      customer,
      configuration,
    })

    return {
      checkoutUrl: `${this.configService.get("SERVER_URL")}/checkout/${checkoutSession.id}`,
    }
  }

  async getClientCheckoutSession(id: string): Promise<BaseCheckoutSession> {
    const checkoutSession = await this.repository.findOneOrFail(id)

    const client = await this.paymentProviderService.forTenant(
      checkoutSession.tenant.id,
    )
    return client.createCheckoutSession({
      customerId: checkoutSession.customer.id,
      products: checkoutSession.configuration.products,
      successUrl: `${this.configService.get("SERVER_URL")}/checkout/${checkoutSession.id}/success`,
      cancelUrl: `${this.configService.get("SERVER_URL")}/checkout/${checkoutSession.id}/cancel`,
    })
  }

  async getCheckoutSession(id: string): Promise<CheckoutSession> {
    return this.repository.findOneOrFail(id)
  }
}
