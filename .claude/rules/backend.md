# Backend NestJS Module Structure

This document outlines the standardized structure for NestJS modules in the backend codebase.

## Module Organization

Each feature module follows a consistent directory structure organized by responsibility:

```
src/[feature]/
├── [feature].module.ts          # NestJS module definition
├── controllers/                 # HTTP endpoints and API routes
├── services/                    # Business logic layer
├── repositories/                # Data access layer
├── models/                      # Data models and types
│   ├── entities/               # TypeORM database entities
│   ├── dto/                    # Data Transfer Objects for OpenAPI
│   └── [other-models].ts       # Non-entity classes (types, interfaces)
├── factories/                   # Test data factories
└── mappers/                     # Data transformation utilities
```

## Layer Responsibilities

### Models Directory Structure

- **`models/entities/`**: TypeORM database entities decorated with `@Entity()`, representing database tables
  - Use proper decorators (`@Column`, `@PrimaryGeneratedColumn("uuid")`, `@ManyToOne`, etc.)
  - Include createdAt and updatedAt with `@CreateDateColumn()` and `@UpdateDateColumn()`

- **`models/dto/`**: Data Transfer Objects for OpenAPI specification
  - Use class-validator decorators (`@IsString()`, `@IsUUID()`, `@ValidateNested()`, etc.)
  - Include class-transformer decorators (`@Type()`, `@Transform()`)
  - Follow naming pattern: `[entity]-[action].dto.ts` (e.g., `message-create.dto.ts`)
  - Response DTOs should have static `fromEntity()` methods for transformation
  - The plugin @nestjs/swagger is installed, you don't need to add `@ApiProperty` decorator to DTO properties.
  - **Exception for enums**: For enum properties, you MUST use `@ApiProperty({ enum: EnumName, enumName: "EnumName" })` format to ensure proper OpenAPI documentation. Example: `@ApiProperty({ enum: ConversationTaskSource, enumName: "ConversationTaskSource" })`

- **`models/`** (root): Non-database classes, types, interfaces, and utility models
  - Enums (e.g., `message-role.enum.ts`)
  - Type definitions and interfaces
  - Utility classes and aggregates

### Repositories Layer

- **Purpose**: Data access layer that encapsulates database operations
- **Pattern**: Inject TypeORM repositories and DataSource for transactions
- **Methods**: Domain-specific query methods (e.g., `findByConversationId()`)
- **Transactions**: Use DataSource manager for multi-table operations

### Services Layer

- **Purpose**: Business logic layer containing domain-specific operations
- **Dependencies**: Inject repositories, other services, and external modules
- **Methods**: High-level business operations that orchestrate multiple data operations
- **Error Handling**: Handle business logic validation and error scenarios

### Controllers Layer

- **Purpose**: HTTP endpoints that expose API routes
- **Decorators**: Use `@Controller()`, `@Get()`, `@Post()`, etc.
- **OpenAPI**: Include `@ApiTags()` and `@ApiOperation()` for documentation
- **Validation**: Use DTOs with validation pipes (`@Body()`, `@Param()`)
- **Path Structure**: Follow RESTful conventions (e.g., `/conversations/:id/messages`)

### Factories Directory

- **Purpose**: Test data generation using TypeORM Factory pattern
- **Pattern**: Extend `Factory<Entity>` from `@jorgebodega/typeorm-factory`
- **Usage**: Create realistic test data for unit and integration tests
- **Relationships**: Use `SingleSubfactory` and `LazyInstanceAttribute` for entity relationships

## Module Definition Pattern

The main module file should:
1. Import TypeORM entities via `TypeOrmModule.forFeature([...])`
2. Import related feature modules as dependencies
3. Provide all repositories and services in the providers array
4. Export controllers for HTTP routing

## Testing Structure

- Place test files adjacent to source files with `.spec.ts` extension
- Repository tests should focus on data access patterns
- Service tests should mock dependencies and test business logic
- Controller tests should test HTTP request/response handling
- Use factories for generating test data consistently

## Naming Conventions

- **Files**: Use kebab-case (e.g., `message-create.dto.ts`)
- **Classes**: Use PascalCase (e.g., `MessageService`)
- **DTOs**: Include action suffix (e.g., `MessageCreate`, `MessageGetResponse`)
- **Repositories**: End with `Repository` (e.g., `MessageRepository`)
- **Services**: End with `Service` (e.g., `MessageService`)
- **Controllers**: End with `Controller` (e.g., `MessageController`)

## Database Migrations

When making changes to database schema:
1. Edit entity models in `models/entities/` directory
2. Run `npm run db:generate` to auto-generate migration files
3. Review the generated migration file
4. Run `npm run db:migrate` to apply the migration

**Important**: Never manually write migration files. Always edit entity models first, then generate migrations.

## ESLint Rules

- **Never disable ESLint rules** with `eslint-disable` comments. Fix the underlying issue instead.
- **Non-null assertions (`!`)**: Instead of using `obj!.prop`, guard with `if (!obj) throw new Error("...")` to narrow the type safely.

## Key Dependencies

Standard NestJS module dependencies include:
- `@nestjs/common` - Core decorators and utilities
- `@nestjs/typeorm` - Database integration
- `class-validator` - DTO validation
- `class-transformer` - Data transformation
- `@nestjs/swagger` - OpenAPI documentation
