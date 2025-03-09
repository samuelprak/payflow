import { TestDatabaseModule } from "test/utils/test-database/test-database.module"

beforeEach(() => TestDatabaseModule.clearDatabase())
afterAll(() => TestDatabaseModule.closeConnection())
