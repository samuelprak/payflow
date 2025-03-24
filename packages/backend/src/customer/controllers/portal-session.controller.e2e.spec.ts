import { ConfigModule } from "@nestjs/config"
import { NestExpressApplication } from "@nestjs/platform-express"
import { Test } from "@nestjs/testing"
import { CaslModule } from "nest-casl"
import { CaslUser } from "src/casl/models/casl-user"
import { Roles } from "src/casl/models/roles"
import { CustomerModule } from "src/customer/customer.module"
import { CustomerFactory } from "src/customer/factories/customer.factory"
import { StubPaymentProviderModule } from "src/payment-provider/tests/stub-payment-provider.module"
import { CustomRequest } from "src/request"
import { Tenant } from "src/tenant/entities/tenant.entity"
import { TenantFactory } from "src/tenant/factories/tenant.factory"
import * as request from "supertest"
import { asTenant } from "test/helpers/as-tenant"
import { createTestingApplication } from "test/utils/create-testing-application"
import { TestBullModule } from "test/utils/test-bull.module"
import { TestDatabaseModule } from "test/utils/test-database/test-database.module"

describe("PortalSessionController", () => {
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

  it("creates a portal session", async () => {
    const customer = await new CustomerFactory().create({ tenant })

    const res = await request(app.getHttpServer())
      .post(`/customers/${customer.id}/portal-sessions`)
      .set(asTenant(tenant))
      .send({
        returnUrl: "https://example.com/return",
      })
      .expect(201)

    expect(res.body).toEqual({
      portalUrl: expect.stringMatching(
        new RegExp(`https://example.com/portal/.+`),
      ),
    })
  })

  it("cannot create a portal session for a customer in another tenant", async () => {
    // Create a customer with a different tenant
    const customer = await new CustomerFactory().create()

    await request(app.getHttpServer())
      .post(`/customers/${customer.id}/portal-sessions`)
      .set(asTenant(tenant))
      .send({
        returnUrl: "https://example.com/return",
      })
      .expect(403)
  })
})
