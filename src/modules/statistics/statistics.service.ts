import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Sale } from '../sales/entities/sale.entity';
import { SaleItem } from '../sales/entities/sale-item.entity';
import { ArticleStockHistory } from '../articles/entities/article-stock-history.entity';
import { SalesPoint } from '../sales-points/entities/sales-point.entity';
import { Fair } from '../fairs/entities/fair.entity';
import { Compostura } from '../composturas/entities/compostura.entity';

export interface SalesByStoreRow {
  id: string;
  name: string;
  code?: string;
  totalAmount: number;
  saleCount: number;
}

export interface SalesByArticleRow {
  articleId: string;
  articleRef: string;
  articleDesc: string;
  quantitySold: number;
  totalAmount: number;
}

export interface SalesByFairRow {
  fairId: string;
  fairName: string;
  totalAmount: number;
  saleCount: number;
}

export interface FairStatistics {
  totalAmount: number;
  saleCount: number;
  totalCost: number;
  profit: number;
}

export interface ManufacturingRow {
  articleId: string;
  articleRef: string;
  articleDesc: string;
  quantityAdded: number;
}

export type TimeSeriesGranularity = 'month' | 'week';

export interface TimeSeriesResponse {
  periods: string[];
  series: { id: string; label: string; data: number[] }[];
}

@Injectable()
export class StatisticsService {
  constructor(
    @InjectRepository(Sale)
    private saleRepository: Repository<Sale>,
    @InjectRepository(SaleItem)
    private saleItemRepository: Repository<SaleItem>,
    @InjectRepository(ArticleStockHistory)
    private stockHistoryRepository: Repository<ArticleStockHistory>,
    @InjectRepository(SalesPoint)
    private salesPointRepository: Repository<SalesPoint>,
    @InjectRepository(Fair)
    private fairRepository: Repository<Fair>,
    @InjectRepository(Compostura)
    private composturaRepository: Repository<Compostura>,
  ) {}

  private parseDateRange(
    from?: string,
    to?: string,
  ): { start: Date; end: Date } {
    const now = new Date();
    const start = from ? new Date(from) : new Date(now.getFullYear(), 0, 1);
    const end = to ? new Date(to) : new Date();
    return { start, end };
  }

  private generatePeriods(
    start: Date,
    end: Date,
    granularity: TimeSeriesGranularity,
  ): string[] {
    const periods: string[] = [];
    const curr = new Date(start);
    curr.setHours(0, 0, 0, 0);
    const endDate = new Date(end);
    endDate.setHours(23, 59, 59, 999);

    if (granularity === 'month') {
      curr.setDate(1);
      while (curr <= endDate) {
        periods.push(
          `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}`,
        );
        curr.setMonth(curr.getMonth() + 1);
      }
    } else {
      const msPerWeek = 7 * 24 * 60 * 60 * 1000;
      const weekStart = new Date(curr);
      const day = weekStart.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      weekStart.setDate(weekStart.getDate() + diff);
      weekStart.setHours(0, 0, 0, 0);

      let weekDate = new Date(weekStart);
      while (weekDate <= endDate) {
        periods.push(weekDate.toISOString().split('T')[0]);
        weekDate = new Date(weekDate.getTime() + msPerWeek);
      }
    }
    return periods;
  }

  private buildTimeSeriesResponse(
    periods: string[],
    seriesMap: Map<
      string,
      { label: string; amounts: Record<string, number> }
    >,
  ): TimeSeriesResponse {
    const series = Array.from(seriesMap.entries()).map(([id, { label, amounts }]) => ({
      id,
      label,
      data: periods.map((p) => amounts[p] ?? 0),
    }));
    return { periods, series };
  }

