import { InjectQueue } from "@nestjs/bullmq"
import { Injectable } from "@nestjs/common"
import { OnEvent } from "@nestjs/event-emitter"
import { Queue } from "bullmq"
import {
  SEND_WEBHOOK_JOB,
  WEBHOOK_QUEUE,
} from "src/customer/customer.constants"
import { CustomerUpdatedEvent } from "src/customer/events/customer-updated.event"

@Injectable()
export class SendWebhookOnCustomerUpdatedListener {
  constructor(@InjectQueue(WEBHOOK_QUEUE) private queue: Queue) {}

  @OnEvent(CustomerUpdatedEvent.eventName)
  async handleCustomerUpdatedEvent(event: CustomerUpdatedEvent) {
    await this.queue.add(SEND_WEBHOOK_JOB, event)
  }
}
