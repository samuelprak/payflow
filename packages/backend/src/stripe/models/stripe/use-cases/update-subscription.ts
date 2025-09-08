import { UnprocessableEntityException } from "@nestjs/common"
import { SubscriptionUpdateProduct } from "src/payment-provider/interfaces/subscription-update-params"
import { listActiveSubscriptions } from "src/stripe/models/stripe/client/list-active-subscriptions"
import { updateSubscription as updateStripeSubscription } from "src/stripe/models/stripe/client/update-subscription"
import Stripe from "stripe"

type Params = {
  stripe: Stripe
  products: SubscriptionUpdateProduct[]
  stripeCustomerId: string
}

export async function updateSubscription({
  stripe,
  products,
  stripeCustomerId,
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

  const items = products.map(({ externalRef, quantity }) => ({
    price: externalRef,
    quantity,
  }))

  const existingItems = subscription.items.data.map((item) => ({
    id: item.id,
    deleted: true,
  }))

  // Update the subscription
  await updateStripeSubscription({
    stripe,
    subscriptionId: subscription.id,
    items: [...existingItems, ...items],
  })
}