  async getSalesByStore(
    from?: string,
    to?: string,
  ): Promise<SalesByStoreRow[]> {
    const { start, end } = this.parseDateRange(from, to);

    const sales = await this.saleRepository
      .createQueryBuilder('s')
      .select('s.sales_point_id', 'salesPointId')
      .addSelect('SUM(s.total_amount)', 'totalAmount')
      .addSelect('COUNT(s.id)', 'saleCount')
      .where('s.fair_id IS NULL')
      .andWhere('s.sale_date BETWEEN :start AND :end', { start, end })
      .groupBy('s.sales_point_id')
      .getRawMany();

    const pointIds = sales.map((r) => r.salesPointId);
    const points =
      pointIds.length > 0
        ? await this.salesPointRepository.find({
            where: { id: In(pointIds) },
          })
        : [];
    const pointMap = new Map(points.map((p) => [p.id, p]));

    return sales.map((r) => {
      const p = pointMap.get(r.salesPointId);
      return {
        id: r.salesPointId,
        name: p?.name ?? 'Desconegut',
        code: p?.code,
        totalAmount: Number(r.totalAmount),
        saleCount: Number(r.saleCount),
      };
    });
  }

  async getSalesByArticle(
    from?: string,
    to?: string,
  ): Promise<SalesByArticleRow[]> {
    const { start, end } = this.parseDateRange(from, to);

    const rows = await this.saleItemRepository
      .createQueryBuilder('si')
      .innerJoin('si.sale', 's')
      .innerJoin('si.article', 'a')
      .select('si.article_id', 'articleId')
      .addSelect('a.own_reference', 'articleRef')
      .addSelect('a.description', 'articleDesc')
      .addSelect('SUM(si.quantity)', 'quantitySold')
      .addSelect('SUM(si.total_price)', 'totalAmount')
      .where('s.sale_date BETWEEN :start AND :end', { start, end })
      .groupBy('si.article_id')
      .addGroupBy('a.own_reference')
      .addGroupBy('a.description')
      .orderBy('SUM(si.quantity)', 'DESC')
      .getRawMany();

    return rows.map((r) => ({
      articleId: r.articleId,
      articleRef: r.articleRef,
      articleDesc: r.articleDesc,
      quantitySold: Number(r.quantitySold),
      totalAmount: Number(r.totalAmount),
    }));
  }

  async getFairStatistics(fairId: string): Promise<FairStatistics> {
    const salesAgg = await this.saleRepository
      .createQueryBuilder('s')
      .select('COALESCE(SUM(s.total_amount), 0)', 'totalAmount')
      .addSelect('COUNT(s.id)', 'saleCount')
      .where('s.fair_id = :fairId', { fairId })
      .getRawOne();

    const costRow = await this.saleItemRepository
      .createQueryBuilder('si')
      .innerJoin('si.sale', 's')
      .innerJoin('si.article', 'a')
      .select('COALESCE(SUM(si.quantity * a.cost), 0)', 'totalCost')
      .where('s.fair_id = :fairId', { fairId })
      .getRawOne();

    const totalAmount = Number(salesAgg?.totalAmount ?? 0);
    const totalCost = Number(costRow?.totalCost ?? 0);
    return {
      totalAmount,
      saleCount: Number(salesAgg?.saleCount ?? 0),
      totalCost,
      profit: totalAmount - totalCost,
    };
  }

  async getSalesByFair(
    from?: string,
    to?: string,
  ): Promise<SalesByFairRow[]> {
    const { start, end } = this.parseDateRange(from, to);

    const sales = await this.saleRepository
      .createQueryBuilder('s')
      .select('s.fair_id', 'fairId')
      .addSelect('SUM(s.total_amount)', 'totalAmount')
      .addSelect('COUNT(s.id)', 'saleCount')
      .where('s.fair_id IS NOT NULL')
      .andWhere('s.sale_date BETWEEN :start AND :end', { start, end })
      .groupBy('s.fair_id')
      .getRawMany();

    const fairIds = sales.map((r) => r.fairId).filter(Boolean);
    const fairs =
      fairIds.length > 0
        ? await this.fairRepository.find({
            where: { id: In(fairIds) },
          })
        : [];
    const fairMap = new Map(fairs.map((f) => [f.id, f]));

    return sales.map((r) => ({
      fairId: r.fairId,
      fairName: fairMap.get(r.fairId)?.name ?? 'Desconegut',
      totalAmount: Number(r.totalAmount),
      saleCount: Number(r.saleCount),
    }));
  }

