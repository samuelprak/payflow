import { Tenant } from "src/tenant/entities/tenant.entity"

export function asTenant(tenant: Tenant) {
  return { "x-api-key": tenant.apiKey }
}
