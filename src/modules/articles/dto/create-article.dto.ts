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
  @IsNotEmpty()
  description: string;

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

  @IsString()
  @IsOptional()
  observations?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  photo?: string;

  @IsUUID()
  @IsOptional()
  collectionId?: string;

  @IsUUID()
  @IsOptional()
  articleTypeId?: string;
}
