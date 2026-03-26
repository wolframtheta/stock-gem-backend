import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class MoveStockItemDto {
  @IsUUID()
  articleId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class MoveStockDto {
  @IsOptional()
  @IsIn(['point', 'fair'])
  fromType?: 'point' | 'fair';

  @IsString()
  fromId: string;

  @IsOptional()
  @IsIn(['point', 'fair'])
  toType?: 'point' | 'fair';

  @IsString()
  toId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MoveStockItemDto)
  items: MoveStockItemDto[];
}
