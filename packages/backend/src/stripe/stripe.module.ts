import { Module } from "@nestjs/common"
import { DiscoveryModule } from "@nestjs/core"
import { TypeOrmModule } from "@nestjs/typeorm"
import { StripeWebhookController } from "src/stripe/controllers/stripe-webhook.controller"
import { StripeAccount } from "src/stripe/entities/stripe-account.entity"
import { StripeCustomer } from "src/stripe/entities/stripe-customer.entity"
import { CustomerUpdatedWebhookHandler } from "src/stripe/handlers/customer-updated-webhook.handler"
import { EarlyFraudWarningWebhookHandler } from "src/stripe/handlers/early-fraud-warning-webhook.handler"
import { InvoicePaidWebhookHandler } from "src/stripe/handlers/invoice-paid-webhook.handler"
import { StripeAccountRepository } from "src/stripe/repositories/stripe-account.repository"
import { StripeCustomerRepository } from "src/stripe/repositories/stripe-customer.repository"
import { StripePaymentProvider } from "src/stripe/services/stripe-payment-provider"
import { StripePaymentProviderClientFactory } from "src/stripe/services/stripe-payment-provider-client-factory"
import { StripeWebhookDispatcherService } from "src/stripe/services/stripe-webhook-dispatcher.service"
import { StripeWebhookService } from "src/stripe/services/stripe-webhook.service"

@Module({
  imports: [
    DiscoveryModule,
    TypeOrmModule.forFeature([StripeAccount, StripeCustomer]),
  ],
  providers: [
    StripeAccountRepository,
    StripeCustomerRepository,
    StripePaymentProvider,
    StripePaymentProviderClientFactory,
    StripeWebhookService,
    StripeWebhookDispatcherService,
    CustomerUpdatedWebhookHandler,
    InvoicePaidWebhookHandler,
    EarlyFraudWarningWebhookHandler,
  ],
  controllers: [StripeWebhookController],
  exports: [],
})
export class StripeModule {}
