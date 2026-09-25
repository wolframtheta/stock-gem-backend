import { totalStockFromLocationSums } from './article-stock-total.util';

describe('totalStockFromLocationSums', () => {
  it('sums sales points and fairs', () => {
    expect(totalStockFromLocationSums(10, 3)).toBe(13);
  });

  it('treats missing locations as zero', () => {
    expect(totalStockFromLocationSums(0, 0)).toBe(0);
  });
});
