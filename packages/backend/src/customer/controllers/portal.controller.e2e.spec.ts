import { ConfigModule } from "@nestjs/config"
import { NestExpressApplication } from "@nestjs/platform-express"
import { Test } from "@nestjs/testing"
import { CaslModule } from "nest-casl"
import { CaslUser } from "src/casl/models/casl-user"
import { Roles } from "src/casl/models/roles"
import { CustomerModule } from "src/customer/customer.module"
import { PortalSessionFactory } from "src/customer/factories/portal-session.factory"
import { StubPaymentProviderModule } from "src/payment-provider/tests/stub-payment-provider.module"
import { CustomRequest } from "src/request"
import * as request from "supertest"
import { createTestingApplication } from "test/utils/create-testing-application"
import { TestBullModule } from "test/utils/test-bull.module"
import { TestDatabaseModule } from "test/utils/test-database/test-database.module"
import { v4 as uuidv4 } from "uuid"

describe("PortalController", () => {
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

  it("redirects to portal URL", async () => {
    const portalSession = await new PortalSessionFactory().create()

    const res = await request(app.getHttpServer())
      .get(`/portal/${portalSession.id}`)
      .expect(302)

    expect(res.header.location).toBe("https://example.com/portal")
  })

  it("redirects to return URL", async () => {
    const portalSession = await new PortalSessionFactory().create()

    const res = await request(app.getHttpServer())
      .get(`/portal/${portalSession.id}/return`)
      .expect(302)

    expect(res.header.location).toBe(portalSession.returnUrl)
  })

  it("throws error for non-existing portal session on redirect to portal", async () => {
    await request(app.getHttpServer()).get(`/portal/${uuidv4()}`).expect(404)
  })

  it("throws error for non-existing portal session on redirect to return", async () => {
    await request(app.getHttpServer())
      .get(`/portal/${uuidv4()}/return`)
      .expect(404)
  })
})
