import { Injectable } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Tenant } from "src/tenant/entities/tenant.entity"
import { Repository } from "typeorm"

@Injectable()
export class TenantRepository {
  constructor(
    @InjectRepository(Tenant)
    private repository: Repository<Tenant>,
  ) {}

  findOneOrFail(id: string) {
    return this.repository.findOneOrFail({
      where: { id },
    })
  }

  findOneByApiKey(apiKey: string) {
    return this.repository.findOne({
      where: { apiKey },
    })
  }
}
