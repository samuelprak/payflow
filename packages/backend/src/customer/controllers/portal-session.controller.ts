import {
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
import { CreatePortalSessionRepDto } from "src/customer/models/dto/create-portal-session-rep.dto"
import { CustomerHook } from "src/customer/permissions/customer.hook"
import { PortalSessionService } from "src/customer/services/portal-session.service"
import { CustomRequest } from "src/request"
import { TenantGuard } from "src/tenant/guards/tenant.guard"

@Controller("customers/:customerId/portal-session")
@UseGuards(TenantGuard)
@ApiTags("Customer")
export class PortalSessionController {
  constructor(private readonly service: PortalSessionService) {}

  /**
   * Creates a portal session for a customer.
   */
  @Post()
  @UseGuards(AccessGuard)
  @UseAbility(Actions.manage, Customer, CustomerHook)
  @ApiParam({
    name: "customerId",
    type: String,
    description: "The ID of the customer to create the portal session for.",
  })
  async createPortalSession(
    @Param("customerId", new ParseUUIDPipe()) customerId: string,
    @Req() request: CustomRequest,
    @CaslSubject() subjectProxy: SubjectProxy<Customer>,
  ): Promise<CreatePortalSessionRepDto> {
    const customer = await subjectProxy.get()
    if (!customer) throw new Error()

    const portalSession = await this.service.createPortalSession({
      tenant: request.tenant,
      customer,
    })

    return { data: portalSession }
  }
}
