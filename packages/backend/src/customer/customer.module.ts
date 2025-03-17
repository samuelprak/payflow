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
import { CheckoutSessionService } from "src/customer/services/checkout.service"
import { BullModule } from "@nestjs/bullmq"
import { WEBHOOK_QUEUE } from "src/customer/customer.constants"
import { WebhookProcessor } from "src/customer/processors/webhook.processor"
import { SendWebhookOnCustomerUpdatedListener } from "src/customer/listeners/send-webhook-on-customer-updated.listener"
import { PortalSessionController } from "src/customer/controllers/portal-session.controller"
import { PortalSessionService } from "src/customer/services/portal-session.service"

@Module({
  imports: [
    TypeOrmModule.forFeature([Customer]),
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
  ],
  controllers: [
    CustomerController,
    CheckoutSessionController,
    PortalSessionController,
  ],
})
export class CustomerModule {}
