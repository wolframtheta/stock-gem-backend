import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { SearchArticleDto } from './dto/search-article.dto';
import { AddStockDto } from './dto/add-stock.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../auth/entities/user.entity';

@Controller('articles')
@UseGuards(JwtAuthGuard)
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() createArticleDto: CreateArticleDto) {
    return this.articlesService.create(createArticleDto);
  }

  @Get()
  findAll(
    @Query() searchDto: SearchArticleDto,
    @CurrentUser() user: User,
  ) {
    const hasSearchParams = Object.keys(searchDto).some(
      (key) => searchDto[key] !== undefined && searchDto[key] !== '',
    );

    if (hasSearchParams) {
      return this.articlesService.search(searchDto, user);
    }

    return this.articlesService.findAll(user);
  }

  @Get(':id/available-quantity')
  getAvailableQuantity(@Param('id') id: string) {
    return this.articlesService.getAvailableQuantity(id);
  }

  @Get(':id/stock-breakdown')
  getStockBreakdown(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.articlesService.getStockBreakdown(id, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.articlesService.findOne(id, user);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() updateArticleDto: UpdateArticleDto) {
    return this.articlesService.update(id, updateArticleDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.articlesService.remove(id);
  }

  @Patch(':id/stock')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  updateStock(
    @Param('id') id: string,
    @Body('quantity') quantity: number,
  ) {
    return this.articlesService.updateStock(id, quantity);
  }

  @Post(':id/add-stock')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  addStock(@Param('id') id: string, @Body() dto: AddStockDto) {
    return this.articlesService.addStock(id, dto);
  }

  @Get(':id/price-history')
  getPriceHistory(@Param('id') id: string, @CurrentUser() user: User) {
    return this.articlesService.getPriceHistory(id, user);
  }

  @Get(':id/stock-history')
  getStockHistory(
    @Param('id') id: string,
    @Query('year') year: string | undefined,
    @CurrentUser() user: User,
  ) {
    return this.articlesService.getStockHistory(
      id,
      year ? parseInt(year, 10) : undefined,
      user,
    );
  }
}

