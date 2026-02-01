import { Test, TestingModule } from "@nestjs/testing"
import { DiscoveryService } from "@nestjs/core"
import { StripeWebhookDispatcherService } from "./stripe-webhook-dispatcher.service"
import {
  StripeWebhookContext,
  StripeWebhookHandlerInterface,
} from "src/stripe/interfaces/stripe-webhook-handler.interface"
import Stripe from "stripe"

describe("StripeWebhookDispatcherService", () => {
  let service: StripeWebhookDispatcherService
  let discoveryService: jest.Mocked<DiscoveryService>

  const mockContext: StripeWebhookContext = {
    stripeAccountId: "acc_123",
    stripe: new Stripe("sk_test"),
    stripeCustomer: null,
  }

  const createMockProvider = (
    instance: StripeWebhookHandlerInterface | null,
  ) => {
    return { instance } as ReturnType<DiscoveryService["getProviders"]>[number]
  }

  beforeEach(async () => {
    discoveryService = {
      getProviders: jest.fn().mockReturnValue([]),
      getMetadataByDecorator: jest.fn(),
    } as unknown as jest.Mocked<DiscoveryService>

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripeWebhookDispatcherService,
        {
          provide: DiscoveryService,
          useValue: discoveryService,
        },
      ],
    }).compile()

    service = module.get<StripeWebhookDispatcherService>(
      StripeWebhookDispatcherService,
    )
  })

  describe("onModuleInit", () => {
    it("should register handlers from discovered providers", () => {
      const mockHandler: StripeWebhookHandlerInterface = {
        handle: jest.fn(),
      }

      const mockProvider = createMockProvider(mockHandler)

      discoveryService.getProviders.mockReturnValue([mockProvider])
      discoveryService.getMetadataByDecorator.mockReturnValue({
        eventTypes: ["invoice.paid", "invoice.payment_failed"],
      })

      service.onModuleInit()

      expect(service.hasHandlerForEvent("invoice.paid")).toBe(true)
      expect(service.hasHandlerForEvent("invoice.payment_failed")).toBe(true)
      expect(service.hasHandlerForEvent("checkout.session.completed")).toBe(
        false,
      )
    })

    it("should handle multiple handlers for the same event type", () => {
      const mockHandler1: StripeWebhookHandlerInterface = {
        handle: jest.fn(),
      }
      const mockHandler2: StripeWebhookHandlerInterface = {
        handle: jest.fn(),
      }

      const mockProviders = [
        createMockProvider(mockHandler1),
        createMockProvider(mockHandler2),
      ]

      discoveryService.getProviders.mockReturnValue(mockProviders)
      discoveryService.getMetadataByDecorator.mockReturnValue({
        eventTypes: ["invoice.paid"],
      })

      service.onModuleInit()

      expect(service.hasHandlerForEvent("invoice.paid")).toBe(true)
      expect(service.getRegisteredEventTypes()).toContain("invoice.paid")
    })

    it("should skip providers without metadata", () => {
      const mockProvider = createMockProvider({ handle: jest.fn() })

      discoveryService.getProviders.mockReturnValue([mockProvider])
      discoveryService.getMetadataByDecorator.mockReturnValue(null)

      service.onModuleInit()

      expect(service.getRegisteredEventTypes()).toHaveLength(0)
    })

    it("should skip providers without instance", () => {
      const mockProvider = createMockProvider(null)

      discoveryService.getProviders.mockReturnValue([mockProvider])
      discoveryService.getMetadataByDecorator.mockReturnValue({
        eventTypes: ["invoice.paid"],
      })

      service.onModuleInit()

      expect(service.getRegisteredEventTypes()).toHaveLength(0)
    })
  })

  describe("dispatch", () => {
    it("should call handler for registered event", async () => {
      const mockHandler: StripeWebhookHandlerInterface = {
        handle: jest.fn().mockResolvedValue(undefined),
      }

      const mockProvider = createMockProvider(mockHandler)

      discoveryService.getProviders.mockReturnValue([mockProvider])
      discoveryService.getMetadataByDecorator.mockReturnValue({
        eventTypes: ["invoice.paid"],
      })

      service.onModuleInit()

      const event = {
        type: "invoice.paid",
        data: { object: { id: "inv_123" } },
      } as unknown as Stripe.Event

      await service.dispatch(event, mockContext)

      expect(mockHandler.handle).toHaveBeenCalledWith(event, mockContext)
    })

    it("should not throw for unregistered event types", async () => {
      service.onModuleInit()

      const event = {
        type: "unregistered.event",
        data: { object: {} },
      } as unknown as Stripe.Event

      await expect(
        service.dispatch(event, mockContext),
      ).resolves.toBeUndefined()
    })

    it("should call all handlers for an event type", async () => {
      const mockHandler1: StripeWebhookHandlerInterface = {
        handle: jest.fn().mockResolvedValue(undefined),
      }
      const mockHandler2: StripeWebhookHandlerInterface = {
        handle: jest.fn().mockResolvedValue(undefined),
      }

      discoveryService.getProviders.mockReturnValue([
        createMockProvider(mockHandler1),
        createMockProvider(mockHandler2),
      ])
      discoveryService.getMetadataByDecorator.mockReturnValue({
        eventTypes: ["invoice.paid"],
      })

      service.onModuleInit()

      const event = {
        type: "invoice.paid",
        data: { object: { id: "inv_123" } },
      } as unknown as Stripe.Event

      await service.dispatch(event, mockContext)

      expect(mockHandler1.handle).toHaveBeenCalledWith(event, mockContext)
      expect(mockHandler2.handle).toHaveBeenCalledWith(event, mockContext)
    })

    it("should propagate errors from handlers", async () => {
      const mockHandler: StripeWebhookHandlerInterface = {
        handle: jest.fn().mockRejectedValue(new Error("Handler error")),
      }

      discoveryService.getProviders.mockReturnValue([
        createMockProvider(mockHandler),
      ])
      discoveryService.getMetadataByDecorator.mockReturnValue({
        eventTypes: ["invoice.paid"],
      })

      service.onModuleInit()

      const event = {
        type: "invoice.paid",
        data: { object: { id: "inv_123" } },
      } as unknown as Stripe.Event

      await expect(service.dispatch(event, mockContext)).rejects.toThrow(
        "Handler error",
      )
    })
  })

  describe("getRegisteredEventTypes", () => {
    it("should return all registered event types", () => {
      const mockHandler: StripeWebhookHandlerInterface = {
        handle: jest.fn(),
      }

      discoveryService.getProviders.mockReturnValue([
        createMockProvider(mockHandler),
      ])
      discoveryService.getMetadataByDecorator.mockReturnValue({
        eventTypes: ["invoice.paid", "checkout.session.completed"],
      })

      service.onModuleInit()

      const eventTypes = service.getRegisteredEventTypes()
      expect(eventTypes).toContain("invoice.paid")
      expect(eventTypes).toContain("checkout.session.completed")
    })
  })
})
