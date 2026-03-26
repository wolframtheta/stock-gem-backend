import { IsInt, Min } from 'class-validator';

export class UpdateStockDto {
  @IsInt()
  @Min(1)
  quantity: number;
}
