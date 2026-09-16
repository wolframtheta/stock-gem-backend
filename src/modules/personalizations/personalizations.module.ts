import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PersonalizationsService } from './personalizations.service';
import { PersonalizationsController } from './personalizations.controller';
import { Personalization } from './entities/personalization.entity';
import { Client } from '../clients/entities/client.entity';
import { Workshop } from '../workshops/entities/workshop.entity';
import { PersonalizationType } from '../config/entities/personalization-type.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Personalization,
      Client,
      Workshop,
      PersonalizationType,
    ]),
  ],
  controllers: [PersonalizationsController],
  providers: [PersonalizationsService],
  exports: [PersonalizationsService],
})
export class PersonalizationsModule {}
