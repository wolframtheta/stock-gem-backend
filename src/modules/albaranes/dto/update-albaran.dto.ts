import {
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { CreateAlbaranItemDto } from './create-albaran-item.dto';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';

export class UpdateAlbaranDto {
  @IsString()
  @IsOptional()
  @MaxLength(50)
  albaranNumber?: string;

  @IsUUID()
  @IsOptional()
  supplierId?: string;

  @IsDateString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  condition?: string;

  @ValidateNested({ each: true })
  @Type(() => CreateAlbaranItemDto)
  @IsOptional()
  items?: CreateAlbaranItemDto[];
}

