import { BadRequestException, ConflictException } from '@nestjs/common';

export const DEFAULT_MIGRATION_SIZE_LABEL = 'Única';

export const HAS_SIZES_STOCK_MESSAGE =
  'Article amb talles: el stock es calcula automàticament';

export const HAS_SIZES_FLOW_MESSAGE =
  'Article amb talles: usar flux de talles (TAL-03)';

export function sumWarehouseQuantities(
  sizes: { warehouseQuantity?: number }[],
): number {
  return sizes.reduce((sum, s) => sum + Number(s.warehouseQuantity ?? 0), 0);
}

export function normalizeSizeLabel(label: string): string {
  const trimmed = (label ?? '').trim();
  if (!trimmed) {
    throw new BadRequestException('El nom de la talla no pot estar buit');
  }
  return trimmed;
}

export function assertCanDeleteSize(totalQtyAcrossLocations: number): void {
  if (totalQtyAcrossLocations > 0) {
    throw new ConflictException(
      'No es pot eliminar la talla mentre tingui stock',
    );
  }
}

export function assertStockWritable(
  hasSizes: boolean,
  stockInDto: unknown,
): void {
  if (hasSizes && stockInDto !== undefined && stockInDto !== null) {
    throw new BadRequestException(HAS_SIZES_STOCK_MESSAGE);
  }
}

export function assertHasSizesBlocked(hasSizes: boolean): void {
  if (hasSizes) {
    throw new BadRequestException(HAS_SIZES_FLOW_MESSAGE);
  }
}

export function validateUniqueSizeLabels(labels: string[]): void {
  const seen = new Set<string>();
  for (const label of labels) {
    const key = label.toLowerCase();
    if (seen.has(key)) {
      throw new BadRequestException('Les talles han de tenir noms únics');
    }
    seen.add(key);
  }
}
