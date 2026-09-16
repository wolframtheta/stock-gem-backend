import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule } from './config/config.module';
import { ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { ClientsModule } from './modules/clients/clients.module';
import { WorkshopsModule } from './modules/workshops/workshops.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { ArticlesModule } from './modules/articles/articles.module';
import { SalesModule } from './modules/sales/sales.module';
import { PersonalizationsModule } from './modules/personalizations/personalizations.module';
import { AlbaranesModule } from './modules/albaranes/albaranes.module';
import { SalesPointsModule } from './modules/sales-points/sales-points.module';
import { UsersModule } from './modules/users/users.module';
import { PlatformConfigModule } from './modules/config/config.module';
import { FairsModule } from './modules/fairs/fairs.module';
import { StatisticsModule } from './modules/statistics/statistics.module';
import { UploadsModule } from './modules/uploads/uploads.module';

@Module({
  imports: [
    ConfigModule,
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: configService.get('throttle.throttlers')!,
      }),
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) =>
        configService.get('database')!,
      inject: [ConfigService],
    }),
    AuthModule,
    ClientsModule,
    WorkshopsModule,
    SuppliersModule,
    ArticlesModule,
    SalesPointsModule,
    UsersModule,
    PlatformConfigModule,
    FairsModule,
    StatisticsModule,
    SalesModule,
    PersonalizationsModule,
    AlbaranesModule,
    UploadsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
