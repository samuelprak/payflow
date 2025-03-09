import { Processor, WorkerHost } from "@nestjs/bullmq"
import axios from "axios"
import { Job } from "bullmq"
import {
  SEND_WEBHOOK_JOB,
  WEBHOOK_QUEUE,
} from "src/customer/customer.constants"
import { CustomerUpdatedEvent } from "src/customer/events/customer-updated.event"
import { CustomerGet } from "src/customer/models/dto/customer-get.dto"
import { CustomerUpdatedWebhookEvent } from "src/customer/models/dto/customer-updated-webhook-event.dto"
import { CustomerRepository } from "src/customer/repositories/customer.repository"
import { PaymentProviderService } from "src/payment-provider/services/payment-provider.service"

@Processor(WEBHOOK_QUEUE, {
  concurrency: 100,
})
export class WebhookProcessor extends WorkerHost {
  constructor(
    private readonly customerRepository: CustomerRepository,
    private readonly paymentProviderService: PaymentProviderService,
  ) {
    super()
  }

  async process(job: Job) {
    if (job.name === SEND_WEBHOOK_JOB) {
      await this.getCustomerAndSendWebhook(job.data as CustomerUpdatedEvent)
    }
  }

  private async getCustomerAndSendWebhook(data: CustomerUpdatedEvent) {
    const customer = await this.customerRepository.findOneWithTenant(
      data.customerId,
    )
    if (!customer) return
    const client = await this.paymentProviderService.forTenant(
      customer.tenant.id,
    )
    const subscriptions = await client.getSubscriptions(customer.id)
    const customerGet = CustomerGet.fromEntity(customer, subscriptions)
    const event: CustomerUpdatedWebhookEvent = {
      type: "customer.updated",
      customer: customerGet,
    }
    const tenantWebhookUrl = customer.tenant.webhookUrl

    await axios.post(tenantWebhookUrl, event)
  }
}
