import {
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  IsNumber,
  Min,
  MaxLength,
} from 'class-validator';

export class UpdatePersonalizationDto {
  @IsUUID()
  @IsOptional()
  clientId?: string | null;

  @IsUUID()
  @IsOptional()
  personalizationTypeId?: string | null;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  workToDo?: string;

  @IsDateString()
  @IsOptional()
  entryDate?: string;

  @IsDateString()
  @IsOptional()
  deliveryToWorkshopDate?: string | null;

  @IsDateString()
  @IsOptional()
  exitFromWorkshopDate?: string | null;

  @IsDateString()
  @IsOptional()
  deliveryToClientDate?: string | null;

  @IsNumber()
  @Min(0)
  @IsOptional()
  cost?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  pvp?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  paymentOnAccount?: number;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  photo?: string;
}
