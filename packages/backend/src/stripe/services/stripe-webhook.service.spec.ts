import { ForbiddenException } from "@nestjs/common"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { Test, TestingModule } from "@nestjs/testing"
import { CustomerUpdatedEvent } from "src/customer/events/customer-updated.event"
import { webhooksConstructEvent } from "../models/stripe/client/webhooks-construct-event"
import { StripeAccountRepository } from "../repositories/stripe-account.repository"
import { StripeCustomerRepository } from "../repositories/stripe-customer.repository"
import { StripeWebhookService } from "./stripe-webhook.service"

jest.mock("../models/stripe/client/webhooks-construct-event")

const mockWebhooksConstructEvent = webhooksConstructEvent as jest.Mock

describe("StripeWebhookService", () => {
  let service: StripeWebhookService
  let stripeAccountRepository: jest.Mocked<StripeAccountRepository>
  let stripeCustomerRepository: jest.Mocked<StripeCustomerRepository>
  let eventEmitter: jest.Mocked<EventEmitter2>

  const mockStripeAccount = {
    id: "acc_123",
    stripeSecretKey: "sk_test_123",
    stripeWebhookSecret: "whsec_123",
  }

  const mockStripeCustomer = {
    id: "sc_123",
    customerId: "cust_123",
    stripeCustomerId: "cus_123",
  }

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

    eventEmitter = {
      emitAsync: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<EventEmitter2>

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
          provide: EventEmitter2,
          useValue: eventEmitter,
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
    })

    it("should ignore events not in the allowed list", async () => {
      mockWebhooksConstructEvent.mockReturnValue({
        type: "not.allowed.event",
        data: {
          object: {
            customer: "cus_123",
          },
        },
      })

      await service.handleWebhook(stripeAccountId, signature, rawBody)

      expect(stripeAccountRepository.findOneById).toHaveBeenCalledWith(
        stripeAccountId,
      )
      expect(
        stripeCustomerRepository.findOneByStripeCustomerId,
      ).not.toHaveBeenCalled()
      expect(eventEmitter.emitAsync).not.toHaveBeenCalled()
    })

    it("should ignore events with no matching stripe customer", async () => {
      mockWebhooksConstructEvent.mockReturnValue({
        type: "checkout.session.completed",
        data: {
          object: {
            customer: "cus_nonexistent",
          },
        },
      })

      stripeCustomerRepository.findOneByStripeCustomerId.mockResolvedValueOnce(
        null,
      )

      await service.handleWebhook(stripeAccountId, signature, rawBody)

      expect(stripeAccountRepository.findOneById).toHaveBeenCalledWith(
        stripeAccountId,
      )
      expect(
        stripeCustomerRepository.findOneByStripeCustomerId,
      ).toHaveBeenCalledWith("cus_nonexistent")
      expect(eventEmitter.emitAsync).not.toHaveBeenCalled()
    })

    it("should emit CustomerUpdatedEvent for valid events with matching customer", async () => {
      mockWebhooksConstructEvent.mockReturnValue({
        type: "checkout.session.completed",
        data: {
          object: {
            customer: "cus_123",
          },
        },
      })

      await service.handleWebhook(stripeAccountId, signature, rawBody)

      expect(stripeAccountRepository.findOneById).toHaveBeenCalledWith(
        stripeAccountId,
      )
      expect(
        stripeCustomerRepository.findOneByStripeCustomerId,
      ).toHaveBeenCalledWith("cus_123")
      expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
        CustomerUpdatedEvent.eventName,
        expect.objectContaining({
          customerId: "cust_123",
          data: expect.objectContaining({ type: "customer.updated" }),
        }),
      )

      // Verify the event has the correct customer ID
      const emittedEvent = (
        (eventEmitter.emitAsync as jest.Mock).mock.calls[0] as [
          string,
          CustomerUpdatedEvent,
        ]
      )[1]
      expect(emittedEvent.customerId).toBe("cust_123")
    })

    it("should handle all allowed event types", async () => {
      // Test a few different allowed event types
      const allowedEventTypes = [
        "invoice.paid",
        "customer.subscription.updated",
        "payment_intent.succeeded",
      ]

      for (const eventType of allowedEventTypes) {
        mockWebhooksConstructEvent.mockReturnValue({
          type: eventType,
          data: {
            object: {
              customer: "cus_123",
            },
          },
        })

        await service.handleWebhook(stripeAccountId, signature, rawBody)

        expect(stripeAccountRepository.findOneById).toHaveBeenCalledWith(
          stripeAccountId,
        )
        expect(
          stripeCustomerRepository.findOneByStripeCustomerId,
        ).toHaveBeenCalledWith("cus_123")
        expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
          CustomerUpdatedEvent.eventName,
          expect.objectContaining({
            customerId: "cust_123",
            data: expect.objectContaining({
              type: "customer.updated",
            }),
          }),
        )
      }
    })

    it("should emit CustomerUpdatedEvent with receiptUrl for invoice.paid event", async () => {
      const hostedInvoiceUrl = "https://stripe.com/invoice/123"
      mockWebhooksConstructEvent.mockReturnValue({
        type: "invoice.paid",
        data: {
          object: {
            customer: "cus_123",
            hosted_invoice_url: hostedInvoiceUrl,
          },
        },
      })

      await service.handleWebhook(stripeAccountId, signature, rawBody)

      expect(stripeAccountRepository.findOneById).toHaveBeenCalledWith(
        stripeAccountId,
      )
      expect(
        stripeCustomerRepository.findOneByStripeCustomerId,
      ).toHaveBeenCalledWith("cus_123")
      // Should emit twice: once for customer.updated, once for invoice.paid
      expect(eventEmitter.emitAsync).toHaveBeenCalledTimes(2)
      // First emit: customer.updated
      expect(eventEmitter.emitAsync).toHaveBeenNthCalledWith(
        1,
        CustomerUpdatedEvent.eventName,
        expect.objectContaining({
          customerId: "cust_123",
          data: expect.objectContaining({ type: "customer.updated" }),
        }),
      )
      // Second emit: invoice.paid with receiptUrl
      expect(eventEmitter.emitAsync).toHaveBeenNthCalledWith(
        2,
        CustomerUpdatedEvent.eventName,
        expect.objectContaining({
          customerId: "cust_123",
          data: expect.objectContaining({
            type: "invoice.paid",
            receiptUrl: hostedInvoiceUrl,
          }),
        }),
      )
    })
  })
})