  async getManufacturing(
    from?: string,
    to?: string,
  ): Promise<ManufacturingRow[]> {
    const { start, end } = this.parseDateRange(from, to);

    const rows = await this.stockHistoryRepository
      .createQueryBuilder('h')
      .innerJoin('h.article', 'a')
      .select('h.article_id', 'articleId')
      .addSelect('a.own_reference', 'articleRef')
      .addSelect('a.description', 'articleDesc')
      .addSelect('SUM(h.quantity_added)', 'quantityAdded')
      .where('h.recorded_at BETWEEN :start AND :end', { start, end })
      .groupBy('h.article_id')
      .addGroupBy('a.own_reference')
      .addGroupBy('a.description')
      .orderBy('SUM(h.quantity_added)', 'DESC')
      .getRawMany();

    return rows.map((r) => ({
      articleId: r.articleId,
      articleRef: r.articleRef,
      articleDesc: r.articleDesc,
      quantityAdded: Number(r.quantityAdded),
    }));
  }

  async getSalesByStoreTimeSeries(
    from?: string,
    to?: string,
    granularity: TimeSeriesGranularity = 'month',
  ): Promise<TimeSeriesResponse> {
    const { start, end } = this.parseDateRange(from, to);
    const periods = this.generatePeriods(start, end, granularity);

    const periodExpr =
      granularity === 'month'
        ? "to_char(s.sale_date, 'YYYY-MM')"
        : "to_char(date_trunc('week', s.sale_date)::date, 'YYYY-MM-DD')";

    const rows = await this.saleRepository
      .createQueryBuilder('s')
      .select('s.sales_point_id', 'id')
      .addSelect(periodExpr, 'period')
      .addSelect('SUM(s.total_amount)', 'amount')
      .where('s.fair_id IS NULL')
      .andWhere('s.sale_date BETWEEN :start AND :end', { start, end })
      .groupBy('s.sales_point_id')
      .addGroupBy(periodExpr)
      .getRawMany();

    const pointIds = [...new Set(rows.map((r) => r.id))];
    const points =
      pointIds.length > 0
        ? await this.salesPointRepository.find({
            where: { id: In(pointIds) },
          })
        : [];
    const pointMap = new Map(points.map((p) => [p.id, p]));

    const seriesMap = new Map<
      string,
      { label: string; amounts: Record<string, number> }
    >();
    for (const r of rows) {
      const p = pointMap.get(r.id);
      const label = p ? `${p.name}${p.code ? ` (${p.code})` : ''}` : 'Desconegut';
      if (!seriesMap.has(r.id)) {
        seriesMap.set(r.id, { label, amounts: {} });
      }
      seriesMap.get(r.id)!.amounts[r.period] = Number(r.amount);
    }
    return this.buildTimeSeriesResponse(periods, seriesMap);
  }

  async getSalesByArticleTimeSeries(
    from?: string,
    to?: string,
    granularity: TimeSeriesGranularity = 'month',
  ): Promise<TimeSeriesResponse> {
    const { start, end } = this.parseDateRange(from, to);
    const periods = this.generatePeriods(start, end, granularity);

    const periodExpr =
      granularity === 'month'
        ? "to_char(s.sale_date, 'YYYY-MM')"
        : "to_char(date_trunc('week', s.sale_date)::date, 'YYYY-MM-DD')";

    const rows = await this.saleItemRepository
      .createQueryBuilder('si')
      .innerJoin('si.sale', 's')
      .innerJoin('si.article', 'a')
      .select('si.article_id', 'id')
      .addSelect('a.own_reference', 'articleRef')
      .addSelect(periodExpr, 'period')
      .addSelect('SUM(si.total_price)', 'amount')
      .where('s.sale_date BETWEEN :start AND :end', { start, end })
      .groupBy('si.article_id')
      .addGroupBy('a.own_reference')
      .addGroupBy(periodExpr)
      .getRawMany();

    const seriesMap = new Map<
      string,
      { label: string; amounts: Record<string, number> }
    >();
    for (const r of rows) {
      const label = r.articleRef;
      if (!seriesMap.has(r.id)) {
        seriesMap.set(r.id, { label, amounts: {} });
      }
      seriesMap.get(r.id)!.amounts[r.period] = Number(r.amount);
    }
    return this.buildTimeSeriesResponse(periods, seriesMap);
  }

