import { closeTestingApplications } from "test/utils/create-testing-application"
import { TestDatabaseModule } from "test/utils/test-database/test-database.module"

beforeEach(() => TestDatabaseModule.clearDatabase())
afterAll(async () => {
  await closeTestingApplications()
  await TestDatabaseModule.closeConnection()
})
