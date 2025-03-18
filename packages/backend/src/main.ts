import { NestFactory } from "@nestjs/core"
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger"
import { configureApp } from "src/bootstrap/configure-app"
import { AppModule } from "./app.module"
import { NestExpressApplication } from "@nestjs/platform-express"
import { WebhookEvent } from "src/customer/models/dto/webhook-event.dto"

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  })

  configureApp(app)

  const config = new DocumentBuilder()
    .setTitle("Payflow")
    .setDescription("Payflow API")
    .setVersion("1.0")
    .addApiKey({ type: "apiKey", name: "x-api-key", in: "header" })
    .build()

  const documentFactory = () =>
    SwaggerModule.createDocument(app, config, { extraModels: [WebhookEvent] })
  SwaggerModule.setup("api", app, documentFactory)

  app.enableShutdownHooks()
  await app.listen(process.env.PORT ?? 3000)
}
void bootstrap()
