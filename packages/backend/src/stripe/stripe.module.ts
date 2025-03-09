import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { StripeAccount } from "src/stripe/entities/stripe-account.entity"
import { StripeCustomer } from "src/stripe/entities/stripe-customer.entity"
import { StripeAccountRepository } from "src/stripe/repositories/stripe-account.repository"
import { StripeCustomerRepository } from "src/stripe/repositories/stripe-customer.repository"
import { StripePaymentProvider } from "src/stripe/services/stripe-payment-provider"
import { StripePaymentProviderClientFactory } from "src/stripe/services/stripe-payment-provider-client-factory"

@Module({
  imports: [TypeOrmModule.forFeature([StripeAccount, StripeCustomer])],
  providers: [
    StripeAccountRepository,
    StripeCustomerRepository,
    StripePaymentProvider,
    StripePaymentProviderClientFactory,
  ],
  exports: [],
})
export class StripeModule {}
