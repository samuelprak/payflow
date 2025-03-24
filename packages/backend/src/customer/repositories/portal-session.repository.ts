import { Injectable, NotFoundException } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import {
  PortalSession,
  DEFAULT_EXPIRATION_TIME,
} from "src/customer/entities/portal-session.entity"
import { Repository } from "typeorm"

type CreateParams = Pick<PortalSession, "returnUrl" | "customer" | "tenant">

@Injectable()
export class PortalSessionRepository {
  constructor(
    @InjectRepository(PortalSession)
    private readonly repository: Repository<PortalSession>,
  ) {}

  async create(params: CreateParams): Promise<PortalSession> {
    return this.repository.save({
      ...params,
      expiresAt: new Date(Date.now() + DEFAULT_EXPIRATION_TIME),
    })
  }

  async findOneOrFail(id: string): Promise<PortalSession> {
    const portalSession = await this.repository.findOneOrFail({
      where: { id },
      relations: ["tenant", "customer"],
    })

    if (portalSession.expiresAt < new Date()) {
      throw new NotFoundException()
    }

    return portalSession
  }
}
