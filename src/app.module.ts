import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
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
import { ComposturasModule } from './modules/composturas/composturas.module';
import { AlbaranesModule } from './modules/albaranes/albaranes.module';
import { SalesPointsModule } from './modules/sales-points/sales-points.module';
import { UsersModule } from './modules/users/users.module';
import { PlatformConfigModule } from './modules/config/config.module';
import { FairsModule } from './modules/fairs/fairs.module';
import { StatisticsModule } from './modules/statistics/statistics.module';

@Module({
  imports: [
    ConfigModule,
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
    ComposturasModule,
    AlbaranesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
