import { NestExpressApplication } from "@nestjs/platform-express"
import { ValidationPipe } from "@nestjs/common"
import { TypeOrmExceptionFilter } from "src/database/filters/typeorm-exception.filter"

export const configureApp = (app: NestExpressApplication) => {
  app.useGlobalPipes(new ValidationPipe())
  app.useGlobalFilters(new TypeOrmExceptionFilter())
}
