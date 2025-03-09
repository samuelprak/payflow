// post.hook.ts
import { Injectable, NotFoundException } from "@nestjs/common"
import { ModuleRef } from "@nestjs/core"
import { getRepositoryToken } from "@nestjs/typeorm"
import { SubjectBeforeFilterHook } from "nest-casl"

import { CustomRequest } from "src/request"
import { ObjectLiteral, Repository } from "typeorm"

@Injectable()
export abstract class BaseHook<T extends ObjectLiteral & { id: string }>
  implements SubjectBeforeFilterHook<T, CustomRequest>
{
  abstract entity: new () => T
  abstract param: string

  constructor(private moduleRef: ModuleRef) {}

  async run(request: CustomRequest) {
    const repository = this.moduleRef.get<Repository<T>>(
      getRepositoryToken(this.entity),
      { strict: false },
    )
    const params = request.params as Record<string, string>
    const id = params[this.param]
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const instance = await repository.findOneBy({ id } as any)

    if (!instance) {
      throw new NotFoundException()
    }

    return instance
  }
}
