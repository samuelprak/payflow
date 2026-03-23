import { Injectable } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { StripeWebhookEvent } from "src/stripe/entities/stripe-webhook-event.entity"
import { QueryFailedError, Repository } from "typeorm"

@Injectable()
export class StripeWebhookEventRepository {
  constructor(
    @InjectRepository(StripeWebhookEvent)
    private readonly repository: Repository<StripeWebhookEvent>,
  ) {}

  async recordEvent(
    stripeEventId: string,
    stripeAccountId: string,
  ): Promise<boolean> {
    try {
      const event = this.repository.create({
        stripeEventId,
        stripeAccountId,
      })

      await this.repository.save(event)

      return true
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string })?.code === "23505"
      ) {
        return false
      }

      throw error
    }
  }
}
