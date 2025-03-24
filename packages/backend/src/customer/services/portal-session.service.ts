import { Injectable } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { Customer } from "src/customer/entities/customer.entity"
import { PortalSession } from "src/customer/entities/portal-session.entity"
import { PortalSessionRepository } from "src/customer/repositories/portal-session.repository"
import { BasePortalSession } from "src/payment-provider/interfaces/base-portal-session"
import { PaymentProviderService } from "src/payment-provider/services/payment-provider.service"
import { Tenant } from "src/tenant/entities/tenant.entity"

type CreatePortalSessionParams = {
  tenant: Tenant
  customer: Customer
  returnUrl: string
}

@Injectable()
export class PortalSessionService {
  constructor(
    private readonly repository: PortalSessionRepository,
    private readonly configService: ConfigService,
    private readonly paymentProviderService: PaymentProviderService,
  ) {}

  async createPortalSession({
    tenant,
    customer,
    returnUrl,
  }: CreatePortalSessionParams) {
    const portalSession = await this.repository.create({
      tenant,
      customer,
      returnUrl,
    })

    return {
      portalUrl: `${this.configService.get("SERVER_URL")}/portal/${portalSession.id}`,
    }
  }

  async getClientPortalSession(id: string): Promise<BasePortalSession> {
    const portalSession = await this.repository.findOneOrFail(id)

    const client = await this.paymentProviderService.forTenant(
      portalSession.tenant.id,
    )
    return client.createPortalSession({
      customerId: portalSession.customer.id,
      returnUrl: `${this.configService.get("SERVER_URL")}/portal/${portalSession.id}/return`,
    })
  }

  async getPortalSession(id: string): Promise<PortalSession> {
    return this.repository.findOneOrFail(id)
  }
}
