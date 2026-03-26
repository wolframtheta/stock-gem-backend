import {
  IsString,
  IsOptional,
  Matches,
  IsDateString,
  IsEnum,
  IsNumber,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentType } from '../entities/sale.entity';
import { CreateSaleItemDto } from './create-sale-item.dto';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class CreateSaleDto {
  // saleNumber se genera automáticamente, no se envía desde el frontend
  // ticketNumber se genera automáticamente, no se envía desde el frontend

  @Matches(UUID_REGEX, { message: 'salesPointId must be a UUID' })
  salesPointId: string;

  @IsOptional()
  @Matches(UUID_REGEX, { message: 'clientId must be a UUID' })
  clientId?: string;

  @IsOptional()
  @Matches(UUID_REGEX, { message: 'sellerId must be a UUID' })
  sellerId?: string;

  @IsDateString()
  saleDate: string;

  @IsOptional()
  @IsString()
  saleTime?: string;

  @IsEnum(PaymentType)
  paymentType: PaymentType;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  totalDiscount: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  totalAmount: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSaleItemDto)
  items: CreateSaleItemDto[];
}

