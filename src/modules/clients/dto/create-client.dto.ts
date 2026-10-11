import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEmail,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateClientDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  surname?: string;

  @Transform(({ value }) => (value === '' ? null : value))
  @IsEmail()
  @IsOptional()
  @MaxLength(255)
  email?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  mobilePhone?: string;

  @IsString()
  @IsOptional()
  observations?: string;
}
