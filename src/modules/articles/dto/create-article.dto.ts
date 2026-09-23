import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsUUID,
  IsArray,
  IsBoolean,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ArticleVariantInputDto } from './article-variant-input.dto';

export class CreateArticleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  ownReference: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  cost?: number | null;

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

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(1)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  photoPaths?: string[];

  @IsUUID()
  @IsOptional()
  collectionId?: string;

  @IsUUID()
  @IsOptional()
  articleTypeId?: string;

  @IsOptional()
  @IsBoolean()
  hasVariants?: boolean;

  @ValidateIf((o) => o.hasVariants === true)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ArticleVariantInputDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  variants?: ArticleVariantInputDto[];
}
