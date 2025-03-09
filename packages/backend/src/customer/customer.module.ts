import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { Customer } from "./entities/customer.entity"
import { CustomerController } from "./controllers/customer.controller"
import { CustomerService } from "./services/customer.service"
import { CustomerRepository } from "src/customer/repositories/customer.repository"
import { TenantModule } from "src/tenant/tenant.module"
import { PaymentProviderModule } from "src/payment-provider/payment-provider.module"

@Module({
  imports: [
    TypeOrmModule.forFeature([Customer]),
    TenantModule,
    PaymentProviderModule,
  ],
  controllers: [CustomerController],
  providers: [CustomerService, CustomerRepository],
})
export class CustomerModule {}
