import { Test } from "@nestjs/testing"
import { Permissions } from "nest-casl"
import { AbilityFactory } from "nest-casl/dist/factories/ability.factory"
import { Roles } from "src/casl/models/roles"

export async function getAbilityFactory(
  permissions: Permissions<Roles>,
): Promise<AbilityFactory> {
  const moduleRef = await Test.createTestingModule({
    providers: [
      AbilityFactory,
      { provide: "CASL_FEATURE_OPTIONS", useValue: { permissions } },
    ],
  }).compile()

  return moduleRef.get<AbilityFactory>(AbilityFactory)
}
