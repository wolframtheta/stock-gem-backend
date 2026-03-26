import { IsUUID, IsInt, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSaleItemDto {
  @IsUUID()
  articleId: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  unitPrice: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  discount: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  totalPrice: number;
}

