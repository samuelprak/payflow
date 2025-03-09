import { Module } from "@nestjs/common"
import { StubPaymentProvider } from "src/payment-provider/tests/stub-payment-provider"

@Module({
  providers: [StubPaymentProvider],
  exports: [StubPaymentProvider],
})
export class StubPaymentProviderModule {}
