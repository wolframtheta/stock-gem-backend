import { IsUUID, IsInt, IsNumber, IsString, Min, IsOptional } from 'class-validator';

export class CreateAlbaranItemDto {
  @IsUUID()
  articleId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsString()
  @IsOptional()
  ivaType?: string;

  @IsNumber()
  @Min(0)
  costPrice: number;

  @IsNumber()
  @Min(0)
  margin: number;

  @IsNumber()
  @Min(0)
  pvp: number;
}

