import { IsOptional, IsString, IsDateString, IsUUID } from 'class-validator';

export class SearchPersonalizationDto {
  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  @IsOptional()
  clientId?: string;

  @IsString()
  @IsOptional()
  clientName?: string;

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
