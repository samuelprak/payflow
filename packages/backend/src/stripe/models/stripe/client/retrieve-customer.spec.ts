import { retrieveCustomer } from "./retrieve-customer"
import Stripe from "stripe"

jest.mock("stripe")

describe("retrieveCustomer", () => {
  let stripe: jest.Mocked<Stripe>
  let customerId: string

  beforeEach(() => {
    stripe = new Stripe("fake-api-key") as jest.Mocked<Stripe>
    stripe.customers = {
      retrieve: jest.fn(),
    } as unknown as Stripe.CustomersResource
    customerId = "cus_12345"
  })

  it("should retrieve a customer by id", async () => {
    const mockCustomer = {
      id: customerId,
      email: "test@example.com",
      metadata: {
        tenantId: "tenant123",
        userId: "user123",
        userRef: "userRef123",
      },
    }
    stripe.customers.retrieve = jest.fn().mockResolvedValue(mockCustomer)

    const result = await retrieveCustomer({ stripe, customerId })

    expect(stripe.customers.retrieve).toHaveBeenCalledWith(customerId)
    expect(result).toEqual(mockCustomer)
  })

  it("should throw an error if stripe customer retrieval fails", async () => {
    stripe.customers.retrieve = jest
      .fn()
      .mockRejectedValue(new Error("Stripe error"))

    await expect(retrieveCustomer({ stripe, customerId })).rejects.toThrow(
      "Stripe error",
    )
  })
})
