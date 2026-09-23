import { BadRequestException, ConflictException } from '@nestjs/common';

export const DEFAULT_MIGRATION_VARIANT_LABEL = 'Única';

export const HAS_VARIANTS_STOCK_MESSAGE =
  'Article amb variants: el stock es calcula automàticament';

export const HAS_VARIANTS_FLOW_MESSAGE =
  'Article amb variants: usar flux de variants (TAL-03)';

export function sumWarehouseQuantities(
  variants: { warehouseQuantity?: number }[],
): number {
  return variants.reduce((sum, v) => sum + Number(v.warehouseQuantity ?? 0), 0);
}

export function normalizeVariantLabel(label: string): string {
  const trimmed = (label ?? '').trim();
  if (!trimmed) {
    throw new BadRequestException('El nom de la variant no pot estar buit');
  }
  return trimmed;
}

export function assertCanDeleteVariant(totalQtyAcrossLocations: number): void {
  if (totalQtyAcrossLocations > 0) {
    throw new ConflictException(
      'No es pot eliminar la variant mentre tingui stock',
    );
  }
}

export function assertStockWritable(
  hasVariants: boolean,
  stockInDto: unknown,
): void {
  if (hasVariants && stockInDto !== undefined && stockInDto !== null) {
    throw new BadRequestException(HAS_VARIANTS_STOCK_MESSAGE);
  }
}

export function assertHasVariantsBlocked(hasVariants: boolean): void {
  if (hasVariants) {
    throw new BadRequestException(HAS_VARIANTS_FLOW_MESSAGE);
  }
}

export function validateAddStockVariants(
  variants: { articleVariantId: string; quantity: number }[],
  articleVariantIds: Set<string>,
): number {
  if (!variants.length) {
    throw new BadRequestException('Indica les quantitats per variant');
  }

  let total = 0;
  for (const item of variants) {
    if (!articleVariantIds.has(item.articleVariantId)) {
      throw new BadRequestException("Variant no pertany a l'article");
    }
    const qty = Number(item.quantity);
    if (!Number.isInteger(qty) || qty < 0) {
      throw new BadRequestException('Quantitat invàlida');
    }
    total += qty;
  }

  if (total < 1) {
    throw new BadRequestException('Indica almenys una unitat a fabricar');
  }

  return total;
}

export function validateUniqueVariantLabels(labels: string[]): void {
  const seen = new Set<string>();
  for (const label of labels) {
    const key = label.toLowerCase();
    if (seen.has(key)) {
      throw new BadRequestException('Les variants han de tenir noms únics');
    }
    seen.add(key);
  }
}
