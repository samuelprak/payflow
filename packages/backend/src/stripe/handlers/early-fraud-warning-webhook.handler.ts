import { Injectable, Logger } from "@nestjs/common"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { CustomerUpdatedEvent } from "src/customer/events/customer-updated.event"
import { StripeWebhookHandler } from "src/stripe/decorators/stripe-webhook-handler.decorator"
import {
  StripeWebhookContext,
  StripeWebhookHandlerInterface,
} from "src/stripe/interfaces/stripe-webhook-handler.interface"
import { retrieveCharge } from "src/stripe/models/stripe/client/retrieve-charge"
import { handleEarlyFraudWarning } from "src/stripe/models/stripe/use-cases/handle-early-fraud-warning"
import { StripeCustomerRepository } from "src/stripe/repositories/stripe-customer.repository"
import Stripe from "stripe"

@Injectable()
@StripeWebhookHandler({
  eventTypes: [
    "radar.early_fraud_warning.created",
    "radar.early_fraud_warning.updated",
  ],
})
export class EarlyFraudWarningWebhookHandler implements StripeWebhookHandlerInterface {
  private readonly logger = new Logger(EarlyFraudWarningWebhookHandler.name)

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly stripeCustomerRepository: StripeCustomerRepository,
  ) {}

  async handle(
    event: Stripe.Event,
    context: StripeWebhookContext,
  ): Promise<void> {
    const earlyFraudWarning = event.data
      .object as Stripe.Radar.EarlyFraudWarning

    if (!earlyFraudWarning.actionable) {
      this.logger.log(
        `Skipped early fraud warning ${earlyFraudWarning.id}: not actionable`,
      )
      return
    }

    const chargeId =
      typeof earlyFraudWarning.charge === "string"
        ? earlyFraudWarning.charge
        : earlyFraudWarning.charge.id

    const charge = await retrieveCharge({
      stripe: context.stripe,
      chargeId,
    })

    const stripeCustomerId =
      typeof charge.customer === "string"
        ? charge.customer
        : (charge.customer?.id ?? null)

    if (!stripeCustomerId) {
      this.logger.log(
        `Charge ${chargeId} has no associated customer (guest checkout), skipping`,
      )
      return
    }

    const stripeCustomer =
      await this.stripeCustomerRepository.findOneByStripeCustomerId(
        stripeCustomerId,
      )

    if (!stripeCustomer) {
      this.logger.log(
        `Customer ${stripeCustomerId} not found in our system, skipping processing`,
      )
      return
    }

    const result = await handleEarlyFraudWarning({
      stripe: context.stripe,
      earlyFraudWarning,
      stripeCustomerId,
    })

    if (result.subscriptionCancellationsFailed > 0) {
      this.logger.warn(
        `Partial subscription cancellation failure for customer ${stripeCustomer.customerId}`,
        {
          customerId: stripeCustomer.customerId,
          stripeCustomerId,
          fraudWarningId: earlyFraudWarning.id,
          subscriptionsCancelled: result.subscriptionsCancelled,
          subscriptionCancellationsFailed:
            result.subscriptionCancellationsFailed,
        },
      )
    }

    await this.eventEmitter.emitAsync(
      CustomerUpdatedEvent.eventName,
      new CustomerUpdatedEvent(stripeCustomer.customerId, {
        type: "early_fraud_warning",
        fraudType: earlyFraudWarning.fraud_type,
        chargeId,
        chargeRefunded: result.chargeRefunded,
        subscriptionsCancelled: result.subscriptionsCancelled,
        subscriptionCancellationsFailed: result.subscriptionCancellationsFailed,
      }),
    )

    this.logger.log(
      `Processed early fraud warning for customer ${stripeCustomer.customerId}: ` +
        `refunded=${result.chargeRefunded}, subscriptionsCancelled=${result.subscriptionsCancelled}`,
    )
  }
}
