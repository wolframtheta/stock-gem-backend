import {
  assertCanDeleteSize,
  assertHasSizesBlocked,
  assertStockWritable,
  normalizeSizeLabel,
  sumWarehouseQuantities,
  validateUniqueSizeLabels,
} from './articles-sizes.util';

describe('articles-sizes.util', () => {
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

  describe('normalizeSizeLabel', () => {
    it('trims and returns label', () => {
      expect(normalizeSizeLabel('  M  ')).toBe('M');
    });

    it('throws on empty label', () => {
      expect(() => normalizeSizeLabel('   ')).toThrow();
    });
  });

  describe('assertCanDeleteSize', () => {
    it('allows delete when total is zero', () => {
      expect(() => assertCanDeleteSize(0)).not.toThrow();
    });

    it('throws when total is positive', () => {
      expect(() => assertCanDeleteSize(1)).toThrow();
    });
  });

  describe('assertStockWritable', () => {
    it('allows stock when hasSizes is false', () => {
      expect(() => assertStockWritable(false, 10)).not.toThrow();
    });

    it('rejects stock when hasSizes is true', () => {
      expect(() => assertStockWritable(true, 10)).toThrow();
    });

    it('allows undefined stock when hasSizes is true', () => {
      expect(() => assertStockWritable(true, undefined)).not.toThrow();
    });
  });

  describe('assertHasSizesBlocked', () => {
    it('throws when article has sizes', () => {
      expect(() => assertHasSizesBlocked(true)).toThrow();
    });
  });

  describe('validateUniqueSizeLabels', () => {
    it('accepts unique labels', () => {
      expect(() => validateUniqueSizeLabels(['S', 'M'])).not.toThrow();
    });

    it('rejects duplicate labels case-insensitively', () => {
      expect(() => validateUniqueSizeLabels(['S', 's'])).toThrow();
    });
  });
});