  async getSalesByFairTimeSeries(
    from?: string,
    to?: string,
    granularity: TimeSeriesGranularity = 'month',
  ): Promise<TimeSeriesResponse> {
    const { start, end } = this.parseDateRange(from, to);
    const periods = this.generatePeriods(start, end, granularity);

    const periodExpr =
      granularity === 'month'
        ? "to_char(s.sale_date, 'YYYY-MM')"
        : "to_char(date_trunc('week', s.sale_date)::date, 'YYYY-MM-DD')";

    const rows = await this.saleRepository
      .createQueryBuilder('s')
      .select('s.fair_id', 'id')
      .addSelect(periodExpr, 'period')
      .addSelect('SUM(s.total_amount)', 'amount')
      .where('s.fair_id IS NOT NULL')
      .andWhere('s.sale_date BETWEEN :start AND :end', { start, end })
      .groupBy('s.fair_id')
      .addGroupBy(periodExpr)
      .getRawMany();

    const fairIds = [...new Set(rows.map((r) => r.id).filter(Boolean))];
    const fairs =
      fairIds.length > 0
        ? await this.fairRepository.find({
            where: { id: In(fairIds) },
          })
        : [];
    const fairMap = new Map(fairs.map((f) => [f.id, f]));

    const seriesMap = new Map<
      string,
      { label: string; amounts: Record<string, number> }
    >();
    for (const r of rows) {
      const label = fairMap.get(r.id)?.name ?? 'Desconegut';
      if (!seriesMap.has(r.id)) {
        seriesMap.set(r.id, { label, amounts: {} });
      }
      seriesMap.get(r.id)!.amounts[r.period] = Number(r.amount);
    }
    return this.buildTimeSeriesResponse(periods, seriesMap);
  }

  async getManufacturingTimeSeries(
    from?: string,
    to?: string,
    granularity: TimeSeriesGranularity = 'month',
  ): Promise<TimeSeriesResponse> {
    const { start, end } = this.parseDateRange(from, to);
    const periods = this.generatePeriods(start, end, granularity);

    const periodExpr =
      granularity === 'month'
        ? "to_char(h.recorded_at, 'YYYY-MM')"
        : "to_char(date_trunc('week', h.recorded_at)::date, 'YYYY-MM-DD')";

    const rows = await this.stockHistoryRepository
      .createQueryBuilder('h')
      .innerJoin('h.article', 'a')
      .select('h.article_id', 'id')
      .addSelect('a.own_reference', 'articleRef')
      .addSelect(periodExpr, 'period')
      .addSelect('SUM(h.quantity_added)', 'amount')
      .where('h.recorded_at BETWEEN :start AND :end', { start, end })
      .groupBy('h.article_id')
      .addGroupBy('a.own_reference')
      .addGroupBy(periodExpr)
      .getRawMany();

    const seriesMap = new Map<
      string,
      { label: string; amounts: Record<string, number> }
    >();
    for (const r of rows) {
      const label = r.articleRef;
      if (!seriesMap.has(r.id)) {
        seriesMap.set(r.id, { label, amounts: {} });
      }
      seriesMap.get(r.id)!.amounts[r.period] = Number(r.amount);
    }
    return this.buildTimeSeriesResponse(periods, seriesMap);
  }

  async getFairSalesTimeSeries(
    fairId: string,
    from?: string,
    to?: string,
    granularity: TimeSeriesGranularity = 'week',
  ): Promise<TimeSeriesResponse> {
    const fair = await this.fairRepository.findOne({ where: { id: fairId } });
    if (!fair) throw new NotFoundException('Fira no trobada');
    const { start, end } = this.parseDateRange(
      from ?? fair.startDate.toString(),
      to ?? fair.endDate.toString(),
    );
    const periods = this.generatePeriods(start, end, granularity);

    const periodExpr =
      granularity === 'month'
        ? "to_char(s.sale_date, 'YYYY-MM')"
        : "to_char(date_trunc('week', s.sale_date)::date, 'YYYY-MM-DD')";

    const rows = await this.saleRepository
      .createQueryBuilder('s')
      .select(periodExpr, 'period')
      .addSelect('COALESCE(SUM(s.total_amount), 0)', 'amount')
      .where('s.fair_id = :fairId', { fairId })
      .andWhere('s.sale_date BETWEEN :start AND :end', { start, end })
      .groupBy(periodExpr)
      .getRawMany();

    const amounts: Record<string, number> = {};
    for (const r of rows) {
      amounts[r.period] = Number(r.amount);
    }
    const seriesMap = new Map<
      string,
      { label: string; amounts: Record<string, number> }
    >();
    seriesMap.set('sales', { label: 'Vendes (€)', amounts });
    return this.buildTimeSeriesResponse(periods, seriesMap);
  }

