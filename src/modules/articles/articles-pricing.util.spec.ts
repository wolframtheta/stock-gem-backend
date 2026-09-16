import { shouldRecordPriceHistory } from './articles-pricing.util';

describe('shouldRecordPriceHistory', () => {
  it('records when PVP changes to a positive value', () => {
    expect(shouldRecordPriceHistory(10, 15)).toBe(true);
  });

  it('does not record when PVP is unchanged', () => {
    expect(shouldRecordPriceHistory(10, 10)).toBe(false);
  });

  it('does not record when new PVP is zero', () => {
    expect(shouldRecordPriceHistory(10, 0)).toBe(false);
  });

  it('treats null old PVP as zero', () => {
    expect(shouldRecordPriceHistory(null, 5)).toBe(true);
  });
});
