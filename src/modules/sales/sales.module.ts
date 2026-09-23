import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { Sale } from './entities/sale.entity';
import { SaleItem } from './entities/sale-item.entity';
import { Client } from '../clients/entities/client.entity';
import { User } from '../auth/entities/user.entity';
import { Article } from '../articles/entities/article.entity';
import { ArticleVariant } from '../articles/entities/article-variant.entity';
import { SalesPointsModule } from '../sales-points/sales-points.module';
import { FairsModule } from '../fairs/fairs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Sale,
      SaleItem,
      Client,
      User,
      Article,
      ArticleVariant,
    ]),
    SalesPointsModule,
    forwardRef(() => FairsModule),
  ],
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}
