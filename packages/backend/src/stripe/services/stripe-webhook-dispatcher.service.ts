import { Injectable, Logger, OnModuleInit } from "@nestjs/common"
import { DiscoveryService } from "@nestjs/core"
import { StripeWebhookHandler } from "src/stripe/decorators/stripe-webhook-handler.decorator"
import {
  StripeWebhookContext,
  StripeWebhookHandlerInterface,
} from "src/stripe/interfaces/stripe-webhook-handler.interface"
import Stripe from "stripe"

@Injectable()
export class StripeWebhookDispatcherService implements OnModuleInit {
  private readonly logger = new Logger(StripeWebhookDispatcherService.name)
  private handlerMap = new Map<
    Stripe.Event.Type,
    StripeWebhookHandlerInterface[]
  >()

  constructor(private readonly discoveryService: DiscoveryService) {}

  onModuleInit() {
    const providers = this.discoveryService.getProviders({
      metadataKey: StripeWebhookHandler.KEY,
    })

    for (const provider of providers) {
      const metadata = this.discoveryService.getMetadataByDecorator(
        StripeWebhookHandler,
        provider,
      )

      if (!metadata || !provider.instance) continue

      const handler = provider.instance as StripeWebhookHandlerInterface

      for (const eventType of metadata.eventTypes) {
        const handlers = this.handlerMap.get(eventType) ?? []
        handlers.push(handler)
        this.handlerMap.set(eventType, handlers)
      }
    }

    this.logger.log(
      `Registered ${this.handlerMap.size} webhook event types with handlers`,
    )
  }

  async dispatch(
    event: Stripe.Event,
    context: StripeWebhookContext,
  ): Promise<void> {
    const handlers = this.handlerMap.get(event.type as Stripe.Event.Type)

    if (!handlers || handlers.length === 0) {
      return
    }

    for (const handler of handlers) {
      try {
        await handler.handle(event, context)
      } catch (error) {
        this.logger.error(
          `Error handling webhook event ${event.type}: ${error instanceof Error ? error.message : String(error)}`,
          error instanceof Error ? error.stack : undefined,
        )
        throw error
      }
    }
  }

  getRegisteredEventTypes(): Stripe.Event.Type[] {
    return Array.from(this.handlerMap.keys())
  }

  hasHandlerForEvent(eventType: Stripe.Event.Type): boolean {
    return this.handlerMap.has(eventType)
  }
}
