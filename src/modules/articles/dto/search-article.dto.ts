import { IsOptional, IsString } from 'class-validator';

export class SearchArticleDto {
  @IsString()
  @IsOptional()
  ownReference?: string;

  @IsString()
  @IsOptional()
  supplierReference?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  collectionId?: string;

  @IsString()
  @IsOptional()
  articleTypeId?: string;

  /** Cerca lliure: nom, referència, descripció, col·lecció, tipus */
  @IsString()
  @IsOptional()
  q?: string;
}

