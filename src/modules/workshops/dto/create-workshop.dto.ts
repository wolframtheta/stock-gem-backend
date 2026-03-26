import { IsNotEmpty, IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateWorkshopDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  phone?: string;
}

