import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { Tenant } from "./entities/tenant.entity"
import { TenantGuard } from "src/tenant/guards/tenant.guard"
import { TenantRepository } from "src/tenant/repositories/tenant.repository"

@Module({
  imports: [TypeOrmModule.forFeature([Tenant])],
  providers: [TenantGuard, TenantRepository],
  exports: [TenantGuard, TenantRepository],
})
export class TenantModule {}
