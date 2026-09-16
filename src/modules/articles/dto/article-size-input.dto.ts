import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { normalizeSizeLabel } from '../articles-sizes.util';

export class ArticleSizeInputDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsString()
  @MaxLength(50)
  @Transform(({ value }) => normalizeSizeLabel(String(value ?? '')))
  label: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(999_999)
  @Type(() => Number)
  warehouseQuantity?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  sortOrder?: number;
}
