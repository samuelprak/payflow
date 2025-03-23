import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Res,
} from "@nestjs/common"
import { Response } from "express"
import { CheckoutSessionService } from "src/customer/services/checkout-session.service"

@Controller("checkout")
export class CheckoutController {
  constructor(
    private readonly checkoutSessionService: CheckoutSessionService,
  ) {}

  @Get(":id")
  async redirectToCheckout(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Res() res: Response,
  ) {
    const checkoutSession =
      await this.checkoutSessionService.getClientCheckoutSession(id)

    res.redirect(checkoutSession.checkoutUrl)
  }

  @Get(":id/success")
  async redirectToSuccess(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Res() res: Response,
  ) {
    const checkoutSession =
      await this.checkoutSessionService.getCheckoutSession(id)

    if (!checkoutSession.configuration.successUrl) {
      throw new BadRequestException("Success URL not set")
    }

    res.redirect(checkoutSession.configuration.successUrl)
  }

  @Get(":id/cancel")
  async redirectToCancel(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Res() res: Response,
  ) {
    const checkoutSession =
      await this.checkoutSessionService.getCheckoutSession(id)

    if (!checkoutSession.configuration.cancelUrl) {
      throw new BadRequestException("Cancel URL not set")
    }

    res.redirect(checkoutSession.configuration.cancelUrl)
  }
}
