import { ConfigModule } from "@nestjs/config"
import { NestExpressApplication } from "@nestjs/platform-express"
import { Test } from "@nestjs/testing"
import { CaslModule } from "nest-casl"
import { CaslUser } from "src/casl/models/casl-user"
import { Roles } from "src/casl/models/roles"
import { CustomerModule } from "src/customer/customer.module"
import { CustomerFactory } from "src/customer/factories/customer.factory"
import { UpgradeSubscriptionDto } from "src/customer/models/dto/upgrade-subscription.dto"
import { StubPaymentProviderModule } from "src/payment-provider/tests/stub-payment-provider.module"
import { CustomRequest } from "src/request"
import { TenantFactory } from "src/tenant/factories/tenant.factory"
import * as request from "supertest"
import { asTenant } from "test/helpers/as-tenant"
import { createTestingApplication } from "test/utils/create-testing-application"
import { TestBullModule } from "test/utils/test-bull.module"
import { TestDatabaseModule } from "test/utils/test-database/test-database.module"

describe("SubscriptionController", () => {
  let app: NestExpressApplication

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        TestBullModule.forRoot(),
        TestDatabaseModule.forRoot(),
        CaslModule.forRoot<Roles, CaslUser, CustomRequest>({
          getUserFromRequest: (request: CustomRequest) =>
            new CaslUser(request.tenant.id),
        }),
        CustomerModule,
        StubPaymentProviderModule,
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              SERVER_URL: "https://example.com",
            }),
          ],
        }),
      ],
    }).compile()

    app = await createTestingApplication(moduleRef)
  })

  describe("POST /subscriptions/upgrade", () => {
    it("upgrades subscription successfully", async () => {
      const tenant = await new TenantFactory().create()
      const customer = await new CustomerFactory().create({
        userRef: "test-user-ref",
        tenant,
      })

      const upgradeDto: UpgradeSubscriptionDto = {
        userRef: customer.userRef,
        products: [
          {
            externalRef: "price_123",
            quantity: 1,
          },
        ],
      }

      await request(app.getHttpServer())
        .post("/subscriptions/upgrade")
        .set(asTenant(tenant))
        .send(upgradeDto)
        .expect(201)
        .expect({ success: true })
    })

    it("handles multiple products", async () => {
      const tenant = await new TenantFactory().create()
      const customer = await new CustomerFactory().create({
        userRef: "test-user-ref-multi",
        tenant,
      })

      const upgradeDto: UpgradeSubscriptionDto = {
        userRef: customer.userRef,
        products: [
          {
            externalRef: "price_123",
            quantity: 2,
          },
          {
            externalRef: "price_456",
            quantity: 1,
          },
        ],
      }

      await request(app.getHttpServer())
        .post("/subscriptions/upgrade")
        .set(asTenant(tenant))
        .send(upgradeDto)
        .expect(201)
        .expect({ success: true })
    })

    it("returns 404 when customer not found", async () => {
      const tenant = await new TenantFactory().create()

      const upgradeDto: UpgradeSubscriptionDto = {
        userRef: "nonexistent-user-ref",
        products: [
          {
            externalRef: "price_123",
            quantity: 1,
          },
        ],
      }

      await request(app.getHttpServer())
        .post("/subscriptions/upgrade")
        .set(asTenant(tenant))
        .send(upgradeDto)
        .expect(404)
    })

    it("returns 400 for invalid request body", async () => {
      const tenant = await new TenantFactory().create()

      const invalidDto = {
        // missing userRef entirely
        products: [], // empty products array
      }

      await request(app.getHttpServer())
        .post("/subscriptions/upgrade")
        .set(asTenant(tenant))
        .send(invalidDto)
        .expect(400)
    })

    it("returns 400 for invalid product quantity", async () => {
      const tenant = await new TenantFactory().create()
      const customer = await new CustomerFactory().create({
        userRef: "test-user-ref-invalid-qty",
        tenant,
      })

      const upgradeDto = {
        userRef: customer.userRef,
        products: [
          {
            externalRef: "price_123",
            quantity: 0, // invalid quantity (should be >= 1)
          },
        ],
      }

      await request(app.getHttpServer())
        .post("/subscriptions/upgrade")
        .set(asTenant(tenant))
        .send(upgradeDto)
        .expect(400)
    })

    it("returns 400 for missing externalRef", async () => {
      const tenant = await new TenantFactory().create()
      const customer = await new CustomerFactory().create({
        userRef: "test-user-ref-missing-ref",
        tenant,
      })

      const upgradeDto = {
        userRef: customer.userRef,
        products: [
          {
            quantity: 1,
            // missing externalRef
          },
        ],
      }

      await request(app.getHttpServer())
        .post("/subscriptions/upgrade")
        .set(asTenant(tenant))
        .send(upgradeDto)
        .expect(400)
    })

    it("returns 401 when tenant API key is missing", async () => {
      const upgradeDto: UpgradeSubscriptionDto = {
        userRef: "test-user-ref",
        products: [
          {
            externalRef: "price_123",
            quantity: 1,
          },
        ],
      }

      await request(app.getHttpServer())
        .post("/subscriptions/upgrade")
        .send(upgradeDto)
        .expect(401)
    })

    it("returns 401 when tenant API key is invalid", async () => {
      const upgradeDto: UpgradeSubscriptionDto = {
        userRef: "test-user-ref",
        products: [
          {
            externalRef: "price_123",
            quantity: 1,
          },
        ],
      }

      await request(app.getHttpServer())
        .post("/subscriptions/upgrade")
        .set("x-api-key", "invalid-api-key")
        .send(upgradeDto)
        .expect(401)
    })
  })
})
