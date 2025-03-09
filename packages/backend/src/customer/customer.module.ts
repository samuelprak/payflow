import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { CaslModule } from "nest-casl"
import { customerPermissions } from "src/customer/permissions/customer.permissions"
import { CustomerRepository } from "src/customer/repositories/customer.repository"
import { PaymentProviderModule } from "src/payment-provider/payment-provider.module"
import { TenantModule } from "src/tenant/tenant.module"
import { CustomerController } from "./controllers/customer.controller"
import { Customer } from "./entities/customer.entity"
import { CustomerService } from "./services/customer.service"
import { CheckoutController } from "src/customer/controllers/checkout.controller"

@Module({
  imports: [
    TypeOrmModule.forFeature([Customer]),
    CaslModule.forFeature({ permissions: customerPermissions }),
    TenantModule,
    PaymentProviderModule,
  ],
  providers: [CustomerService, CustomerRepository],
  controllers: [CustomerController, CheckoutController],
})
export class CustomerModule {}
