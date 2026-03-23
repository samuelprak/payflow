import { NestFactory } from "@nestjs/core"
import { ConfigService } from "@nestjs/config"
import { AppModule } from "src/app.module"
import { DataSource } from "typeorm"
import { Tenant } from "src/tenant/entities/tenant.entity"
import { StripeAccount } from "src/stripe/entities/stripe-account.entity"
import { Customer } from "src/customer/entities/customer.entity"
import { StripeCustomer } from "src/stripe/entities/stripe-customer.entity"

function requireEnv(config: ConfigService, key: string): string {
  const value = config.get<string>(key)
  if (!value) {
    throw new Error(`Missing required env variable: ${key}`)
  }
  return value
}

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule)
  const config = app.get(ConfigService)
  const dataSource = app.get(DataSource)

  const STRIPE_PUBLISHABLE_KEY = requireEnv(
    config,
    "SEED_STRIPE_PUBLISHABLE_KEY",
  )
  const STRIPE_SECRET_KEY = requireEnv(config, "SEED_STRIPE_SECRET_KEY")
  const STRIPE_WEBHOOK_SECRET = requireEnv(config, "SEED_STRIPE_WEBHOOK_SECRET")
  const STRIPE_CUSTOMER_ID = requireEnv(config, "SEED_STRIPE_CUSTOMER_ID")

  const tenantRepo = dataSource.getRepository(Tenant)
  const stripeAccountRepo = dataSource.getRepository(StripeAccount)
  const customerRepo = dataSource.getRepository(Customer)
  const stripeCustomerRepo = dataSource.getRepository(StripeCustomer)

  // 1. Stripe Account
  let stripeAccount = await stripeAccountRepo.findOneBy({
    stripePublishableKey: STRIPE_PUBLISHABLE_KEY,
  })
  if (!stripeAccount) {
    stripeAccount = await stripeAccountRepo.save(
      stripeAccountRepo.create({
        stripePublishableKey: STRIPE_PUBLISHABLE_KEY,
        stripeSecretKey: STRIPE_SECRET_KEY,
        stripeWebhookSecret: STRIPE_WEBHOOK_SECRET,
      }),
    )
  }

  // 2. Tenant
  const tenantName = "Dev Tenant"
  let tenant = await tenantRepo.findOne({
    where: { name: tenantName },
    relations: { stripeAccounts: true },
  })
  if (!tenant) {
    tenant = await tenantRepo.save(
      tenantRepo.create({
        name: tenantName,
        apiKey: "dev-api-key",
        webhookUrl: "http://localhost:3001/webhooks",
        stripeAccounts: [stripeAccount],
      }),
    )
  } else if (!tenant.stripeAccounts.some((sa) => sa.id === stripeAccount.id)) {
    tenant.stripeAccounts.push(stripeAccount)
    await tenantRepo.save(tenant)
  }

  // 3. Customer
  let customer = await customerRepo.findOneBy({
    userRef: "dev-user-1",
    tenant: { id: tenant.id },
  })
  if (!customer) {
    customer = await customerRepo.save(
      customerRepo.create({
        email: "dev@example.com",
        userRef: "dev-user-1",
        tenant,
      }),
    )
  }

  // 4. Stripe Customer
  const stripeCustomer = await stripeCustomerRepo.findOneBy({
    customer: { id: customer.id },
  })
  if (!stripeCustomer) {
    await stripeCustomerRepo.save(
      stripeCustomerRepo.create({
        customer,
        stripeCustomerId: STRIPE_CUSTOMER_ID,
      }),
    )
  }

  console.log("Seed completed successfully")
  console.log(`  Tenant: ${tenant.name} (${tenant.id})`)
  console.log(`  Customer: ${customer.email} (${customer.id})`)
  console.log(`  Stripe Account: ${stripeAccount.id}`)

  await app.close()
}

seed().catch((error) => {
  console.error("Seed failed:", error)
  process.exit(1)
})
