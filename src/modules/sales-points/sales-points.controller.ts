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
import { SalesPointsService } from './sales-points.service';
import { CreateSalesPointDto } from './dto/create-sales-point.dto';
import { UpdateSalesPointDto } from './dto/update-sales-point.dto';
import {
  AssignStockDto,
  AssignStockBatchDto,
} from './dto/assign-stock.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { MoveStockDto } from './dto/move-stock.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('sales-points')
@UseGuards(JwtAuthGuard)
export class SalesPointsController {
  constructor(private readonly salesPointsService: SalesPointsService) {}

  @Post()
  create(@Body() createDto: CreateSalesPointDto) {
    return this.salesPointsService.create(createDto);
  }

  @Post('move-stock')
  moveStock(@Body() dto: MoveStockDto) {
    return this.salesPointsService.moveStock(
      dto.fromType ?? 'point',
      dto.fromId,
      dto.toType ?? 'point',
      dto.toId,
      dto.items,
    );
  }

  @Get()
  findAll() {
    return this.salesPointsService.findAll();
  }

  @Get('default-warehouse')
  getDefaultWarehouse() {
    return this.salesPointsService.getDefaultWarehouse();
  }

  @Get(':id/stock')
  getStock(@Param('id') id: string) {
    return this.salesPointsService.getStockWithLimits(id);
  }

  @Get(':id/available-for-add')
  getAvailableForAdd(@Param('id') id: string) {
    return this.salesPointsService.getAvailableForAddStock(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.salesPointsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateSalesPointDto) {
    return this.salesPointsService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.salesPointsService.remove(id);
  }

  @Patch(':id/stock')
  assignStock(@Param('id') id: string, @Body() dto: AssignStockDto) {
    return this.salesPointsService.assignStock(id, dto);
  }

  @Patch(':id/stock/:articleId')
  updateStockAtPoint(
    @Param('id') id: string,
    @Param('articleId') articleId: string,
    @Body() dto: UpdateStockDto,
  ) {
    return this.salesPointsService.updateStockAtPoint(
      id,
      articleId,
      dto.quantity,
    );
  }

  @Delete(':id/stock/:articleId')
  removeFromPoint(
    @Param('id') id: string,
    @Param('articleId') articleId: string,
  ) {
    return this.salesPointsService.removeFromPoint(id, articleId);
  }

  @Post(':id/stock/batch')
  assignStockBatch(@Param('id') id: string, @Body() dto: AssignStockBatchDto) {
    return this.salesPointsService.assignStockBatch(id, dto);
  }
}
