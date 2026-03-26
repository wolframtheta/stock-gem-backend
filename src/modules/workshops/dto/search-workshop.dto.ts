import { IsOptional, IsString } from 'class-validator';

export class SearchWorkshopDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  phone?: string;
}

