import { PaymentMethodGet } from "src/customer/models/dto/payment-method-get.dto"
import { SubscriptionGet } from "src/customer/models/dto/subscription-get.dto"
import { listSubscriptions } from "src/stripe/models/stripe/client/list-subscriptions"
import Stripe from "stripe"

type Params = {
  stripe: Stripe
  stripeCutomerId: string
}

const RUNNING_SUBSCRIPTION_STATUSES = ["active", "trialing", "past_due"]
const SHOULD_PROVIDE_PRODUCT_STATUSES = ["active", "trialing"]

export async function getSubscriptions({
  stripe,
  stripeCutomerId,
}: Params): Promise<SubscriptionGet[]> {
  const subscriptions = await listSubscriptions({ stripe, stripeCutomerId })
  const runningSubscriptions = subscriptions.filter(({ status }) =>
    RUNNING_SUBSCRIPTION_STATUSES.includes(status),
  )

  return runningSubscriptions.map((subscription) => {
    const {
      id,
      items,
      status,
      current_period_start,
      current_period_end,
      default_payment_method,
    } = subscription

    const price = items.data[0].price

    return {
      shouldProvideProduct: SHOULD_PROVIDE_PRODUCT_STATUSES.includes(status),
      hasPastDueSubscription: status === "past_due",
      externalRef: id,
      productExternalRef: items.data[0].price.id,
      currentPeriodStart: new Date(current_period_start * 1000),
      currentPeriodEnd: new Date(current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      paymentMethod: extractPaymentMethod(default_payment_method),
      ...(price.unit_amount !== null && { amount: price.unit_amount }),
      currency: price.currency,
    }
  })
}

function extractPaymentMethod(
  paymentMethod: Stripe.PaymentMethod | string | null,
): PaymentMethodGet | undefined {
  if (
    !paymentMethod ||
    typeof paymentMethod !== "object" ||
    !paymentMethod.card
  ) {
    return undefined
  }

  return {
    brand: paymentMethod.card?.brand,
    last_digits: paymentMethod.card?.last4,
    expiry: `${paymentMethod.card?.exp_month
      .toString()
      .padStart(2, "0")}/${paymentMethod.card?.exp_year}`,
  }
}
