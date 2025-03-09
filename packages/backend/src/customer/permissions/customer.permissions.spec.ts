import { AnyAbility } from "@casl/ability"
import { Actions } from "nest-casl"
import { CaslUser } from "src/casl/models/casl-user"
import { getAbilityFactory } from "src/casl/tests/get-ability-factory"
import { CustomerFactory } from "src/customer/factories/customer.factory"
import { customerPermissions } from "src/customer/permissions/customer.permissions"

describe("customerPermissions", () => {
  const user = new CaslUser("123")
  let ability: AnyAbility

  beforeEach(async () => {
    const abilityFactory = await getAbilityFactory(customerPermissions)
    ability = abilityFactory.createForUser(user)
  })

  it("allows manage", async () => {
    const customer = await new CustomerFactory().make({ tenantId: "123" })

    expect(ability.can(Actions.update, customer)).toBe(true)
  })

  it("does not allow manage", async () => {
    const customer = await new CustomerFactory().make({ tenantId: "456" })

    expect(ability.can(Actions.update, customer)).toBe(false)
  })
})
