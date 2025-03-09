import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common"
import { CustomRequest } from "src/request"
import { TenantRepository } from "src/tenant/repositories/tenant.repository"

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly tenantRepository: TenantRepository) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<CustomRequest>()
    const apiKey = request.headers["x-api-key"] as string

    if (!apiKey) {
      throw new UnauthorizedException("Header x-api-key is required")
    }

    const tenant = await this.tenantRepository.findOneByApiKey(apiKey)

    if (!tenant) {
      throw new UnauthorizedException("Invalid x-api-key")
    }

    request.tenant = tenant

    return true
  }
}
