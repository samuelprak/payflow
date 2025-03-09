import { Request } from "express"
import { Tenant } from "src/tenant/entities/tenant.entity"

export interface CustomRequest extends Request {
  tenant: Tenant
}
