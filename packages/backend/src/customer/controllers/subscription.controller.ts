import { Body, Controller, Patch, Post, Req, UseGuards } from "@nestjs/common"
import { ApiOperation, ApiTags } from "@nestjs/swagger"
import { CancelSubscriptionDto } from "src/customer/models/dto/cancel-subscription.dto"
import { UpgradeSubscriptionDto } from "src/customer/models/dto/upgrade-subscription.dto"
import { SubscriptionService } from "src/customer/services/subscription.service"
import { CustomRequest } from "src/request"
import { TenantGuard } from "src/tenant/guards/tenant.guard"

@Controller("subscriptions")
@UseGuards(TenantGuard)
@ApiTags("Subscription")
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  /**
   * Upgrades a customer's subscription.
   */
  @ApiOperation({
    description:
      "This endpoint upgrades a customer's subscription with new price IDs. It will prorate the billing and update the subscription immediately.",
  })
  @Post("upgrade")
  async upgradeSubscription(
    @Body() body: UpgradeSubscriptionDto,
    @Req() request: CustomRequest,
  ): Promise<{ success: boolean }> {
    await this.subscriptionService.updateSubscription({
      userRef: body.userRef,
      products: body.products,
      tenant: request.tenant,
    })

    return { success: true }
  }

  /**
   * Updates the cancellation status of a customer's subscription.
   */
  @ApiOperation({
    description:
      "This endpoint updates the cancelAtPeriodEnd flag on a customer's active subscription. When set to true, the subscription will be canceled at the end of the current billing period. When set to false, the subscription will continue to renew.",
  })
  @Patch()
  async patchSubscription(
    @Body() body: CancelSubscriptionDto,
    @Req() request: CustomRequest,
  ): Promise<{ success: boolean }> {
    await this.subscriptionService.cancelSubscriptionAtPeriodEnd({
      userRef: body.userRef,
      cancelAtPeriodEnd: body.cancelAtPeriodEnd,
      tenant: request.tenant,
    })

    return { success: true }
  }
}
