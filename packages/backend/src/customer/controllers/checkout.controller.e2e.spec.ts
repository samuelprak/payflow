import { ConfigModule } from "@nestjs/config"
import { NestExpressApplication } from "@nestjs/platform-express"
import { Test } from "@nestjs/testing"
import { CaslModule } from "nest-casl"
import { CaslUser } from "src/casl/models/casl-user"
import { Roles } from "src/casl/models/roles"
import { CustomerModule } from "src/customer/customer.module"
import { CheckoutSessionFactory } from "src/customer/factories/checkout-session.factory"
import { StubPaymentProviderModule } from "src/payment-provider/tests/stub-payment-provider.module"
import { CustomRequest } from "src/request"
import * as request from "supertest"
import { createTestingApplication } from "test/utils/create-testing-application"
import { TestBullModule } from "test/utils/test-bull.module"
import { TestDatabaseModule } from "test/utils/test-database/test-database.module"
import { v4 as uuidv4 } from "uuid"

describe("CheckoutController", () => {
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

  it("opens a checkout session", async () => {
    const checkoutSession = await new CheckoutSessionFactory().create()

    const res = await request(app.getHttpServer())
      .get(`/checkout/${checkoutSession.id}`)
      .expect(302)

    expect(res.headers.location).toEqual("https://example.com/checkout")
  })

  it("cannot open a checkout session for a non-existing checkout session", async () => {
    await request(app.getHttpServer()).get(`/checkout/${uuidv4()}`).expect(404)
  })
})
