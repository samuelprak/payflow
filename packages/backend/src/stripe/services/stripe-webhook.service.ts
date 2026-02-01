import { ForbiddenException, Injectable } from "@nestjs/common"
import { StripeWebhookContext } from "src/stripe/interfaces/stripe-webhook-handler.interface"
import { webhooksConstructEvent } from "src/stripe/models/stripe/client/webhooks-construct-event"
import { StripeAccountRepository } from "src/stripe/repositories/stripe-account.repository"
import { StripeCustomerRepository } from "src/stripe/repositories/stripe-customer.repository"
import { StripeWebhookDispatcherService } from "src/stripe/services/stripe-webhook-dispatcher.service"
import Stripe from "stripe"

@Injectable()
export class StripeWebhookService {
  constructor(
    private readonly stripeAccountRepository: StripeAccountRepository,
    private readonly stripeCustomerRepository: StripeCustomerRepository,
    private readonly webhookDispatcher: StripeWebhookDispatcherService,
  ) {}

  async handleWebhook(
    stripeAccountId: string,
    signature: string,
    rawBody: Buffer,
  ) {
    const stripeAccount =
      await this.stripeAccountRepository.findOneById(stripeAccountId)
    const stripe = new Stripe(stripeAccount.stripeSecretKey)

    let event: Stripe.Event

    try {
      event = webhooksConstructEvent(
        stripe,
        rawBody,
        signature,
        stripeAccount.stripeWebhookSecret,
      )
    } catch {
      throw new ForbiddenException("Invalid webhook signature")
    }

    const context = await this.buildContext(stripeAccountId, stripe, event)
    await this.webhookDispatcher.dispatch(event, context)
  }

  private async buildContext(
    stripeAccountId: string,
    stripe: Stripe,
    event: Stripe.Event,
  ): Promise<StripeWebhookContext> {
    const stripeCustomerId = this.extractCustomerId(event)

    const stripeCustomer = stripeCustomerId
      ? await this.stripeCustomerRepository.findOneByStripeCustomerId(
          stripeCustomerId,
        )
      : null

    return {
      stripeAccountId,
      stripe,
      stripeCustomer,
    }
  }

  private extractCustomerId(event: Stripe.Event): string | null {
    const eventData = event.data.object as { customer?: string | object }

    if (!eventData.customer) {
      return null
    }

    if (typeof eventData.customer === "string") {
      return eventData.customer
    }

    if (
      typeof eventData.customer === "object" &&
      "id" in eventData.customer &&
      typeof eventData.customer.id === "string"
    ) {
      return eventData.customer.id
    }

    return null
  }
}
