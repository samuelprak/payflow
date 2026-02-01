import { Logger } from "@nestjs/common"
import { cancelSubscriptionImmediately } from "src/stripe/models/stripe/client/cancel-subscription-immediately"
import { refundCharge } from "src/stripe/models/stripe/client/refund-charge"
import { retrieveCharge } from "src/stripe/models/stripe/client/retrieve-charge"
import Stripe from "stripe"

const logger = new Logger("handleEarlyFraudWarning")

type Params = {
  stripe: Stripe
  earlyFraudWarning: Stripe.Radar.EarlyFraudWarning
}

type Result = {
  skipped: boolean
  skipReason?: string
  chargeRefunded: boolean
  subscriptionsCancelled: number
  subscriptionCancellationsFailed: number
  stripeCustomerId: string | null
}

function extractChargeId(
  earlyFraudWarning: Stripe.Radar.EarlyFraudWarning,
): string {
  return typeof earlyFraudWarning.charge === "string"
    ? earlyFraudWarning.charge
    : earlyFraudWarning.charge.id
}

function extractCustomerId(charge: Stripe.Charge): string | null {
  return typeof charge.customer === "string"
    ? charge.customer
    : (charge.customer?.id ?? null)
}

async function tryRefundCharge(
  stripe: Stripe,
  chargeId: string,
): Promise<boolean> {
  try {
    await refundCharge({
      stripe,
      chargeId,
      reason: "fraudulent",
    })
    logger.log(`Refunded charge ${chargeId} due to early fraud warning`)
    return true
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("already been refunded")
    ) {
      logger.log(`Charge ${chargeId} was already refunded`)
      return false
    }
    throw error
  }
}

async function fetchAllActiveSubscriptions(
  stripe: Stripe,
  customerId: string,
): Promise<Stripe.Subscription[]> {
  const [activeSubscriptions, trialingSubscriptions] = await Promise.all([
    stripe.subscriptions.list({ customer: customerId, status: "active" }),
    stripe.subscriptions.list({ customer: customerId, status: "trialing" }),
  ])

  return [...activeSubscriptions.data, ...trialingSubscriptions.data]
}

async function cancelAllSubscriptions(
  stripe: Stripe,
  subscriptions: Stripe.Subscription[],
): Promise<{ cancelled: number; failed: number }> {
  let cancelled = 0
  let failed = 0

  for (const subscription of subscriptions) {
    try {
      await cancelSubscriptionImmediately({
        stripe,
        subscriptionId: subscription.id,
      })
      cancelled++
      logger.log(
        `Cancelled subscription ${subscription.id} due to early fraud warning`,
      )
    } catch (error) {
      failed++
      logger.error(
        `Failed to cancel subscription ${subscription.id}: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  return { cancelled, failed }
}

function createSkippedResult(skipReason: string): Result {
  return {
    skipped: true,
    skipReason,
    chargeRefunded: false,
    subscriptionsCancelled: 0,
    subscriptionCancellationsFailed: 0,
    stripeCustomerId: null,
  }
}

export async function handleEarlyFraudWarning({
  stripe,
  earlyFraudWarning,
}: Params): Promise<Result> {
  if (!earlyFraudWarning.actionable) {
    return createSkippedResult("Early fraud warning is not actionable")
  }

  const chargeId = extractChargeId(earlyFraudWarning)
  const charge = await retrieveCharge({ stripe, chargeId })
  const stripeCustomerId = extractCustomerId(charge)

  if (!stripeCustomerId) {
    return createSkippedResult(
      "Charge has no associated customer (guest checkout)",
    )
  }

  const chargeRefunded = charge.refunded
    ? false
    : await tryRefundCharge(stripe, chargeId)

  const subscriptions = await fetchAllActiveSubscriptions(
    stripe,
    stripeCustomerId,
  )
  const { cancelled, failed } = await cancelAllSubscriptions(
    stripe,
    subscriptions,
  )

  return {
    skipped: false,
    chargeRefunded,
    subscriptionsCancelled: cancelled,
    subscriptionCancellationsFailed: failed,
    stripeCustomerId,
  }
}
