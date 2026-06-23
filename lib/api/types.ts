// Convenience aliases over the generated OpenAPI component schemas
// (lib/api/schema.ts). The backend now declares response bodies, so these come
// straight from the spec - no hand-maintained shapes.
import type { components } from "./schema";

export type ApiCard = components["schemas"]["CardApiResponseDto"];
export type ApiCardPrices = components["schemas"]["CardPriceDto"];
export type ApiSet = components["schemas"]["SetApiResponseDto"];
export type ApiSetPrices = components["schemas"]["SetPriceApiDto"];
export type ApiPaginationMeta = components["schemas"]["PaginationMeta"];
export type ApiInventoryItem = components["schemas"]["InventoryItemApiDto"];
export type ApiInventoryWrite = components["schemas"]["InventoryRequestApiDto"];
export type ApiInventoryQuantity = components["schemas"]["InventoryQuantityApiDto"];
