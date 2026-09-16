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
import { CreatePersonalizationTypeDto } from './dto/create-personalization-type.dto';
import { UpdatePersonalizationTypeDto } from './dto/update-personalization-type.dto';
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
  updateCollection(@Param('id') id: string, @Body() dto: UpdateCollectionDto) {
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

  // Personalization types
  @Get('personalization-types')
  findAllPersonalizationTypes() {
    return this.configService.findAllPersonalizationTypes();
  }

  @Get('personalization-types/:id')
  findOnePersonalizationType(@Param('id') id: string) {
    return this.configService.findOnePersonalizationType(id);
  }

  @Post('personalization-types')
  createPersonalizationType(@Body() dto: CreatePersonalizationTypeDto) {
    return this.configService.createPersonalizationType(dto);
  }

  @Patch('personalization-types/:id')
  updatePersonalizationType(
    @Param('id') id: string,
    @Body() dto: UpdatePersonalizationTypeDto,
  ) {
    return this.configService.updatePersonalizationType(id, dto);
  }

  @Delete('personalization-types/:id')
  removePersonalizationType(@Param('id') id: string) {
    return this.configService.removePersonalizationType(id);
  }
}
