import { IsUUID, IsInt, Min, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class AssignStockItemDto {
  @IsUUID()
  articleId: string;

  @IsInt()
  @Min(0)
  quantity: number;
}

export class AssignStockDto {
  @IsUUID()
  articleId: string;

  @IsInt()
  @Min(0)
  quantity: number;
}

export class AssignStockBatchDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssignStockItemDto)
  items: AssignStockItemDto[];
}
