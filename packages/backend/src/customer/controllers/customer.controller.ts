import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common"
import { ApiOperation } from "@nestjs/swagger"
import { SyncCustomerRepDto } from "src/customer/models/dto/sync-customer-rep.dto"
import { SyncCustomerDto } from "src/customer/models/dto/sync-customer.dto"
import { CustomerService } from "src/customer/services/customer.service"
import { CustomRequest } from "src/request"
import { TenantGuard } from "src/tenant/guards/tenant.guard"

@Controller("customers")
@UseGuards(TenantGuard)
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  /**
   * Syncs a customer.
   */
  @ApiOperation({
    description: "This endpoint creates or updates a customer in the database.",
  })
  @Post("sync")
  async syncCustomer(
    @Body() body: SyncCustomerDto,
    @Req() request: CustomRequest,
  ): Promise<SyncCustomerRepDto> {
    const customer = await this.customerService.syncCustomer({
      email: body.email,
      userRef: body.userRef,
      tenant: request.tenant,
    })

    return { data: customer }
  }
}
