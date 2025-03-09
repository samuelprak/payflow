import { Injectable } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { StripeAccount } from "src/stripe/entities/stripe-account.entity"
import { Repository } from "typeorm"

@Injectable()
export class StripeAccountRepository {
  constructor(
    @InjectRepository(StripeAccount)
    private readonly repository: Repository<StripeAccount>,
  ) {}

  findOneById(id: string): Promise<StripeAccount> {
    return this.repository.findOneByOrFail({ id })
  }

  findOneByTenantId(tenantId: string): Promise<StripeAccount | null> {
    return this.repository
      .createQueryBuilder("stripeAccount")
      .leftJoinAndSelect("stripeAccount.tenants", "tenant")
      .where("tenant.id = :tenantId", { tenantId })
      .getOne()
  }
}
