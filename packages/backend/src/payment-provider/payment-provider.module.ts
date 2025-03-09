import { Module } from "@nestjs/common"
import { DiscoveryModule } from "@nestjs/core"
import { PaymentProviderService } from "src/payment-provider/services/payment-provider.service"

@Module({
  imports: [DiscoveryModule],
  providers: [PaymentProviderService],
  exports: [PaymentProviderService],
})
export class PaymentProviderModule {}
