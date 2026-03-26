import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComposturasService } from './composturas.service';
import { ComposturasController } from './composturas.controller';
import { Compostura } from './entities/compostura.entity';
import { Client } from '../clients/entities/client.entity';
import { Workshop } from '../workshops/entities/workshop.entity';
import { ComposturaType } from '../config/entities/compostura-type.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Compostura, Client, Workshop, ComposturaType]),
  ],
  controllers: [ComposturasController],
  providers: [ComposturasService],
  exports: [ComposturasService],
})
export class ComposturasModule {}

