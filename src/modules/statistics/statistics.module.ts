import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatisticsService } from './statistics.service';
import { StatisticsController } from './statistics.controller';
import { Sale } from '../sales/entities/sale.entity';
import { SaleItem } from '../sales/entities/sale-item.entity';
import { ArticleStockHistory } from '../articles/entities/article-stock-history.entity';
import { SalesPoint } from '../sales-points/entities/sales-point.entity';
import { Fair } from '../fairs/entities/fair.entity';
import { Compostura } from '../composturas/entities/compostura.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Sale,
      SaleItem,
      ArticleStockHistory,
      SalesPoint,
      Fair,
      Compostura,
    ]),
  ],
  controllers: [StatisticsController],
  providers: [StatisticsService],
  exports: [StatisticsService],
})
export class StatisticsModule {}
