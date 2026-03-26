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
import { StatisticsService } from '../statistics/statistics.service';
import { FairsService } from './fairs.service';
import { CreateFairDto } from './dto/create-fair.dto';
import { UpdateFairDto } from './dto/update-fair.dto';
import { UpdateFairStockDto } from './dto/update-fair-stock.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('fairs')
@UseGuards(JwtAuthGuard)
export class FairsController {
  constructor(
    private readonly fairsService: FairsService,
    private readonly statisticsService: StatisticsService,
  ) {}

  @Post()
  create(@Body() dto: CreateFairDto) {
    return this.fairsService.create(dto);
  }

  @Get()
  findAll() {
    return this.fairsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.fairsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateFairDto) {
    return this.fairsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.fairsService.remove(id);
  }

  @Get(':id/stock')
  getStock(@Param('id') id: string) {
    return this.fairsService.getStock(id);
  }

  @Patch(':id/stock')
  updateStock(@Param('id') id: string, @Body() dto: UpdateFairStockDto) {
    return this.fairsService.updateStock(id, dto);
  }

  @Get(':id/statistics/sales-time-series')
  getSalesTimeSeries(
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('granularity') granularity?: string,
  ) {
    return this.statisticsService.getFairSalesTimeSeries(
      id,
      from,
      to,
      granularity === 'month' ? 'month' : 'week',
    );
  }

  @Get(':id/statistics/articles-time-series')
  getArticlesTimeSeries(
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('granularity') granularity?: string,
  ) {
    return this.statisticsService.getFairArticlesTimeSeries(
      id,
      from,
      to,
      granularity === 'month' ? 'month' : 'week',
    );
  }

  @Get(':id/statistics/composturas-time-series')
  getComposturasTimeSeries(
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('granularity') granularity?: string,
  ) {
    return this.statisticsService.getFairComposturasTimeSeries(
      id,
      from,
      to,
      granularity === 'month' ? 'month' : 'week',
    );
  }

  @Get(':id/statistics')
  getStatistics(@Param('id') id: string) {
    return this.statisticsService.getFairStatistics(id);
  }

  @Post(':id/finalize')
  finalize(@Param('id') id: string) {
    return this.fairsService.finalize(id);
  }

  @Post(':id/reopen')
  reopen(@Param('id') id: string) {
    return this.fairsService.reopen(id);
  }
}
