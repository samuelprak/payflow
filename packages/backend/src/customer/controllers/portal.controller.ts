import { Controller, Get, Param, ParseUUIDPipe, Res } from "@nestjs/common"
import { Response } from "express"
import { CustomerService } from "src/customer/services/customer.service"
import { PortalSessionService } from "src/customer/services/portal-session.service"

@Controller("portal")
export class PortalController {
  constructor(
    private readonly portalSessionService: PortalSessionService,
    private readonly customerService: CustomerService,
  ) {}

  @Get(":id")
  async redirectToPortal(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Res() res: Response,
  ) {
    const portalSession =
      await this.portalSessionService.getClientPortalSession(id)

    res.redirect(portalSession.portalUrl)
  }

  @Get(":id/return")
  async redirectToReturn(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Res() res: Response,
  ) {
    const portalSession = await this.portalSessionService.getPortalSession(id)
    res.redirect(portalSession.returnUrl)
  }
}
