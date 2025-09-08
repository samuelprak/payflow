import { IsBoolean, IsString } from "class-validator"

export class CancelSubscriptionDto {
  /**
   * The user reference of the customer.
   */
  @IsString()
  userRef: string

  /**
   * Whether to cancel the subscription at the end of the current period.
   * If true, the subscription will be canceled at the end of the current billing period.
   * If false, the subscription will continue to renew.
   */
  @IsBoolean()
  cancelAtPeriodEnd: boolean
}
