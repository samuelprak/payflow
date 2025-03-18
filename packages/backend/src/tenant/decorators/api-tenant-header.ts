import { ApiHeader } from "@nestjs/swagger"

export const ApiTenantHeader = () =>
  ApiHeader({
    name: "x-api-key",
    description: "The API key for the tenant",
    required: true,
  })
