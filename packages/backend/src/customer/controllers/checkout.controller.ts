import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common"
import {
  AccessGuard,
  Actions,
  CaslSubject,
  SubjectProxy,
  UseAbility,
} from "nest-casl"
import { Customer } from "src/customer/entities/customer.entity"
import { CreateCheckoutRepDto } from "src/customer/models/dto/create-checkout-rep.dto"
import { CreateCheckoutDto } from "src/customer/models/dto/create-checkout.dto"
import { CustomerHook } from "src/customer/permissions/customer.hook"
import { CheckoutService } from "src/customer/services/checkout.service"
import { CustomRequest } from "src/request"
import { TenantGuard } from "src/tenant/guards/tenant.guard"

@Controller("customers/:customerId/checkout")
@UseGuards(TenantGuard)
export class CheckoutController {
  constructor(private readonly service: CheckoutService) {}

  @Post()
  @UseGuards(AccessGuard)
  @UseAbility(Actions.manage, Customer, CustomerHook)
  async createCheckout(
    @Param("customerId", new ParseUUIDPipe()) customerId: string,
    @Body() body: CreateCheckoutDto,
    @Req() request: CustomRequest,
    @CaslSubject() subjectProxy: SubjectProxy<Customer>,
  ): Promise<CreateCheckoutRepDto> {
    const customer = await subjectProxy.get()
    if (!customer) throw new Error()

    const checkout = await this.service.createCheckout({
      tenant: request.tenant,
      customer,
      params: body,
    })

    return { data: checkout }
  }
}
