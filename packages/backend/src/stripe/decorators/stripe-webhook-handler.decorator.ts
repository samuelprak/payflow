import { DiscoveryService } from "@nestjs/core"
import Stripe from "stripe"

export interface StripeWebhookHandlerMetadata {
  eventTypes: Stripe.Event.Type[]
}

export const StripeWebhookHandler =
  DiscoveryService.createDecorator<StripeWebhookHandlerMetadata>()
