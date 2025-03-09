import { PaymentProviderClientInterface } from "src/payment-provider/interfaces/payment-provider-client.interface"

export interface PaymentProviderInterface {
  getClientForTenant(
    tenantId: string,
  ): Promise<PaymentProviderClientInterface | null>
}
