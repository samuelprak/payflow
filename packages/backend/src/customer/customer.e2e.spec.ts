import { NestExpressApplication } from "@nestjs/platform-express"
import { Test } from "@nestjs/testing"
import { CaslModule } from "nest-casl"
import { CaslUser } from "src/casl/models/casl-user"
import { Roles } from "src/casl/models/roles"
import { CustomerModule } from "src/customer/customer.module"
import { Customer } from "src/customer/entities/customer.entity"
import { CustomerFactory } from "src/customer/factories/customer.factory"
import { SyncCustomerRepDto } from "src/customer/models/dto/sync-customer-rep.dto"
import { StubPaymentProviderModule } from "src/payment-provider/tests/stub-payment-provider.module"
import { CustomRequest } from "src/request"
import { Tenant } from "src/tenant/entities/tenant.entity"
import { TenantFactory } from "src/tenant/factories/tenant.factory"
import * as request from "supertest"
import { asTenant } from "test/helpers/as-tenant"
import { assertDifference } from "test/helpers/assert-difference"
import { TestDatabaseModule } from "test/utils/test-database/test-database.module"
import { v4 as uuidv4 } from "uuid"

describe("Customer", () => {
  let app: NestExpressApplication
  let tenant: Tenant

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        TestDatabaseModule.forRoot(),
        CaslModule.forRoot<Roles, CaslUser, CustomRequest>({
          getUserFromRequest: (request: CustomRequest) =>
            new CaslUser(request.tenant.id),
        }),
        CustomerModule,
        StubPaymentProviderModule,
      ],
    }).compile()

    app = moduleRef.createNestApplication()
    await app.init()
  })

  beforeEach(async () => {
    tenant = await new TenantFactory().create()
  })

  it("syncs a customer", async () => {
    const customer = {
      email: "test@email.com",
      userRef: "user123",
    }

    // sync a customer for the first time
    const res = await assertDifference([[Customer, 1]], () =>
      request(app.getHttpServer())
        .post("/customers/sync")
        .set(asTenant(tenant))
        .send(customer)
        .expect(201),
    )
    const body = res.body as SyncCustomerRepDto

    expect(body.data).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        email: customer.email,
        userRef: customer.userRef,
      }),
    )

    // sync the same customer again
    const updatedRes = await assertDifference([[Customer, 0]], () =>
      request(app.getHttpServer())
        .post("/customers/sync")
        .set(asTenant(tenant))
        .send(customer)
        .expect(201),
    )

    const updatedBody = updatedRes.body as SyncCustomerRepDto

    expect(updatedBody.data).toEqual(
      expect.objectContaining({
        id: body.data.id,
        email: customer.email,
        userRef: customer.userRef,
      }),
    )
  })

  it("creates a checkout session", async () => {
    const customer = await new CustomerFactory().create({ tenant })

    const res = await request(app.getHttpServer())
      .post(`/customers/${customer.id}/checkout`)
      .set(asTenant(tenant))
      .send({
        products: [
          {
            externalRef: "price_12345",
            quantity: 1,
          },
        ],
      })
      .expect(201)

    expect(res.body).toEqual(
      expect.objectContaining({
        data: {
          checkoutUrl: "https://example.com/checkout",
        },
      }),
    )
  })

  it("cannot create a checkout session for an non-existing customer", async () => {
    await request(app.getHttpServer())
      .post(`/customers/${uuidv4()}/checkout`)
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
      .post(`/customers/${customer.id}/checkout`)
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
