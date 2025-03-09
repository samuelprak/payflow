// post.hook.ts
import { Injectable } from "@nestjs/common"
import { BaseHook } from "src/casl/permissions/base.hook"

import { Customer } from "src/customer/entities/customer.entity"

@Injectable()
export class CustomerHook extends BaseHook<Customer> {
  entity = Customer
  param = "customerId"
}
