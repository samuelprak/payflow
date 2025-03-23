import { updateCustomer } from "./update-customer"
import Stripe from "stripe"

jest.mock("stripe")

describe("updateCustomer", () => {
  let stripe: jest.Mocked<Stripe>
  let customerId: string

  beforeEach(() => {
    stripe = new Stripe("fake-api-key") as jest.Mocked<Stripe>
    stripe.customers = {
      update: jest.fn(),
    } as unknown as Stripe.CustomersResource
    customerId = "cus_12345"
  })

  it("should update a customer with new email", async () => {
    const mockCustomer = {
      id: customerId,
      email: "updated@example.com",
      metadata: {
        tenantId: "tenant123",
        userId: "user123",
        userRef: "userRef123",
      },
    }
    const updateParams = {
      email: "updated@example.com",
    }

    stripe.customers.update = jest.fn().mockResolvedValue(mockCustomer)

    const result = await updateCustomer({
      stripe,
      customerId,
      params: updateParams,
    })

    expect(stripe.customers.update).toHaveBeenCalledWith(
      customerId,
      updateParams,
    )
    expect(result).toEqual(mockCustomer)
  })

  it("should update a customer with empty params", async () => {
    const mockCustomer = {
      id: customerId,
      email: "test@example.com",
    }
    const updateParams = {}

    stripe.customers.update = jest.fn().mockResolvedValue(mockCustomer)

    const result = await updateCustomer({
      stripe,
      customerId,
      params: {},
    })

    expect(stripe.customers.update).toHaveBeenCalledWith(
      customerId,
      updateParams,
    )
    expect(result).toEqual(mockCustomer)
  })

  it("should throw an error if stripe customer update fails", async () => {
    stripe.customers.update = jest
      .fn()
      .mockRejectedValue(new Error("Stripe error"))

    await expect(
      updateCustomer({
        stripe,
        customerId,
        params: { email: "test@example.com" },
      }),
    ).rejects.toThrow("Stripe error")
  })
})
