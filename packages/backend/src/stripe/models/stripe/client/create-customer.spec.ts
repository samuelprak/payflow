import { createCustomer } from "./create-customer"
import Stripe from "stripe"
import { BaseCustomer } from "src/payment-provider/interfaces/base-customer"

jest.mock("stripe")

describe("createCustomer", () => {
  let stripe: jest.Mocked<Stripe>
  let baseCustomer: BaseCustomer

  beforeEach(() => {
    stripe = new Stripe("fake-api-key") as jest.Mocked<Stripe>
    stripe.customers = {
      create: jest.fn(),
    } as unknown as Stripe.CustomersResource
    baseCustomer = {
      email: "test@example.com",
      tenantId: "tenant123",
      id: "user123",
      userRef: "userRef123",
    }
  })

  it("should create a customer and return the customer id", async () => {
    const mockCustomer = { id: "cus_12345" }
    stripe.customers.create = jest.fn().mockResolvedValue(mockCustomer)

    const response = await createCustomer(stripe, baseCustomer)

    expect(stripe.customers.create).toHaveBeenCalledWith(
      {
        email: baseCustomer.email,
        metadata: {
          tenantId: baseCustomer.tenantId,
          userId: baseCustomer.id,
          userRef: baseCustomer.userRef,
        },
      },
      {
        idempotencyKey: `tenant-${baseCustomer.tenantId}-ref-${baseCustomer.userRef}`,
      },
    )
    expect(response).toEqual({ id: mockCustomer.id })
  })

  it("should throw an error if stripe customer creation fails", async () => {
    stripe.customers.create = jest
      .fn()
      .mockRejectedValue(new Error("Stripe error"))

    await expect(createCustomer(stripe, baseCustomer)).rejects.toThrow(
      "Stripe error",
    )
  })
})
