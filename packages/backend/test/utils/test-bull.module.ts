// test/utils/test-database.module.ts

import { BullModule } from "@nestjs/bullmq"
import { DynamicModule, Module } from "@nestjs/common"
import { GenericContainer, StartedTestContainer, Wait } from "testcontainers"

@Module({})
export class TestBullModule {
  private static container: StartedTestContainer

  static async forRoot(): Promise<DynamicModule> {
    if (!this.container) {
      this.container = await new GenericContainer("redis")
        .withExposedPorts(6379)
        .withWaitStrategy(
          Wait.forAll([
            Wait.forListeningPorts(),
            Wait.forLogMessage("Ready to accept connections tcp"),
          ]),
        )
        .start()
    }

    return {
      module: TestBullModule,
      imports: [
        BullModule.forRoot({
          connection: {
            host: this.container.getHost(),
            port: this.container.getMappedPort(6379),
          },
        }),
      ],
      exports: [BullModule],
    }
  }
}
