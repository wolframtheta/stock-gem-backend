import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FairsService } from './fairs.service';
import { FairsController } from './fairs.controller';
import { Fair } from './entities/fair.entity';
import { FairStock } from './entities/fair-stock.entity';
import { Article } from '../articles/entities/article.entity';
import { SalesPointsModule } from '../sales-points/sales-points.module';
import { StatisticsModule } from '../statistics/statistics.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Fair, FairStock, Article]),
    forwardRef(() => SalesPointsModule),
    StatisticsModule,
  ],
  controllers: [FairsController],
  providers: [FairsService],
  exports: [FairsService],
})
export class FairsModule {}
