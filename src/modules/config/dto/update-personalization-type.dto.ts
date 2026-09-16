import { PartialType } from '@nestjs/mapped-types';
import { CreatePersonalizationTypeDto } from './create-personalization-type.dto';

export class UpdatePersonalizationTypeDto extends PartialType(
  CreatePersonalizationTypeDto,
) {}
