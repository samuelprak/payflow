import { Test, TestingModule } from "@nestjs/testing"
import { TypeOrmModule } from "@nestjs/typeorm"
import { Customer } from "src/customer/entities/customer.entity"
import { CustomerFactory } from "src/customer/factories/customer.factory"
import { CustomerRepository } from "src/customer/repositories/customer.repository"
import { TenantFactory } from "src/tenant/factories/tenant.factory"
import { assertDifference } from "test/helpers/assert-difference"
import { getRepository } from "test/helpers/get-repository"
import { TestDatabaseModule } from "test/utils/test-database/test-database.module"

describe("CustomerRepository", () => {
  let module: TestingModule
  let repository: CustomerRepository

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TestDatabaseModule.forRoot(),
        TypeOrmModule.forFeature([Customer]),
      ],
      providers: [CustomerRepository],
    }).compile()

    repository = module.get(CustomerRepository)
  })

  describe("sync", () => {
    it("creates a customer", async () => {
      const tenant = await new TenantFactory().create()

      const createdCustomer = await assertDifference([[Customer, 1]], () =>
        repository.sync({
          email: "test@test.com",
          userRef: "test-user-ref",
          tenant,
        }),
      )

      const customer = await getRepository(module, Customer).findOneOrFail({
        where: { email: "test@test.com" },
        relations: ["tenant"],
      })

      expect(createdCustomer).toBeInstanceOf(Customer)
      expect(customer).toBeDefined()
      expect(customer.id).toEqual(createdCustomer.id)
      expect(customer.tenant.id).toEqual(tenant.id)
    })

    it("finds a customer", async () => {
      const tenant = await new TenantFactory().create()
      const customer = await new CustomerFactory().create({
        email: "test@test.com",
        tenant,
      })

      const result = await assertDifference([[Customer, 0]], () =>
        repository.sync({
          email: "test@test.com",
          userRef: "test-user-ref",
          tenant,
        }),
      )

      expect(result).toBeDefined()
      expect(result).toBeInstanceOf(Customer)
      expect(result.id).toBe(customer.id)
      expect(result.email).toEqual("test@test.com")
      expect(result.userRef).toEqual("test-user-ref")
    })

    it("updates the customer email", async () => {
      const tenant = await new TenantFactory().create()
      const customer = await new CustomerFactory().create({
        email: "test@test.com",
        tenant,
      })

      const result = await assertDifference([[Customer, 0]], () =>
        repository.sync({
          email: "updated@test.com",
          userRef: "test-user-ref",
          tenant,
        }),
      )

      const updatedCustomer = await getRepository(
        module,
        Customer,
      ).findOneByOrFail({ id: customer.id })

      expect(result.id).toBe(customer.id)
      expect(result).toBeInstanceOf(Customer)
      expect(updatedCustomer.email).toEqual("updated@test.com")
      expect(updatedCustomer.userRef).toEqual("test-user-ref")
    })
  })

  describe("findOneByUserRef", () => {
    it("finds a customer by userRef and tenant", async () => {
      const tenant = await new TenantFactory().create()
      const customer = await new CustomerFactory().create({
        userRef: "test-user-ref",
        tenant,
      })

      const result = await repository.findOneByUserRef("test-user-ref", tenant)

      expect(result).toBeDefined()
      expect(result).toBeInstanceOf(Customer)
      expect(result.id).toBe(customer.id)
      expect(result.userRef).toBe("test-user-ref")
    })

    it("throws EntityNotFoundError when customer not found", async () => {
      const tenant = await new TenantFactory().create()

      await expect(
        repository.findOneByUserRef("nonexistent-user-ref", tenant),
      ).rejects.toThrow()
    })

    it("does not find customer from different tenant", async () => {
      const tenant1 = await new TenantFactory().create()
      const tenant2 = await new TenantFactory().create()
      await new CustomerFactory().create({
        userRef: "test-user-ref",
        tenant: tenant1,
      })

      await expect(
        repository.findOneByUserRef("test-user-ref", tenant2),
      ).rejects.toThrow()
    })
  })
})
