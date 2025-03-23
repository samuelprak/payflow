import { StripeCustomerFactory } from "src/stripe/factories/stripe-customer.factory"
import { createCustomer } from "src/stripe/models/stripe/client/create-customer"
import { retrieveCustomer } from "src/stripe/models/stripe/client/retrieve-customer"
import { updateCustomer } from "src/stripe/models/stripe/client/update-customer"
import { syncCustomer } from "src/stripe/models/stripe/use-cases/sync-customer"
import { StripeCustomerRepository } from "src/stripe/repositories/stripe-customer.repository"
import Stripe from "stripe"
import { v4 as uuidv4 } from "uuid"

jest.mock("../client/create-customer", () => ({
  createCustomer: jest.fn(),
}))
jest.mock("../client/retrieve-customer", () => ({
  retrieveCustomer: jest.fn(),
}))
jest.mock("../client/update-customer", () => ({
  updateCustomer: jest.fn(),
}))

const createCustomerMock = createCustomer as jest.Mock
const retrieveCustomerMock = retrieveCustomer as jest.Mock
const updateCustomerMock = updateCustomer as jest.Mock

describe("syncCustomer", () => {
  let stripeCustomerRepository: StripeCustomerRepository
  const stripe = new Stripe("fake-api-key")

  beforeEach(() => {
    stripeCustomerRepository = {
      findOneByCustomerId: jest.fn(),
      create: jest.fn(),
    } as unknown as StripeCustomerRepository

    createCustomerMock.mockClear()
    retrieveCustomerMock.mockClear()
    updateCustomerMock.mockClear()
  })

  it("creates a new customer if no customer exists", async () => {
    jest
      .spyOn(stripeCustomerRepository, "findOneByCustomerId")
      .mockResolvedValue(null)
    createCustomerMock.mockResolvedValue({ id: "cus_12345" })

    const baseCustomer = {
      id: uuidv4(),
      email: "test@email.com",
      tenantId: "tenant123",
      userRef: "userRef123",
    }

    await syncCustomer({ baseCustomer, stripe, stripeCustomerRepository })

    expect(createCustomerMock).toHaveBeenCalledWith(
      expect.any(Stripe),
      baseCustomer,
    )
    expect(stripeCustomerRepository.create).toHaveBeenCalledWith({
      customerId: baseCustomer.id,
      stripeCustomerId: "cus_12345",
    })
  })

  it("does not create a new customer if customer already exists and emails match", async () => {
    const stripeCustomer = await new StripeCustomerFactory().make({
      stripeCustomerId: "cus_12345",
    })

    jest
      .spyOn(stripeCustomerRepository, "findOneByCustomerId")
      .mockResolvedValue(stripeCustomer)

    retrieveCustomerMock.mockResolvedValue({
      id: "cus_12345",
      email: "test@email.com",
      deleted: false,
    })

    const baseCustomer = {
      id: "user123",
      email: "test@email.com",
      tenantId: "tenant123",
      userRef: "userRef123",
    }

    await syncCustomer({ baseCustomer, stripe, stripeCustomerRepository })

    expect(retrieveCustomerMock).toHaveBeenCalledWith({
      stripe,
      customerId: "cus_12345",
    })
    expect(updateCustomerMock).not.toHaveBeenCalled()
    expect(createCustomerMock).not.toHaveBeenCalled()
    expect(stripeCustomerRepository.create).not.toHaveBeenCalled()
  })

  it("updates the customer email when it differs from Stripe", async () => {
    const stripeCustomer = new StripeCustomerFactory().make({
      stripeCustomerId: "cus_12345",
    })

    jest
      .spyOn(stripeCustomerRepository, "findOneByCustomerId")
      .mockResolvedValue(stripeCustomer)

    retrieveCustomerMock.mockResolvedValue({
      id: "cus_12345",
      email: "old@email.com",
      deleted: false,
    })

    const baseCustomer = {
      id: "user123",
      email: "new@email.com",
      tenantId: "tenant123",
      userRef: "userRef123",
    }

    await syncCustomer({ baseCustomer, stripe, stripeCustomerRepository })

    expect(retrieveCustomerMock).toHaveBeenCalledWith({
      stripe,
      customerId: "cus_12345",
    })
    expect(updateCustomerMock).toHaveBeenCalledWith({
      stripe,
      customerId: "cus_12345",
      params: { email: "new@email.com" },
    })
    expect(createCustomerMock).not.toHaveBeenCalled()
    expect(stripeCustomerRepository.create).not.toHaveBeenCalled()
  })

  it("throws an error if the Stripe customer has been deleted", async () => {
    const stripeCustomer = new StripeCustomerFactory().make({
      stripeCustomerId: "cus_12345",
    })

    jest
      .spyOn(stripeCustomerRepository, "findOneByCustomerId")
      .mockResolvedValue(stripeCustomer)

    retrieveCustomerMock.mockResolvedValue({
      id: "cus_12345",
      deleted: true,
    })

    const baseCustomer = {
      id: "user123",
      email: "test@email.com",
      tenantId: "tenant123",
      userRef: "userRef123",
    }

    await expect(
      syncCustomer({ baseCustomer, stripe, stripeCustomerRepository }),
    ).rejects.toThrow("The customer has been deleted from Stripe")

    expect(retrieveCustomerMock).toHaveBeenCalledWith({
      stripe,
      customerId: "cus_12345",
    })
    expect(updateCustomerMock).not.toHaveBeenCalled()
    expect(createCustomerMock).not.toHaveBeenCalled()
    expect(stripeCustomerRepository.create).not.toHaveBeenCalled()
  })
})