  async getFairArticlesTimeSeries(
    fairId: string,
    from?: string,
    to?: string,
    granularity: TimeSeriesGranularity = 'week',
  ): Promise<TimeSeriesResponse> {
    const fair = await this.fairRepository.findOne({ where: { id: fairId } });
    if (!fair) throw new NotFoundException('Fira no trobada');
    const { start, end } = this.parseDateRange(
      from ?? fair.startDate.toString(),
      to ?? fair.endDate.toString(),
    );
    const periods = this.generatePeriods(start, end, granularity);

    const periodExpr =
      granularity === 'month'
        ? "to_char(s.sale_date, 'YYYY-MM')"
        : "to_char(date_trunc('week', s.sale_date)::date, 'YYYY-MM-DD')";

    const rows = await this.saleItemRepository
      .createQueryBuilder('si')
      .innerJoin('si.sale', 's')
      .innerJoin('si.article', 'a')
      .select('si.article_id', 'id')
      .addSelect('a.own_reference', 'articleRef')
      .addSelect(periodExpr, 'period')
      .addSelect('SUM(si.total_price)', 'amount')
      .where('s.fair_id = :fairId', { fairId })
      .andWhere('s.sale_date BETWEEN :start AND :end', { start, end })
      .groupBy('si.article_id')
      .addGroupBy('a.own_reference')
      .addGroupBy(periodExpr)
      .getRawMany();

    const seriesMap = new Map<
      string,
      { label: string; amounts: Record<string, number> }
    >();
    for (const r of rows) {
      const label = r.articleRef;
      if (!seriesMap.has(r.id)) {
        seriesMap.set(r.id, { label, amounts: {} });
      }
      seriesMap.get(r.id)!.amounts[r.period] = Number(r.amount);
    }
    return this.buildTimeSeriesResponse(periods, seriesMap);
  }

  async getFairComposturasTimeSeries(
    fairId: string,
    from?: string,
    to?: string,
    granularity: TimeSeriesGranularity = 'week',
  ): Promise<TimeSeriesResponse> {
    const fair = await this.fairRepository.findOne({ where: { id: fairId } });
    if (!fair) throw new NotFoundException('Fira no trobada');
    const { start, end } = this.parseDateRange(
      from ?? fair.startDate.toString(),
      to ?? fair.endDate.toString(),
    );
    const periods = this.generatePeriods(start, end, granularity);

    const periodExpr =
      granularity === 'month'
        ? "to_char(c.entry_date, 'YYYY-MM')"
        : "to_char(date_trunc('week', c.entry_date)::date, 'YYYY-MM-DD')";

    const rows = await this.composturaRepository
      .createQueryBuilder('c')
      .select(periodExpr, 'period')
      .addSelect('COUNT(c.id)', 'count')
      .addSelect('COALESCE(SUM(c.pvp), 0)', 'amount')
      .where('c.entry_date BETWEEN :start AND :end', { start, end })
      .groupBy(periodExpr)
      .getRawMany();

    const countAmounts: Record<string, number> = {};
    const amountAmounts: Record<string, number> = {};
    for (const r of rows) {
      countAmounts[r.period] = Number(r.count);
      amountAmounts[r.period] = Number(r.amount);
    }
    const seriesMap = new Map<
      string,
      { label: string; amounts: Record<string, number> }
    >();
    seriesMap.set('count', { label: 'Quantitat', amounts: countAmounts });
    seriesMap.set('amount', { label: 'PVP (€)', amounts: amountAmounts });
    return this.buildTimeSeriesResponse(periods, seriesMap);
  }
}
