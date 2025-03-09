import { Injectable } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { StripeCustomer } from "src/stripe/entities/stripe-customer.entity"
import { Repository } from "typeorm"

type CreateParams = {
  stripeCustomerId: string
  customerId: string
}

@Injectable()
export class StripeCustomerRepository {
  constructor(
    @InjectRepository(StripeCustomer)
    private readonly repository: Repository<StripeCustomer>,
  ) {}

  async findOneByStripeCustomerId(
    stripeCustomerId: string,
  ): Promise<StripeCustomer | null> {
    return this.repository.findOneBy({ stripeCustomerId })
  }

  async findOneByCustomerId(
    customerId: string,
  ): Promise<StripeCustomer | null> {
    return this.repository.findOneBy({ customer: { id: customerId } })
  }

  async create({
    stripeCustomerId,
    customerId,
  }: CreateParams): Promise<StripeCustomer> {
    const stripeCustomer = this.repository.create({
      stripeCustomerId,
      customer: { id: customerId },
    })

    return this.repository.save(stripeCustomer)
  }
}
