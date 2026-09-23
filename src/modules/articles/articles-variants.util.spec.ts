import {
  assertCanDeleteVariant,
  assertHasVariantsBlocked,
  assertStockWritable,
  normalizeVariantLabel,
  sumWarehouseQuantities,
  validateAddStockVariants,
  validateUniqueVariantLabels,
} from './articles-variants.util';

describe('articles-variants.util', () => {
  describe('sumWarehouseQuantities', () => {
    it('sums warehouse quantities', () => {
      expect(
        sumWarehouseQuantities([
          { warehouseQuantity: 2 },
          { warehouseQuantity: 3 },
        ]),
      ).toBe(5);
    });

    it('treats missing quantities as zero', () => {
      expect(sumWarehouseQuantities([{}, { warehouseQuantity: 1 }])).toBe(1);
    });
  });

  describe('normalizeVariantLabel', () => {
    it('trims and returns label', () => {
      expect(normalizeVariantLabel('  M  ')).toBe('M');
    });

    it('throws on empty label', () => {
      expect(() => normalizeVariantLabel('   ')).toThrow();
    });
  });

  describe('assertCanDeleteVariant', () => {
    it('allows delete when total is zero', () => {
      expect(() => assertCanDeleteVariant(0)).not.toThrow();
    });

    it('throws when total is positive', () => {
      expect(() => assertCanDeleteVariant(1)).toThrow();
    });
  });

  describe('assertStockWritable', () => {
    it('allows stock when hasVariants is false', () => {
      expect(() => assertStockWritable(false, 10)).not.toThrow();
    });

    it('rejects stock when hasVariants is true', () => {
      expect(() => assertStockWritable(true, 10)).toThrow();
    });

    it('allows undefined stock when hasVariants is true', () => {
      expect(() => assertStockWritable(true, undefined)).not.toThrow();
    });
  });

  describe('assertHasVariantsBlocked', () => {
    it('throws when article has variants', () => {
      expect(() => assertHasVariantsBlocked(true)).toThrow();
    });
  });

  describe('validateAddStockVariants', () => {
    const variantIds = new Set(['a', 'b']);

    it('returns total when valid', () => {
      expect(
        validateAddStockVariants(
          [
            { articleVariantId: 'a', quantity: 2 },
            { articleVariantId: 'b', quantity: 3 },
          ],
          variantIds,
        ),
      ).toBe(5);
    });

    it('rejects unknown variant id', () => {
      expect(() =>
        validateAddStockVariants(
          [{ articleVariantId: 'x', quantity: 1 }],
          variantIds,
        ),
      ).toThrow();
    });

    it('rejects when total is zero', () => {
      expect(() =>
        validateAddStockVariants(
          [
            { articleVariantId: 'a', quantity: 0 },
            { articleVariantId: 'b', quantity: 0 },
          ],
          variantIds,
        ),
      ).toThrow();
    });
  });

  describe('validateUniqueVariantLabels', () => {
    it('accepts unique labels', () => {
      expect(() => validateUniqueVariantLabels(['S', 'M'])).not.toThrow();
    });

    it('rejects duplicate labels case-insensitively', () => {
      expect(() => validateUniqueVariantLabels(['S', 's'])).toThrow();
    });
  });
});
