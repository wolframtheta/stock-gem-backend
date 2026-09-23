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
import { FairVariantStock } from '../fairs/entities/fair-variant-stock.entity';
import { SalesPointVariantStock } from '../sales-points/entities/sales-point-variant-stock.entity';
import { ArticleVariant } from './entities/article-variant.entity';
import { ArticleVariantStock } from './entities/article-variant-stock.entity';
import { SalesPointsModule } from '../sales-points/sales-points.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Article,
      ArticlePhoto,
      ArticleVariant,
      ArticleVariantStock,
      ArticlePriceHistory,
      ArticleStockHistory,
      SalesPointStock,
      SalesPointVariantStock,
      SalesPoint,
      Collection,
      ArticleType,
      FairStock,
      FairVariantStock,
    ]),
    SalesPointsModule,
  ],
  controllers: [ArticlesController],
  providers: [ArticlesService],
  exports: [ArticlesService],
})
export class ArticlesModule {}
