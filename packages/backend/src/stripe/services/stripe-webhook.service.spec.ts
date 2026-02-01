import { ForbiddenException } from "@nestjs/common"
import { Test, TestingModule } from "@nestjs/testing"
import { webhooksConstructEvent } from "../models/stripe/client/webhooks-construct-event"
import { StripeAccountRepository } from "../repositories/stripe-account.repository"
import { StripeCustomerRepository } from "../repositories/stripe-customer.repository"
import { StripeWebhookDispatcherService } from "./stripe-webhook-dispatcher.service"
import { StripeWebhookService } from "./stripe-webhook.service"
import { StripeCustomer } from "../entities/stripe-customer.entity"
import Stripe from "stripe"

jest.mock("../models/stripe/client/webhooks-construct-event")

const mockWebhooksConstructEvent = webhooksConstructEvent as jest.Mock

describe("StripeWebhookService", () => {
  let service: StripeWebhookService
  let stripeAccountRepository: jest.Mocked<StripeAccountRepository>
  let stripeCustomerRepository: jest.Mocked<StripeCustomerRepository>
  let webhookDispatcher: jest.Mocked<StripeWebhookDispatcherService>

  const mockStripeAccount = {
    id: "acc_123",
    stripeSecretKey: "sk_test_123",
    stripeWebhookSecret: "whsec_123",
  }

  const mockStripeCustomer = {
    id: "sc_123",
    customerId: "cust_123",
    stripeCustomerId: "cus_123",
  } as StripeCustomer

  const stripeAccountId = "acc_123"
  const signature = "test_signature"
  const rawBody = Buffer.from("test_body")

  beforeEach(async () => {
    stripeAccountRepository = {
      findOneById: jest.fn().mockResolvedValue(mockStripeAccount),
    } as unknown as jest.Mocked<StripeAccountRepository>

    stripeCustomerRepository = {
      findOneByStripeCustomerId: jest
        .fn()
        .mockResolvedValue(mockStripeCustomer),
    } as unknown as jest.Mocked<StripeCustomerRepository>

    webhookDispatcher = {
      dispatch: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<StripeWebhookDispatcherService>

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripeWebhookService,
        {
          provide: StripeAccountRepository,
          useValue: stripeAccountRepository,
        },
        {
          provide: StripeCustomerRepository,
          useValue: stripeCustomerRepository,
        },
        {
          provide: StripeWebhookDispatcherService,
          useValue: webhookDispatcher,
        },
      ],
    }).compile()

    service = module.get<StripeWebhookService>(StripeWebhookService)
  })

  describe("handleWebhook", () => {
    it("should throw ForbiddenException when signature is invalid", async () => {
      mockWebhooksConstructEvent.mockImplementation(() => {
        throw new Error("Invalid signature")
      })

      await expect(
        service.handleWebhook(stripeAccountId, signature, rawBody),
      ).rejects.toThrow(ForbiddenException)

      expect(stripeAccountRepository.findOneById).toHaveBeenCalledWith(
        stripeAccountId,
      )
      expect(webhookDispatcher.dispatch).not.toHaveBeenCalled()
    })

    it("should dispatch event with context when signature is valid", async () => {
      const mockEvent = {
        type: "checkout.session.completed",
        data: {
          object: {
            customer: "cus_123",
          },
        },
      } as unknown as Stripe.Event

      mockWebhooksConstructEvent.mockReturnValue(mockEvent)

      await service.handleWebhook(stripeAccountId, signature, rawBody)

      expect(stripeAccountRepository.findOneById).toHaveBeenCalledWith(
        stripeAccountId,
      )
      expect(
        stripeCustomerRepository.findOneByStripeCustomerId,
      ).toHaveBeenCalledWith("cus_123")
      expect(webhookDispatcher.dispatch).toHaveBeenCalledWith(
        mockEvent,
        expect.objectContaining({
          stripeAccountId,
          stripeCustomer: mockStripeCustomer,
        }),
      )
    })

    it("should dispatch event with null stripeCustomer when customer not found", async () => {
      const mockEvent = {
        type: "checkout.session.completed",
        data: {
          object: {
            customer: "cus_nonexistent",
          },
        },
      } as unknown as Stripe.Event

      mockWebhooksConstructEvent.mockReturnValue(mockEvent)
      stripeCustomerRepository.findOneByStripeCustomerId.mockResolvedValue(null)

      await service.handleWebhook(stripeAccountId, signature, rawBody)

      expect(
        stripeCustomerRepository.findOneByStripeCustomerId,
      ).toHaveBeenCalledWith("cus_nonexistent")
      expect(webhookDispatcher.dispatch).toHaveBeenCalledWith(
        mockEvent,
        expect.objectContaining({
          stripeAccountId,
          stripeCustomer: null,
        }),
      )
    })

    it("should dispatch event with null stripeCustomer when event has no customer field", async () => {
      const mockEvent = {
        type: "radar.early_fraud_warning.created",
        data: {
          object: {
            id: "issfr_123",
            charge: "ch_123",
          },
        },
      } as unknown as Stripe.Event

      mockWebhooksConstructEvent.mockReturnValue(mockEvent)

      await service.handleWebhook(stripeAccountId, signature, rawBody)

      expect(
        stripeCustomerRepository.findOneByStripeCustomerId,
      ).not.toHaveBeenCalled()
      expect(webhookDispatcher.dispatch).toHaveBeenCalledWith(
        mockEvent,
        expect.objectContaining({
          stripeAccountId,
          stripeCustomer: null,
        }),
      )
    })

    it("should handle customer object instead of string", async () => {
      const mockEvent = {
        type: "checkout.session.completed",
        data: {
          object: {
            customer: { id: "cus_789" },
          },
        },
      } as unknown as Stripe.Event

      mockWebhooksConstructEvent.mockReturnValue(mockEvent)

      await service.handleWebhook(stripeAccountId, signature, rawBody)

      expect(
        stripeCustomerRepository.findOneByStripeCustomerId,
      ).toHaveBeenCalledWith("cus_789")
    })

    it("should pass stripe instance in context", async () => {
      const mockEvent = {
        type: "checkout.session.completed",
        data: {
          object: {
            customer: "cus_123",
          },
        },
      } as unknown as Stripe.Event

      mockWebhooksConstructEvent.mockReturnValue(mockEvent)

      await service.handleWebhook(stripeAccountId, signature, rawBody)

      expect(webhookDispatcher.dispatch).toHaveBeenCalledWith(
        mockEvent,
        expect.objectContaining({
          stripe: expect.any(Object),
        }),
      )
    })

    it("should handle various event types", async () => {
      const eventTypes = [
        { type: "invoice.paid", customer: "cus_123" },
        { type: "customer.subscription.updated", customer: "cus_123" },
        { type: "payment_intent.succeeded", customer: "cus_123" },
      ]

      for (const { type, customer } of eventTypes) {
        mockWebhooksConstructEvent.mockReturnValue({
          type,
          data: { object: { customer } },
        })

        await service.handleWebhook(stripeAccountId, signature, rawBody)

        expect(webhookDispatcher.dispatch).toHaveBeenCalledWith(
          expect.objectContaining({ type }),
          expect.any(Object),
        )
      }
    })
  })
})
