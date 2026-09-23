import { IsOptional, IsString } from 'class-validator';

export class SearchArticleDto {
  @IsString()
  @IsOptional()
  ownReference?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  collectionId?: string;

  @IsString()
  @IsOptional()
  articleTypeId?: string;

  /** Cerca lliure: nom, referència, col·lecció, tipus */
  @IsString()
  @IsOptional()
  q?: string;
}
