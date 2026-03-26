import { IsNotEmpty, IsString, IsDateString, MaxLength } from 'class-validator';

export class CreateFairDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;
}
