/** Whether a PVP change should append to article_price_history. */
export function shouldRecordPriceHistory(
  oldPvp: number | null | undefined,
  newPvp: number,
): boolean {
  return Number(newPvp) !== Number(oldPvp ?? 0) && Number(newPvp) > 0;
}
