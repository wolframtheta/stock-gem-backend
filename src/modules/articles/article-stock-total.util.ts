/**
 * TOT-01: stock global = suma de tot el stock a punts de venda (incl. magatzem) i fires.
 */
export function totalStockFromLocationSums(
  assignedToSalesPoints: number,
  assignedToFairs: number,
): number {
  return assignedToSalesPoints + assignedToFairs;
}
