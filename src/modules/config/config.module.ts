import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from './config.service';
import { ConfigController } from './config.controller';
import { Collection } from './entities/collection.entity';
import { ArticleType } from './entities/article-type.entity';
import { ComposturaType } from './entities/compostura-type.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Collection, ArticleType, ComposturaType]),
    AuthModule,
  ],
  controllers: [ConfigController],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class PlatformConfigModule {}
