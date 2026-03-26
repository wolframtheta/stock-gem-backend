import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { CreateSalesPointDto } from './create-sales-point.dto';

export class UpdateSalesPointDto extends PartialType(CreateSalesPointDto) {
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  isDefaultWarehouse?: boolean;
}
