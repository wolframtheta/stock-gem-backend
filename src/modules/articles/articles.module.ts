import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArticlesService } from './articles.service';
import { ArticlesController } from './articles.controller';
import { Article } from './entities/article.entity';
import { ArticlePhoto } from './entities/article-photo.entity';
import { ArticlePriceHistory } from './entities/article-price-history.entity';
import { ArticleStockHistory } from './entities/article-stock-history.entity';
import { SalesPointStock } from '../sales-points/entities/sales-point-stock.entity';
import { SalesPoint } from '../sales-points/entities/sales-point.entity';
import { Collection } from '../config/entities/collection.entity';
import { ArticleType } from '../config/entities/article-type.entity';
import { FairStock } from '../fairs/entities/fair-stock.entity';
import { FairSizeStock } from '../fairs/entities/fair-size-stock.entity';
import { SalesPointSizeStock } from '../sales-points/entities/sales-point-size-stock.entity';
import { ArticleSize } from './entities/article-size.entity';
import { ArticleSizeStock } from './entities/article-size-stock.entity';
import { SalesPointsModule } from '../sales-points/sales-points.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Article,
      ArticlePhoto,
      ArticleSize,
      ArticleSizeStock,
      ArticlePriceHistory,
      ArticleStockHistory,
      SalesPointStock,
      SalesPointSizeStock,
      SalesPoint,
      Collection,
      ArticleType,
      FairStock,
      FairSizeStock,
    ]),
    SalesPointsModule,
  ],
  controllers: [ArticlesController],
  providers: [ArticlesService],
  exports: [ArticlesService],
})
export class ArticlesModule {}
