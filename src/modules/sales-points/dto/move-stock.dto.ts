import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class MoveStockVariantLineDto {
  @IsUUID()
  articleVariantId: string;

  @IsInt()
  @Min(0)
  quantity: number;
}

export class MoveStockItemDto {
  @IsUUID()
  articleId: string;

  @ValidateIf((o) => !o.variants?.length)
  @IsInt()
  @Min(1)
  quantity?: number;

  @ValidateIf((o) => o.variants?.length > 0)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MoveStockVariantLineDto)
  variants?: MoveStockVariantLineDto[];
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
