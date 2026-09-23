import {
  assertSaleItemVariantRules,
  resolveSaleLocation,
} from './create-sale-location.util';

describe('create-sale-location.util', () => {
  const pointId = '11111111-1111-4111-8111-111111111111';
  const fairId = '22222222-2222-4222-8222-222222222222';

  describe('resolveSaleLocation', () => {
    it('resolves sales point', () => {
      expect(resolveSaleLocation(pointId, undefined)).toEqual({
        kind: 'point',
        salesPointId: pointId,
      });
    });

    it('resolves fair', () => {
      expect(resolveSaleLocation(undefined, fairId)).toEqual({
        kind: 'fair',
        fairId,
      });
    });

    it('rejects both', () => {
      expect(() => resolveSaleLocation(pointId, fairId)).toThrow(
        /només salesPointId o fairId/,
      );
    });

    it('rejects neither', () => {
      expect(() => resolveSaleLocation(undefined, undefined)).toThrow(
        /Cal enviar salesPointId o fairId/,
      );
    });
  });

  describe('assertSaleItemVariantRules', () => {
    it('requires variant id when hasVariants', () => {
      expect(() => assertSaleItemVariantRules(true, undefined)).toThrow(
        /articleVariantId/,
      );
    });

    it('passes when variant provided', () => {
      expect(() =>
        assertSaleItemVariantRules(true, '33333333-3333-4333-8333-333333333333'),
      ).not.toThrow();
    });
  });
});
