import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { CaslModule } from "nest-casl"
import { customerPermissions } from "src/customer/permissions/customer.permissions"
import { CustomerRepository } from "src/customer/repositories/customer.repository"
import { PaymentProviderModule } from "src/payment-provider/payment-provider.module"
import { TenantModule } from "src/tenant/tenant.module"
import { CustomerController } from "./controllers/customer.controller"
import { Customer } from "./entities/customer.entity"
import { CustomerService } from "./services/customer.service"
import { CheckoutSessionController } from "src/customer/controllers/checkout-session.controller"
import { BullModule } from "@nestjs/bullmq"
import { WEBHOOK_QUEUE } from "src/customer/customer.constants"
import { WebhookProcessor } from "src/customer/processors/webhook.processor"
import { SendWebhookOnCustomerUpdatedListener } from "src/customer/listeners/send-webhook-on-customer-updated.listener"
import { PortalSessionController } from "src/customer/controllers/portal-session.controller"
import { PortalSessionService } from "src/customer/services/portal-session.service"
import { CheckoutSessionRepository } from "src/customer/repositories/checkout-session.repository"
import { CheckoutSession } from "src/customer/entities/checkout-session.entity"
import { CheckoutSessionService } from "src/customer/services/checkout-session.service"
import { CheckoutController } from "src/customer/controllers/checkout.controller"
import { PortalController } from "src/customer/controllers/portal.controller"
import { SubscriptionController } from "src/customer/controllers/subscription.controller"
import { PortalSession } from "src/customer/entities/portal-session.entity"
import { PortalSessionRepository } from "src/customer/repositories/portal-session.repository"
import { SubscriptionService } from "src/customer/services/subscription.service"

@Module({
  imports: [
    TypeOrmModule.forFeature([Customer, CheckoutSession, PortalSession]),
    CaslModule.forFeature({ permissions: customerPermissions }),
    TenantModule,
    PaymentProviderModule,
    BullModule.registerQueue({
      name: WEBHOOK_QUEUE,
      defaultJobOptions: {
        attempts: 20,
        backoff: { type: "exponential", delay: 1000 },
      },
    }),
  ],
  providers: [
    CustomerService,
    CustomerRepository,
    CheckoutSessionService,
    WebhookProcessor,
    SendWebhookOnCustomerUpdatedListener,
    PortalSessionService,
    CheckoutSessionRepository,
    PortalSessionRepository,
    SubscriptionService,
  ],
  controllers: [
    CustomerController,
    CheckoutSessionController,
    PortalSessionController,
    CheckoutController,
    PortalController,
    SubscriptionController,
  ],
})
export class CustomerModule {}
