import { IsInt, IsUUID, Min } from 'class-validator';

export class AddStockVariantItemDto {
  @IsUUID()
  articleVariantId: string;

  @IsInt()
  @Min(0)
  quantity: number;
}
