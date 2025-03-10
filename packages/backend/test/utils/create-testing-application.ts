import { NestExpressApplication } from "@nestjs/platform-express"
import { TestingModule } from "@nestjs/testing"
import { configureApp } from "src/bootstrap/configure-app"

const appInstances: NestExpressApplication[] = []

export const createTestingApplication = async (module: TestingModule) => {
  const app = module.createNestApplication<NestExpressApplication>({
    rawBody: true,
  })
  configureApp(app)
  await app.init()
  appInstances.push(app)
  return app
}

export const closeTestingApplications = () =>
  Promise.all(appInstances.map((app) => app.close()))
