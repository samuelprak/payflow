// test/utils/test-database.module.ts

import { DynamicModule, Module } from "@nestjs/common"
import { TypeOrmModule, TypeOrmModuleOptions } from "@nestjs/typeorm"
import { join } from "path"
import { GenericContainer, StartedTestContainer, Wait } from "testcontainers"
import { DataSource } from "typeorm"

@Module({})
export class TestDatabaseModule {
  private static container: StartedTestContainer
  private static dataSource: DataSource

  static getDataSource(): DataSource {
    return this.dataSource
  }

  static async forRoot(): Promise<DynamicModule> {
    if (!this.container) {
      this.container = await new GenericContainer("postgres")
        .withExposedPorts(5432)
        .withEnvironment({
          POSTGRES_PASSWORD: "secret",
          POSTGRES_DB: "test",
        })
        .withWaitStrategy(
          Wait.forAll([
            Wait.forListeningPorts(),
            Wait.forLogMessage(
              "database system is ready to accept connections",
            ),
          ]),
        )
        .start()
    }

    const connectionUri = `postgres://postgres:secret@localhost:${this.container.getMappedPort(
      5432,
    )}/test`

    const entities = [join(__dirname, "../../../**/*.entity{.ts,.js}")]

    if (!this.dataSource) {
      this.dataSource = new DataSource({
        type: "postgres",
        url: connectionUri,
        entities,
        synchronize: true,
      })

      await this.dataSource.initialize()
    }

    const typeOrmOptions: TypeOrmModuleOptions = {
      type: "postgres",
      url: connectionUri,
      entities,
      synchronize: true,
      autoLoadEntities: true,
    }

    return {
      module: TestDatabaseModule,
      imports: [TypeOrmModule.forRoot(typeOrmOptions)],
      exports: [TypeOrmModule],
    }
  }

  static async closeConnection(): Promise<void> {
    if (this.dataSource) {
      await this.dataSource.destroy()
    }
    if (this.container) {
      await this.container.stop()
    }
  }

  static async clearDatabase(): Promise<void> {
    if (this.dataSource) {
      await this.dataSource.synchronize(true)
    }
  }
}
