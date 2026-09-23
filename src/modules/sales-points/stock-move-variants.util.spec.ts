import {
  assertMoveItemShape,
  normalizeMoveVariantLines,
  sumMoveVariantQuantities,
} from './stock-move-variants.util';

describe('stock-move-variants.util', () => {
  const allowed = new Set(['v1', 'v2']);

  describe('assertMoveItemShape', () => {
    it('requires variants for hasVariants articles', () => {
      expect(() => assertMoveItemShape(true, 1, undefined)).toThrow(
        /variants\[\]/,
      );
    });

    it('rejects quantity with hasVariants', () => {
      expect(() => assertMoveItemShape(true, 2, [{ articleVariantId: 'v1', quantity: 1 }])).toThrow(
        /no quantity/,
      );
    });

    it('accepts quantity-only without variants', () => {
      expect(() => assertMoveItemShape(false, 3, undefined)).not.toThrow();
    });
  });

  describe('normalizeMoveVariantLines', () => {
    it('filters zero rows and sums', () => {
      const lines = normalizeMoveVariantLines(
        [
          { articleVariantId: 'v1', quantity: 2 },
          { articleVariantId: 'v2', quantity: 0 },
        ],
        allowed,
      );
      expect(lines).toHaveLength(1);
      expect(sumMoveVariantQuantities(lines)).toBe(2);
    });

    it('rejects unknown variant id', () => {
      expect(() =>
        normalizeMoveVariantLines(
          [{ articleVariantId: 'x', quantity: 1 }],
          allowed,
        ),
      ).toThrow(/no pertany/);
    });
  });
});
