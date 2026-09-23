import {
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AddStockVariantItemDto } from './add-stock-variant-item.dto';

export class AddStockDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddStockVariantItemDto)
  variants?: AddStockVariantItemDto[];

  @IsDateString()
  date: string;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  cost: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  pvp: number;
}
