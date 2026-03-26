import { IsOptional, IsString, IsDateString, IsEnum } from 'class-validator';
import { PaymentType } from '../entities/sale.entity';

export class SearchSaleDto {
  @IsOptional()
  @IsString()
  saleNumber?: string;

  @IsOptional()
  @IsString()
  ticketNumber?: string;

  @IsOptional()
  @IsString()
  clientName?: string;

  @IsOptional()
  @IsDateString()
  saleDateFrom?: string;

  @IsOptional()
  @IsDateString()
  saleDateTo?: string;

  @IsOptional()
  @IsEnum(PaymentType)
  paymentType?: PaymentType;
}

