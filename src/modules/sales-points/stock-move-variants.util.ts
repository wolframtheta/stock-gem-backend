import { BadRequestException } from '@nestjs/common';

export interface MoveStockVariantLine {
  articleVariantId: string;
  quantity: number;
}

export function assertMoveItemShape(
  hasVariants: boolean,
  quantity: number | undefined,
  variants: MoveStockVariantLine[] | undefined,
): void {
  if (hasVariants) {
    if (quantity !== undefined && quantity !== null) {
      throw new BadRequestException(
        'Articles amb variants requereixen variants[] (no quantity)',
      );
    }
    if (!variants?.length) {
      throw new BadRequestException(
        'Articles amb variants requereixen variants[] amb almenys una quantitat',
      );
    }
    return;
  }
  if (variants?.length) {
    throw new BadRequestException(
      'Articles sense variants no poden enviar variants[]',
    );
  }
  if (quantity === undefined || quantity === null || quantity < 1) {
    throw new BadRequestException('quantity ha de ser >= 1');
  }
}

export function normalizeMoveVariantLines(
  variants: MoveStockVariantLine[],
  allowedVariantIds: Set<string>,
): MoveStockVariantLine[] {
  const seen = new Set<string>();
  const result: MoveStockVariantLine[] = [];

  for (const line of variants) {
    if (!allowedVariantIds.has(line.articleVariantId)) {
      throw new BadRequestException(
        'Variant no pertany a l\'article del moviment',
      );
    }
    if (seen.has(line.articleVariantId)) {
      throw new BadRequestException('variants[] duplicats per articleVariantId');
    }
    seen.add(line.articleVariantId);

    if (!Number.isInteger(line.quantity) || line.quantity < 0) {
      throw new BadRequestException(
        'La quantitat per variant ha de ser un enter >= 0',
      );
    }
    if (line.quantity > 0) {
      result.push({
        articleVariantId: line.articleVariantId,
        quantity: line.quantity,
      });
    }
  }

  if (result.length === 0) {
    throw new BadRequestException(
      'Selecciona almenys una unitat en variants[]',
    );
  }

  return result;
}

export function sumMoveVariantQuantities(lines: MoveStockVariantLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}
