import { NestFactory } from "@nestjs/core"
import { AppModule } from "./app.module"
import { DataSource } from "typeorm"

export default NestFactory.create(AppModule)
  .then((app) => app.get(DataSource))
  .then(async (dataSource) => {
    await dataSource.destroy()
    return dataSource
  })
