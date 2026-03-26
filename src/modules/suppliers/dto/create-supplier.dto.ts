import {
  IsNotEmpty,
  IsString,
  IsOptional,
  MaxLength,
  IsEmail,
} from 'class-validator';

export class CreateSupplierDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  surname: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  nif: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  phones?: string; // JSON string o array serializado

  @IsEmail()
  @IsOptional()
  email?: string;
}

