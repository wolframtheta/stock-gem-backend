import { PartialType } from '@nestjs/mapped-types';
import { CreateComposturaTypeDto } from './create-compostura-type.dto';

export class UpdateComposturaTypeDto extends PartialType(CreateComposturaTypeDto) {}
