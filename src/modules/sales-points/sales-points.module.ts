import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalesPointsService } from './sales-points.service';
import { SalesPointsController } from './sales-points.controller';
import { SalesPoint } from './entities/sales-point.entity';
import { SalesPointStock } from './entities/sales-point-stock.entity';
import { Article } from '../articles/entities/article.entity';
import { FairStock } from '../fairs/entities/fair-stock.entity';
import { FairsModule } from '../fairs/fairs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SalesPoint, SalesPointStock, Article, FairStock]),
    forwardRef(() => FairsModule),
  ],
  controllers: [SalesPointsController],
  providers: [SalesPointsService],
  exports: [SalesPointsService],
})
export class SalesPointsModule {}
