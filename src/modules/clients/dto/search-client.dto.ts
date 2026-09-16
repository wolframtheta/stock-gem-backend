import { IsOptional, IsString } from 'class-validator';

export class SearchClientDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  surname?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  mobilePhone?: string;

  /** Cerca lliure: nom, cognoms, email, mòbil */
  @IsString()
  @IsOptional()
  q?: string;
}
