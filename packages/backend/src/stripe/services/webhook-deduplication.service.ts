import { Inject, Injectable, Logger } from "@nestjs/common"
import Redis from "ioredis"
import { StripeWebhookEventRepository } from "src/stripe/repositories/stripe-webhook-event.repository"

const REDIS_CACHE_TTL = 60 * 60 * 24 // 24 hours

@Injectable()
export class WebhookDeduplicationService {
  private readonly logger = new Logger(WebhookDeduplicationService.name)

  constructor(
    @Inject("REDIS_CLIENT") private readonly redis: Redis,
    private readonly webhookEventRepository: StripeWebhookEventRepository,
  ) {}

  async isDuplicate(eventId: string, accountId: string): Promise<boolean> {
    const cacheKey = `stripe:event:${eventId}`

    // Fast path: check Redis cache
    try {
      const cached = await this.redis.get(cacheKey)
      if (cached) {
        return true
      }
    } catch (error) {
      this.logger.warn(
        `Redis unavailable for dedup check, falling back to database`,
        {
          eventId,
          error: error instanceof Error ? error.message : String(error),
        },
      )
    }

    // Database: try to insert (unique constraint is the safety net)
    const inserted = await this.webhookEventRepository.recordEvent(
      eventId,
      accountId,
    )

    if (!inserted) {
      // Duplicate detected via DB — set Redis cache for future fast-path
      await this.setCache(cacheKey)
      return true
    }

    // New event — set Redis cache
    await this.setCache(cacheKey)
    return false
  }

  private async setCache(key: string): Promise<void> {
    try {
      await this.redis.set(key, "1", "EX", REDIS_CACHE_TTL)
    } catch (error) {
      this.logger.warn(`Failed to set Redis cache for dedup`, {
        key,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
}
