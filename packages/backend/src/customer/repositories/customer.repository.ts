import { Injectable } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Customer } from "src/customer/entities/customer.entity"
import { Tenant } from "src/tenant/entities/tenant.entity"
import { Repository } from "typeorm"

type FindOrCreateParams = {
  email: string
  userRef: string
  tenant: Tenant
}

@Injectable()
export class CustomerRepository {
  constructor(
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
  ) {}

  async sync({ email, userRef, tenant }: FindOrCreateParams) {
    const customer = await this.customerRepository.findOne({
      where: { userRef, tenant: { id: tenant.id } },
    })

    if (customer) {
      customer.email = email
      await this.customerRepository.save(customer)
      return customer
    }

    const customerToCreate = this.customerRepository.create({
      email,
      userRef,
      tenant,
    })
    return this.customerRepository.save(customerToCreate)
  }
}
