import { AuthorizableUser } from "nest-casl"
import { Roles } from "src/casl/models/roles"

export class CaslUser implements AuthorizableUser<Roles, string> {
  id: string
  roles: Array<Roles>

  constructor(tenantId: string) {
    this.id = tenantId
    this.roles = []
  }
}
