import { IsArray, IsInt, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class FairStockItemDto {
  @IsUUID()
  articleId: string;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  quantity: number;
}

export class UpdateFairStockDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FairStockItemDto)
  items: FairStockItemDto[];
}
