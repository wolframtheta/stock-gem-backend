import { IsInt, IsDateString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AddStockDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity: number;

  @IsDateString()
  date: string;
}
