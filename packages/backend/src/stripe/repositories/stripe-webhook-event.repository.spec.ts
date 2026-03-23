import { Test, TestingModule } from "@nestjs/testing"
import { TypeOrmModule } from "@nestjs/typeorm"
import { StripeWebhookEvent } from "src/stripe/entities/stripe-webhook-event.entity"
import { StripeWebhookEventRepository } from "src/stripe/repositories/stripe-webhook-event.repository"
import { TestDatabaseModule } from "test/helpers/database"

describe("StripeWebhookEventRepository", () => {
  let module: TestingModule
  let repository: StripeWebhookEventRepository

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TestDatabaseModule,
        TypeOrmModule.forFeature([StripeWebhookEvent]),
      ],
      providers: [StripeWebhookEventRepository],
    }).compile()

    repository = module.get(StripeWebhookEventRepository)
  })

  describe("recordEvent", () => {
    it("should return true on first insert", async () => {
      const result = await repository.recordEvent("evt_unique_1", "acc_test_1")
      expect(result).toBe(true)
    })

    it("should return false on duplicate insert", async () => {
      await repository.recordEvent("evt_dup_test", "acc_dup_test")
      const result = await repository.recordEvent(
        "evt_dup_test",
        "acc_dup_test",
      )
      expect(result).toBe(false)
    })

    it("should allow same event ID for different accounts", async () => {
      await repository.recordEvent("evt_shared", "acc_1")
      const result = await repository.recordEvent("evt_shared", "acc_2")
      expect(result).toBe(true)
    })
  })
})
