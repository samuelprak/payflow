import { Injectable, NotFoundException } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import {
  CheckoutSession,
  DEFAULT_EXPIRATION_TIME,
} from "src/customer/entities/checkout-session.entity"
import { Repository } from "typeorm"

type CreateParams = Pick<
  CheckoutSession,
  "configuration" | "customer" | "tenant"
>

@Injectable()
export class CheckoutSessionRepository {
  constructor(
    @InjectRepository(CheckoutSession)
    private readonly repository: Repository<CheckoutSession>,
  ) {}

  async create(params: CreateParams): Promise<CheckoutSession> {
    return this.repository.save({
      ...params,
      expiresAt: new Date(Date.now() + DEFAULT_EXPIRATION_TIME),
    })
  }

  async findOneOrFail(id: string): Promise<CheckoutSession> {
    const checkoutSession = await this.repository.findOneOrFail({
      where: { id },
      relations: ["tenant", "customer"],
    })

    if (checkoutSession.expiresAt < new Date()) {
      throw new NotFoundException()
    }

    return checkoutSession
  }
}
