import { IsNotEmpty, IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateClientDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  surname: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  mobilePhone?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  landlinePhone?: string;
}

