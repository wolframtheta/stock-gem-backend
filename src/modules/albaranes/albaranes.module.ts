import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlbaranesService } from './albaranes.service';
import { AlbaranesController } from './albaranes.controller';
import { Albaran } from './entities/albaran.entity';
import { AlbaranItem } from './entities/albaran-item.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { Article } from '../articles/entities/article.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Albaran, AlbaranItem, Supplier, Article]),
  ],
  controllers: [AlbaranesController],
  providers: [AlbaranesService],
  exports: [AlbaranesService],
})
export class AlbaranesModule {}

