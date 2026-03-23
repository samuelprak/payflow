import { SharedDatabaseModule } from "@lyrolab/nest-shared/database"
import { CheckoutSession } from "src/customer/entities/checkout-session.entity"
import { Customer } from "src/customer/entities/customer.entity"
import { PortalSession } from "src/customer/entities/portal-session.entity"
import { StripeAccount } from "src/stripe/entities/stripe-account.entity"
import { StripeCustomer } from "src/stripe/entities/stripe-customer.entity"
import { StripeWebhookEvent } from "src/stripe/entities/stripe-webhook-event.entity"
import { Tenant } from "src/tenant/entities/tenant.entity"

export const TestDatabaseModule = SharedDatabaseModule.forTest({
  entities: [
    Tenant,
    Customer,
    StripeAccount,
    StripeCustomer,
    StripeWebhookEvent,
    PortalSession,
    CheckoutSession,
  ],
})
