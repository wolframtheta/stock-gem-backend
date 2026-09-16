import { IsInt, IsDateString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AddStockDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity: number;

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
