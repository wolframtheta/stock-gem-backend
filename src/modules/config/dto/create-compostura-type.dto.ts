import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateComposturaTypeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
}
