import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { CreateAlbaranItemDto } from './create-albaran-item.dto';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';

export class CreateAlbaranDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  albaranNumber: string;

  @IsUUID()
  @IsNotEmpty()
  supplierId: string;

  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  condition?: string;

  @ValidateNested({ each: true })
  @Type(() => CreateAlbaranItemDto)
  items: CreateAlbaranItemDto[];
}

