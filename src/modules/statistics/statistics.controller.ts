import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { StatisticsService } from './statistics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

const toGranularity = (v?: string): 'month' | 'week' =>
  v === 'week' ? 'week' : 'month';

@Controller('statistics')
@UseGuards(JwtAuthGuard)
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('sales-by-store')
  getSalesByStore(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.statisticsService.getSalesByStore(from, to);
  }

  @Get('sales-by-store/time-series')
  getSalesByStoreTimeSeries(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('granularity') granularity?: string,
  ) {
    return this.statisticsService.getSalesByStoreTimeSeries(
      from,
      to,
      toGranularity(granularity),
    );
  }

  @Get('sales-by-article')
  getSalesByArticle(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.statisticsService.getSalesByArticle(from, to);
  }

  @Get('sales-by-article/time-series')
  getSalesByArticleTimeSeries(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('granularity') granularity?: string,
  ) {
    return this.statisticsService.getSalesByArticleTimeSeries(
      from,
      to,
      toGranularity(granularity),
    );
  }

  @Get('sales-by-fair')
  getSalesByFair(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.statisticsService.getSalesByFair(from, to);
  }

  @Get('sales-by-fair/time-series')
  getSalesByFairTimeSeries(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('granularity') granularity?: string,
  ) {
    return this.statisticsService.getSalesByFairTimeSeries(
      from,
      to,
      toGranularity(granularity),
    );
  }

  @Get('manufacturing')
  getManufacturing(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.statisticsService.getManufacturing(from, to);
  }

  @Get('manufacturing/time-series')
  getManufacturingTimeSeries(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('granularity') granularity?: string,
  ) {
    return this.statisticsService.getManufacturingTimeSeries(
      from,
      to,
      toGranularity(granularity),
    );
  }
}
