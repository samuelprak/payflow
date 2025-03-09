import { registerAs } from "@nestjs/config"
import { ClassConstructor, plainToClass } from "class-transformer"
import { validateSync } from "class-validator"

export function registerConfig(envVariablesClass: ClassConstructor<any>) {
  return registerAs(envVariablesClass.name, () =>
    validateUtil(process.env, envVariablesClass),
  )
}

export function validateUtil(
  config: Record<string, unknown>,
  envVariablesClass: ClassConstructor<any>,
) {
  const validatedConfig = plainToClass(envVariablesClass, config, {
    enableImplicitConversion: true,
  }) as Record<string, unknown>
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
    whitelist: true,
  })
  if (errors.length > 0) throw new Error(errors.toString())
  return validatedConfig
}
