import {
  BadRequestException,
  Controller,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  RawBodyRequest,
  Req,
} from "@nestjs/common"
import { StripeWebhookService } from "src/stripe/services/stripe-webhook.service"

@Controller("stripe-accounts/:stripeAccountId/webhook")
export class StripeWebhookController {
  constructor(private readonly service: StripeWebhookService) {}

  @Post()
  async handleWebhook(
    @Param("stripeAccountId", new ParseUUIDPipe()) stripeAccountId: string,
    @Headers("stripe-signature") signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    const rawBody = req.rawBody
    if (!rawBody) throw new BadRequestException("Raw body is missing")
    await this.service.handleWebhook(stripeAccountId, signature, rawBody)
  }
}
