import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreatePersonalizationTypeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
}
