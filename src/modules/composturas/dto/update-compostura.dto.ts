import {
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  IsNumber,
  Min,
  MaxLength,
} from 'class-validator';

export class UpdateComposturaDto {
  @IsString()
  @IsOptional()
  @MaxLength(50)
  code?: string;

  @IsUUID()
  @IsOptional()
  clientId?: string;

  @IsUUID()
  @IsOptional()
  workshopId?: string;

  @IsUUID()
  @IsOptional()
  composturaTypeId?: string | null;

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
  deliveryToWorkshopDate?: string;

  @IsDateString()
  @IsOptional()
  exitFromWorkshopDate?: string;

  @IsDateString()
  @IsOptional()
  deliveryToClientDate?: string;

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

