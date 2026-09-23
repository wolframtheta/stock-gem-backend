import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalesPointsService } from './sales-points.service';
import { SalesPointsController } from './sales-points.controller';
import { SalesPoint } from './entities/sales-point.entity';
import { SalesPointStock } from './entities/sales-point-stock.entity';
import { Article } from '../articles/entities/article.entity';
import { FairStock } from '../fairs/entities/fair-stock.entity';
import { FairVariantStock } from '../fairs/entities/fair-variant-stock.entity';
import { FairsModule } from '../fairs/fairs.module';
import { ArticleVariant } from '../articles/entities/article-variant.entity';
import { ArticleVariantStock } from '../articles/entities/article-variant-stock.entity';
import { SalesPointVariantStock } from './entities/sales-point-variant-stock.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SalesPoint,
      SalesPointStock,
      SalesPointVariantStock,
      Article,
      ArticleVariant,
      ArticleVariantStock,
      FairStock,
      FairVariantStock,
    ]),
    forwardRef(() => FairsModule),
  ],
  controllers: [SalesPointsController],
  providers: [SalesPointsService],
  exports: [SalesPointsService],
})
export class SalesPointsModule {}
