import { config } from "dotenv"

config({ path: ".env.development", quiet: true })
config({ path: ".env", quiet: true })

import { SharedDatabaseModule } from "@lyrolab/nest-shared/database"
import { closeTestingApplications } from "test/utils/create-testing-application"

beforeAll(() => SharedDatabaseModule.setupTestDatabase())
beforeEach(() => SharedDatabaseModule.clearTestDatabase())
afterAll(() => closeTestingApplications())
