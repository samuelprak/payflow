import { ConfigModule } from "@nestjs/config"
import { NestExpressApplication } from "@nestjs/platform-express"
import { Test } from "@nestjs/testing"
import { CaslModule } from "nest-casl"
import { CaslUser } from "src/casl/models/casl-user"
import { Roles } from "src/casl/models/roles"
import { CustomerModule } from "src/customer/customer.module"
import { CheckoutSession } from "src/customer/entities/checkout-session.entity"
import { CustomerFactory } from "src/customer/factories/customer.factory"
import { StubPaymentProviderModule } from "src/payment-provider/tests/stub-payment-provider.module"
import { CustomRequest } from "src/request"
import { Tenant } from "src/tenant/entities/tenant.entity"
import { TenantFactory } from "src/tenant/factories/tenant.factory"
import * as request from "supertest"
import { asTenant } from "test/helpers/as-tenant"
import { assertDifference } from "test/helpers/assert-difference"
import { createTestingApplication } from "test/utils/create-testing-application"
import { TestBullModule } from "test/utils/test-bull.module"
import { TestDatabaseModule } from "test/utils/test-database/test-database.module"
import { v4 as uuidv4 } from "uuid"

describe("CheckoutSessionController", () => {
  let app: NestExpressApplication
  let tenant: Tenant

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

  beforeEach(async () => {
    tenant = await new TenantFactory().create()
  })

  it("creates a checkout session", async () => {
    const customer = await new CustomerFactory().create({ tenant })

    const res = await assertDifference([[CheckoutSession, 1]], () =>
      request(app.getHttpServer())
        .post(`/customers/${customer.id}/checkout-sessions`)
        .set(asTenant(tenant))
        .send({
          products: [
            {
              externalRef: "price_12345",
              quantity: 1,
            },
          ],
        })
        .expect(201),
    )

    expect(res.body).toEqual(
      expect.objectContaining({
        data: {
          checkoutUrl: expect.stringMatching(
            new RegExp(`https://example.com/checkout/.+`),
          ),
        },
      }),
    )
  })

  it("cannot create a checkout session for an non-existing customer", async () => {
    await request(app.getHttpServer())
      .post(`/customers/${uuidv4()}/checkout-sessions`)
      .set(asTenant(tenant))
      .send({
        products: [
          {
            externalRef: "price_12345",
            quantity: 1,
          },
        ],
      })
      .expect(404)
  })

  it("cannot create a checkout session for a customer in another tenant", async () => {
    const customer = await new CustomerFactory().create()

    await request(app.getHttpServer())
      .post(`/customers/${customer.id}/checkout-sessions`)
      .set(asTenant(tenant))
      .send({
        products: [
          {
            externalRef: "price_12345",
            quantity: 1,
          },
        ],
      })
      .expect(403)
  })
})
