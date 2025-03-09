import { Module } from "@nestjs/common"
import { ConfigModule, ConfigService } from "@nestjs/config"
import { TypeOrmModule } from "@nestjs/typeorm"
import { CaslModule } from "nest-casl"
import { join } from "path"
import { CaslUser } from "src/casl/models/casl-user"
import { Roles } from "src/casl/models/roles"
import { PaymentProviderModule } from "src/payment-provider/payment-provider.module"
import { CustomRequest } from "src/request"
import { StripeModule } from "src/stripe/stripe.module"
import { CustomerModule } from "./customer/customer.module"
import { TenantModule } from "./tenant/tenant.module"
import { BullModule } from "@nestjs/bullmq"
import { EventEmitterModule } from "@nestjs/event-emitter"

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".development.env",
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: "postgres",
        host: configService.get("DATABASE_HOST"),
        port: +configService.get("DATABASE_PORT"),
        username: configService.get("DATABASE_USER"),
        password: configService.get("DATABASE_PASSWORD"),
        database: configService.get("DATABASE_NAME"),
        entities: [join(__dirname, "../**/*.entity{.ts,.js}")],
        migrations: [join(__dirname, "database/migrations/*{.ts,.js}")],
        autoLoadEntities: true,
      }),
      inject: [ConfigService],
    }),
    CaslModule.forRoot<Roles, CaslUser, CustomRequest>({
      getUserFromRequest: (request: CustomRequest) =>
        new CaslUser(request.tenant.id),
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          url: configService.get("REDIS_URL") as string,
        },
      }),
      inject: [ConfigService],
    }),
    EventEmitterModule.forRoot(),
    CustomerModule,
    TenantModule,
    StripeModule,
    PaymentProviderModule,
  ],
})
export class AppModule {}
