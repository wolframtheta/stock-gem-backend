import { BadRequestException } from '@nestjs/common';

export type SaleLocationTarget =
  | { kind: 'point'; salesPointId: string }
  | { kind: 'fair'; fairId: string };

export function resolveSaleLocation(
  salesPointId?: string | null,
  fairId?: string | null,
): SaleLocationTarget {
  const point = salesPointId?.trim() || null;
  const fair = fairId?.trim() || null;

  if (point && fair) {
    throw new BadRequestException(
      'Cal enviar només salesPointId o fairId, no ambdós',
    );
  }
  if (!point && !fair) {
    throw new BadRequestException(
      'Cal enviar salesPointId o fairId per a la ubicació de venda',
    );
  }
  if (fair) {
    return { kind: 'fair', fairId: fair };
  }
  return { kind: 'point', salesPointId: point! };
}

export function assertSaleItemVariantRules(
  hasVariants: boolean,
  articleVariantId?: string | null,
): void {
  if (hasVariants && !articleVariantId?.trim()) {
    throw new BadRequestException(
      'articleVariantId és obligatori per a articles amb variants',
    );
  }
}
