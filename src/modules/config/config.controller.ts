import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from './config.service';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';
import { CreateArticleTypeDto } from './dto/create-article-type.dto';
import { UpdateArticleTypeDto } from './dto/update-article-type.dto';
import { CreateComposturaTypeDto } from './dto/create-compostura-type.dto';
import { UpdateComposturaTypeDto } from './dto/update-compostura-type.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/entities/user.entity';

@Controller('config')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  // Collections
  @Get('collections')
  findAllCollections() {
    return this.configService.findAllCollections();
  }

  @Get('collections/:id')
  findOneCollection(@Param('id') id: string) {
    return this.configService.findOneCollection(id);
  }

  @Post('collections')
  createCollection(@Body() dto: CreateCollectionDto) {
    return this.configService.createCollection(dto);
  }

  @Patch('collections/:id')
  updateCollection(
    @Param('id') id: string,
    @Body() dto: UpdateCollectionDto,
  ) {
    return this.configService.updateCollection(id, dto);
  }

  @Delete('collections/:id')
  removeCollection(@Param('id') id: string) {
    return this.configService.removeCollection(id);
  }

  // Article types
  @Get('article-types')
  findAllArticleTypes() {
    return this.configService.findAllArticleTypes();
  }

  @Get('article-types/:id')
  findOneArticleType(@Param('id') id: string) {
    return this.configService.findOneArticleType(id);
  }

  @Post('article-types')
  createArticleType(@Body() dto: CreateArticleTypeDto) {
    return this.configService.createArticleType(dto);
  }

  @Patch('article-types/:id')
  updateArticleType(
    @Param('id') id: string,
    @Body() dto: UpdateArticleTypeDto,
  ) {
    return this.configService.updateArticleType(id, dto);
  }

  @Delete('article-types/:id')
  removeArticleType(@Param('id') id: string) {
    return this.configService.removeArticleType(id);
  }

  // Compostura types
  @Get('compostura-types')
  findAllComposturaTypes() {
    return this.configService.findAllComposturaTypes();
  }

  @Get('compostura-types/:id')
  findOneComposturaType(@Param('id') id: string) {
    return this.configService.findOneComposturaType(id);
  }

  @Post('compostura-types')
  createComposturaType(@Body() dto: CreateComposturaTypeDto) {
    return this.configService.createComposturaType(dto);
  }

  @Patch('compostura-types/:id')
  updateComposturaType(
    @Param('id') id: string,
    @Body() dto: UpdateComposturaTypeDto,
  ) {
    return this.configService.updateComposturaType(id, dto);
  }

  @Delete('compostura-types/:id')
  removeComposturaType(@Param('id') id: string) {
    return this.configService.removeComposturaType(id);
  }
}
