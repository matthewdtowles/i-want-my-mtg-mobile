// Response shapes the UI consumes. The backend wraps every response in this
// envelope and returns mapped DTOs, but the OpenAPI spec doesn't yet declare
// response bodies (only request DTOs), so the generated client can't type them.
// These mirror the live API; replace them with generated types once the backend
// adds OpenAPI response annotations.

export interface ApiPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: ApiPaginationMeta;
}

export interface ApiCardPrices {
  normal: number | null;
  foil: number | null;
  normalChangeWeekly: number | null;
  foilChangeWeekly: number | null;
}

export interface ApiCard {
  id: string;
  name: string;
  setCode: string;
  number: string;
  type: string | null;
  rarity: string | null;
  manaCost: string | null;
  oracleText: string | null;
  artist: string | null;
  flavorName: string | null;
  imgSrc: string | null;
  hasFoil: boolean;
  hasNonFoil: boolean;
  prices?: ApiCardPrices;
  setName: string | null;
  keyruneCode: string | null;
  purchaseUrlTcgplayer: string | null;
}

export interface ApiSetPrices {
  basePrice: number | null;
  totalPrice: number | null;
  basePriceAll: number | null;
  totalPriceAll: number | null;
  basePriceChangeWeekly: number | null;
  totalPriceChangeWeekly: number | null;
}

export interface ApiSet {
  code: string;
  name: string;
  type: string | null;
  releaseDate: string | null;
  baseSize: number | null;
  totalSize: number | null;
  keyruneCode: string | null;
  block: string | null;
  parentCode: string | null;
  isMain: boolean;
  tags: string[];
  prices?: ApiSetPrices;
}
