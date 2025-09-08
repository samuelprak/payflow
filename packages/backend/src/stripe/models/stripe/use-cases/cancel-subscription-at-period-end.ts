import { UnprocessableEntityException } from "@nestjs/common"
import { cancelSubscriptionAtPeriodEnd as cancelStripeSubscriptionAtPeriodEnd } from "src/stripe/models/stripe/client/cancel-subscription-at-period-end"
import { listActiveSubscriptions } from "src/stripe/models/stripe/client/list-active-subscriptions"
import Stripe from "stripe"

type Params = {
  stripe: Stripe
  stripeCustomerId: string
  cancelAtPeriodEnd: boolean
}

export async function cancelSubscriptionAtPeriodEnd({
  stripe,
  stripeCustomerId,
  cancelAtPeriodEnd,
}: Params): Promise<void> {
  const activeSubscriptions = await listActiveSubscriptions({
    stripe,
    stripeCustomerId,
  })

  if (activeSubscriptions.length === 0) {
    throw new UnprocessableEntityException(
      "No active subscription found for customer",
    )
  }

  if (activeSubscriptions.length > 1) {
    throw new UnprocessableEntityException(
      "Multiple active subscriptions found for customer",
    )
  }

  const subscription = activeSubscriptions[0]

  // Update the subscription cancellation status
  await cancelStripeSubscriptionAtPeriodEnd({
    stripe,
    subscriptionId: subscription.id,
    cancelAtPeriodEnd,
  })
}
