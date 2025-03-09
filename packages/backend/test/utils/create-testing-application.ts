import { NestExpressApplication } from "@nestjs/platform-express"
import { TestingModule } from "@nestjs/testing"

const appInstances: NestExpressApplication[] = []

export const createTestingApplication = async (module: TestingModule) => {
  const app = module.createNestApplication<NestExpressApplication>()
  await app.init()
  appInstances.push(app)
  return app
}

export const closeTestingApplications = () =>
  Promise.all(appInstances.map((app) => app.close()))
