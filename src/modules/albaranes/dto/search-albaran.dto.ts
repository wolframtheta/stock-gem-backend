import { IsOptional, IsString, IsDateString, IsUUID } from 'class-validator';

export class SearchAlbaranDto {
  @IsString()
  @IsOptional()
  albaranNumber?: string;

  @IsUUID()
  @IsOptional()
  supplierId?: string;

  @IsString()
  @IsOptional()
  supplierName?: string;

  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @IsDateString()
  @IsOptional()
  dateTo?: string;

  @IsString()
  @IsOptional()
  condition?: string;
}

