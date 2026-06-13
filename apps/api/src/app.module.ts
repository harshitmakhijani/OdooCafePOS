import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { configuration } from './config/configuration';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { RealtimeModule } from './realtime/realtime.module';

import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { PaymentMethodsModule } from './payment-methods/payment-methods.module';
import { PromotionsModule } from './promotions/promotions.module';
import { FloorsModule } from './floors/floors.module';
import { TablesModule } from './tables/tables.module';
import { CustomersModule } from './customers/customers.module';
import { RegistersModule } from './registers/registers.module';
import { SessionsModule } from './sessions/sessions.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { KdsModule } from './kds/kds.module';
import { BookingsModule } from './bookings/bookings.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
      validate: validateEnv,
      envFilePath: ['.env', '../../.env'],
    }),
    // Global rate limit (generous default); auth routes apply a tighter @Throttle
    // to blunt brute-force / credential stuffing (PRD §16.1).
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 300 }]),
    // Infrastructure
    PrismaModule,
    RealtimeModule,
    // Feature modules
    HealthModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    ProductsModule,
    PaymentMethodsModule,
    PromotionsModule,
    FloorsModule,
    TablesModule,
    CustomersModule,
    RegistersModule,
    SessionsModule,
    OrdersModule,
    PaymentsModule,
    KdsModule,
    BookingsModule,
    ReportsModule,
  ],
  providers: [
    // Guard order: rate-limit first, then authenticate, then authorize.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
  ],
})
export class AppModule {}
