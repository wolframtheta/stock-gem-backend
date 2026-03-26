import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { Sale } from './entities/sale.entity';
import { SaleItem } from './entities/sale-item.entity';
import { Client } from '../clients/entities/client.entity';
import { User } from '../auth/entities/user.entity';
import { Article } from '../articles/entities/article.entity';
import { SalesPointsModule } from '../sales-points/sales-points.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sale, SaleItem, Client, User, Article]),
    SalesPointsModule,
  ],
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}

