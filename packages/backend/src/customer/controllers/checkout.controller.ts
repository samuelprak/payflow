import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
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
import { CreateCheckoutDto } from "src/customer/models/dto/create-checkout.dto"
import { CustomerHook } from "src/customer/permissions/customer.hook"
import { TenantGuard } from "src/tenant/guards/tenant.guard"

@Controller("customers/:customerId/checkout")
@UseGuards(TenantGuard)
export class CheckoutController {
  constructor() {}

  @Post()
  @UseGuards(AccessGuard)
  @UseAbility(Actions.manage, Customer, CustomerHook)
  async createCheckout(
    @Param("customerId", new ParseUUIDPipe()) customerId: string,
    @Body() body: CreateCheckoutDto,
    @CaslSubject() subjectProxy: SubjectProxy<Customer>,
  ) {
    const customer = await subjectProxy.get()

    return true
  }
}
