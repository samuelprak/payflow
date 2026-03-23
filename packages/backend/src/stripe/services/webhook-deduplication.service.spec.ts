import { createMock } from "@golevelup/ts-jest"
import { Test, TestingModule } from "@nestjs/testing"
import Redis from "ioredis"
import { StripeWebhookEventRepository } from "src/stripe/repositories/stripe-webhook-event.repository"
import { WebhookDeduplicationService } from "./webhook-deduplication.service"

describe("WebhookDeduplicationService", () => {
  let service: WebhookDeduplicationService
  let redis: jest.Mocked<Redis>
  let webhookEventRepository: jest.Mocked<StripeWebhookEventRepository>

  beforeEach(async () => {
    redis = createMock<Redis>()
    webhookEventRepository = createMock<StripeWebhookEventRepository>()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookDeduplicationService,
        {
          provide: "REDIS_CLIENT",
          useValue: redis,
        },
        {
          provide: StripeWebhookEventRepository,
          useValue: webhookEventRepository,
        },
      ],
    }).compile()

    service = module.get(WebhookDeduplicationService)
  })

  describe("isDuplicate", () => {
    it("should return true when Redis cache hit", async () => {
      redis.get.mockResolvedValue("1")

      const result = await service.isDuplicate("evt_123", "acc_456")

      expect(result).toBe(true)
      expect(redis.get).toHaveBeenCalledWith("stripe:event:evt_123")
      expect(webhookEventRepository.recordEvent).not.toHaveBeenCalled()
    })

    it("should return false when Redis miss and DB insert succeeds (new event)", async () => {
      redis.get.mockResolvedValue(null)
      webhookEventRepository.recordEvent.mockResolvedValue(true)

      const result = await service.isDuplicate("evt_123", "acc_456")

      expect(result).toBe(false)
      expect(redis.get).toHaveBeenCalledWith("stripe:event:evt_123")
      expect(webhookEventRepository.recordEvent).toHaveBeenCalledWith(
        "evt_123",
        "acc_456",
      )
      expect(redis.set).toHaveBeenCalledWith(
        "stripe:event:evt_123",
        "1",
        "EX",
        86400,
      )
    })

    it("should return true when Redis miss but DB duplicate (constraint violation)", async () => {
      redis.get.mockResolvedValue(null)
      webhookEventRepository.recordEvent.mockResolvedValue(false)

      const result = await service.isDuplicate("evt_123", "acc_456")

      expect(result).toBe(true)
      expect(webhookEventRepository.recordEvent).toHaveBeenCalledWith(
        "evt_123",
        "acc_456",
      )
      expect(redis.set).toHaveBeenCalledWith(
        "stripe:event:evt_123",
        "1",
        "EX",
        86400,
      )
    })

    it("should fall back to database when Redis is unavailable", async () => {
      redis.get.mockRejectedValue(new Error("Connection refused"))
      webhookEventRepository.recordEvent.mockResolvedValue(true)

      const result = await service.isDuplicate("evt_123", "acc_456")

      expect(result).toBe(false)
      expect(webhookEventRepository.recordEvent).toHaveBeenCalledWith(
        "evt_123",
        "acc_456",
      )
    })

    it("should gracefully handle Redis set failure", async () => {
      redis.get.mockResolvedValue(null)
      webhookEventRepository.recordEvent.mockResolvedValue(true)
      redis.set.mockRejectedValue(new Error("Connection refused"))

      const result = await service.isDuplicate("evt_123", "acc_456")

      expect(result).toBe(false)
    })
  })
})
