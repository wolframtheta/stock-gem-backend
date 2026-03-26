import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateArticleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  ownReference: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  supplierReference?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  family?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  subfamily?: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  shortDescription?: string;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  cost: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  pvp: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @IsOptional()
  stock?: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @IsOptional()
  weight?: number;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  margin?: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @IsOptional()
  taxBase?: number;

  @IsString()
  @IsOptional()
  observations?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  photo?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  barcode?: string;

  @IsUUID()
  @IsOptional()
  supplierId?: string;

  @IsUUID()
  @IsOptional()
  collectionId?: string;

  @IsUUID()
  @IsOptional()
  articleTypeId?: string;
}

