import { IsOptional, IsString } from 'class-validator';

export class SearchSupplierDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  phone?: string;
}

