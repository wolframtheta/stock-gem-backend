import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArticlesService } from './articles.service';
import { ArticlesController } from './articles.controller';
import { Article } from './entities/article.entity';
import { ArticlePriceHistory } from './entities/article-price-history.entity';
import { ArticleStockHistory } from './entities/article-stock-history.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { SalesPointStock } from '../sales-points/entities/sales-point-stock.entity';
import { SalesPoint } from '../sales-points/entities/sales-point.entity';
import { Collection } from '../config/entities/collection.entity';
import { ArticleType } from '../config/entities/article-type.entity';
import { FairStock } from '../fairs/entities/fair-stock.entity';
import { SalesPointsModule } from '../sales-points/sales-points.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Article,
      ArticlePriceHistory,
      ArticleStockHistory,
      Supplier,
      SalesPointStock,
      SalesPoint,
      Collection,
      ArticleType,
      FairStock,
    ]),
    SalesPointsModule,
  ],
  controllers: [ArticlesController],
  providers: [ArticlesService],
  exports: [ArticlesService],
})
export class ArticlesModule {}

