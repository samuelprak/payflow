import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common"
import { ApiParam, ApiTags } from "@nestjs/swagger"
import {
  AccessGuard,
  Actions,
  CaslSubject,
  SubjectProxy,
  UseAbility,
} from "nest-casl"
import { Customer } from "src/customer/entities/customer.entity"
import { CreateCheckoutSessionRepDto } from "src/customer/models/dto/create-checkout-session-rep.dto"
import { CreateCheckoutDto } from "src/customer/models/dto/create-checkout.dto"
import { CustomerHook } from "src/customer/permissions/customer.hook"
import { CheckoutSessionService } from "src/customer/services/checkout.service"
import { CustomRequest } from "src/request"
import { TenantGuard } from "src/tenant/guards/tenant.guard"

@Controller("customers/:customerId/checkout-session")
@UseGuards(TenantGuard)
@ApiTags("Customer")
export class CheckoutSessionController {
  constructor(private readonly service: CheckoutSessionService) {}

  /**
   * Creates a checkout session for a customer.
   */
  @Post()
  @UseGuards(AccessGuard)
  @UseAbility(Actions.manage, Customer, CustomerHook)
  @ApiParam({
    name: "customerId",
    type: String,
    description: "The ID of the customer to create the checkout session for.",
  })
  async createCheckoutSession(
    @Param("customerId", new ParseUUIDPipe()) customerId: string,
    @Body() body: CreateCheckoutDto,
    @Req() request: CustomRequest,
    @CaslSubject() subjectProxy: SubjectProxy<Customer>,
  ): Promise<CreateCheckoutSessionRepDto> {
    const customer = await subjectProxy.get()
    if (!customer) throw new Error()

    const checkoutSession = await this.service.createCheckoutSession({
      tenant: request.tenant,
      customer,
      params: body,
    })

    return { data: checkoutSession }
  }
}
