import { IsOptional, IsString, IsDateString, IsUUID } from 'class-validator';

export class SearchComposturaDto {
  @IsString()
  @IsOptional()
  code?: string;

  @IsUUID()
  @IsOptional()
  clientId?: string;

  @IsUUID()
  @IsOptional()
  workshopId?: string;

  @IsString()
  @IsOptional()
  clientName?: string;

  @IsString()
  @IsOptional()
  workshopName?: string;

  @IsDateString()
  @IsOptional()
  entryDateFrom?: string;

  @IsDateString()
  @IsOptional()
  entryDateTo?: string;

  @IsDateString()
  @IsOptional()
  deliveryToClientDateFrom?: string;

  @IsDateString()
  @IsOptional()
  deliveryToClientDateTo?: string;
}

