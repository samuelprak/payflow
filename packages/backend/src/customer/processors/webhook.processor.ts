import { Processor, WorkerHost } from "@nestjs/bullmq"
import axios from "axios"
import { Job } from "bullmq"
import {
  SEND_WEBHOOK_JOB,
  WEBHOOK_QUEUE,
} from "src/customer/customer.constants"
import { Customer } from "src/customer/entities/customer.entity"
import { CustomerUpdatedEvent } from "src/customer/events/customer-updated.event"
import { CustomerGet } from "src/customer/models/dto/customer-get.dto"
import { InvoicePaidGet } from "src/customer/models/dto/invoice-paid-get.dto"
import { WebhookEvent } from "src/customer/models/dto/webhook-event.dto"
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

    const event = await this.getWebhookEvent(customer, data)
    const tenantWebhookUrl = customer.tenant.webhookUrl

    await axios.post(tenantWebhookUrl, event)
  }

  private async getWebhookEvent(
    customer: Customer,
    data: CustomerUpdatedEvent,
  ): Promise<WebhookEvent> {
    switch (data.data.type) {
      case "customer.updated":
        return this.getCustomerUpdatedWebhookEvent(customer)
      case "invoice.paid":
        return this.getInvoicePaidWebhookEvent(customer, data.data.receiptUrl)
    }
  }

  private async getCustomerUpdatedWebhookEvent(
    customer: Customer,
  ): Promise<WebhookEvent> {
    const client = await this.paymentProviderService.forTenant(
      customer.tenant.id,
    )

    const subscriptions = await client.getSubscriptions(customer.id)

    return {
      data: {
        type: "customer.updated",
        customer: CustomerGet.fromEntity(customer, subscriptions),
      },
    }
  }

  private getInvoicePaidWebhookEvent(
    customer: Customer,
    receiptUrl: string,
  ): WebhookEvent {
    return {
      data: {
        type: "invoice.paid",
        invoice: InvoicePaidGet.fromEntity(customer, receiptUrl),
      },
    }
  }
}
