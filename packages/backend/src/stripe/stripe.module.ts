import { RedisConfig } from "@lyrolab/nest-shared/redis"
import { Module } from "@nestjs/common"
import { DiscoveryModule } from "@nestjs/core"
import { TypeOrmModule } from "@nestjs/typeorm"
import Redis from "ioredis"
import { StripeWebhookController } from "src/stripe/controllers/stripe-webhook.controller"
import { StripeAccount } from "src/stripe/entities/stripe-account.entity"
import { StripeCustomer } from "src/stripe/entities/stripe-customer.entity"
import { StripeWebhookEvent } from "src/stripe/entities/stripe-webhook-event.entity"
import { CustomerUpdatedWebhookHandler } from "src/stripe/handlers/customer-updated-webhook.handler"
import { EarlyFraudWarningWebhookHandler } from "src/stripe/handlers/early-fraud-warning-webhook.handler"
import { InvoicePaidWebhookHandler } from "src/stripe/handlers/invoice-paid-webhook.handler"
import { StripeAccountRepository } from "src/stripe/repositories/stripe-account.repository"
import { StripeCustomerRepository } from "src/stripe/repositories/stripe-customer.repository"
import { StripeWebhookEventRepository } from "src/stripe/repositories/stripe-webhook-event.repository"
import { StripePaymentProvider } from "src/stripe/services/stripe-payment-provider"
import { StripePaymentProviderClientFactory } from "src/stripe/services/stripe-payment-provider-client-factory"
import { StripeWebhookDispatcherService } from "src/stripe/services/stripe-webhook-dispatcher.service"
import { StripeWebhookService } from "src/stripe/services/stripe-webhook.service"
import { WebhookDeduplicationService } from "src/stripe/services/webhook-deduplication.service"

@Module({
  imports: [
    DiscoveryModule,
    TypeOrmModule.forFeature([
      StripeAccount,
      StripeCustomer,
      StripeWebhookEvent,
    ]),
  ],
  providers: [
    {
      provide: "REDIS_CLIENT",
      useFactory: (redisConfig: RedisConfig) => {
        return new Redis(redisConfig.url)
      },
      inject: [RedisConfig],
    },
    StripeAccountRepository,
    StripeCustomerRepository,
    StripeWebhookEventRepository,
    StripePaymentProvider,
    StripePaymentProviderClientFactory,
    StripeWebhookService,
    StripeWebhookDispatcherService,
    WebhookDeduplicationService,
    CustomerUpdatedWebhookHandler,
    InvoicePaidWebhookHandler,
    EarlyFraudWarningWebhookHandler,
  ],
  controllers: [StripeWebhookController],
  exports: [],
})
export class StripeModule {}
