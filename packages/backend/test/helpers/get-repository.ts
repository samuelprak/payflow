import { TestingModule } from "@nestjs/testing"
import { getRepositoryToken } from "@nestjs/typeorm"
import { ObjectLiteral, Repository } from "typeorm"

export function getRepository<T extends ObjectLiteral>(
  module: TestingModule,
  entity: new () => T,
) {
  return module.get<Repository<T>>(getRepositoryToken(entity))
}
