// post.permissions.ts

import { InferSubjects } from "@casl/ability"
import { Actions, Permissions } from "nest-casl"
import { Roles } from "src/casl/models/roles"

import { Customer } from "src/customer/entities/customer.entity"

export type Subjects = InferSubjects<typeof Customer>

export const customerPermissions: Permissions<Roles, Subjects, Actions> = {
  everyone({ can, user }) {
    can(Actions.manage, Customer, { tenantId: user.id })
  },
}
