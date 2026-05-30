/**
 * Helpers de tarifas de precio (lista / mayoreo / promoción) para cotizaciones.
 */
import type { Product } from "@/types/product";
import type { Supplier } from "@/types/supplier";

export type QuotePriceTier = "LIST" | "WHOLESALE" | "PROMOTION";

export const QUOTE_PRICE_TIER_LABELS: Record<QuotePriceTier, string> = {
  LIST: "Precio normal (lista)",
  WHOLESALE: "Mayoreo",
  PROMOTION: "Promoción",
};

export const QUOTE_PRICE_TIER_SHORT: Record<QuotePriceTier, string> = {
  LIST: "Lista",
  WHOLESALE: "Mayoreo",
  PROMOTION: "Promo",
};

export const QUOTE_PRICE_TIER_ORDER: QuotePriceTier[] = ["LIST", "WHOLESALE", "PROMOTION"];

export function normalizeQuotePriceTier(raw: unknown): QuotePriceTier {
  const t = String(raw ?? "").toUpperCase();
  if (t === "WHOLESALE" || t === "PROMOTION") return t;
  return "LIST";
}

export function isPromotionActive(product: Product, now = new Date()): boolean {
  const promo = product.pricePromotion;
  if (promo == null || Number(promo) <= 0) return false;
  if (!product.promotionValidUntil) return true;
  return new Date(product.promotionValidUntil) >= now;
}

export function productSupportsPriceTier(
  product: Product,
  tier: QuotePriceTier,
  now = new Date()
): { ok: boolean; message?: string } {
  if (tier === "LIST") return { ok: true };
  if (tier === "WHOLESALE") {
    const w = product.priceWholesale;
    if (w != null && Number(w) > 0) return { ok: true };
    return { ok: false, message: "Este producto no tiene precio de mayoreo." };
  }
  if (tier === "PROMOTION") {
    if (isPromotionActive(product, now)) return { ok: true };
    const promo = product.pricePromotion;
    if (promo == null || Number(promo) <= 0) {
      return { ok: false, message: "Este producto no tiene precio promocional." };
    }
    return { ok: false, message: "La promoción de este producto no está vigente." };
  }
  return { ok: false, message: "Tarifa no válida." };
}

export function unitPriceForTier(product: Product, tier: QuotePriceTier, now = new Date()): number | null {
  const check = productSupportsPriceTier(product, tier, now);
  if (!check.ok) return null;
  if (tier === "WHOLESALE") return Number(product.priceWholesale);
  if (tier === "PROMOTION") return Number(product.pricePromotion);
  return Number(product.price ?? 0);
}

export function resolveUnitPriceFromProduct(
  product: Product,
  tier: QuotePriceTier,
  now = new Date()
): number {
  const list = Number(product.price ?? 0);
  if (tier === "WHOLESALE") {
    const w = product.priceWholesale;
    if (w != null && Number(w) > 0) return Number(w);
    return list;
  }
  if (tier === "PROMOTION") {
    if (isPromotionActive(product, now)) return Number(product.pricePromotion ?? list);
    return list;
  }
  return list;
}

type SalesChannel = "POS" | "WHOLESALE" | "ONLINE";

export function resolvePriceTierForCustomer(
  customer: Supplier | null | undefined,
  salesChannel: SalesChannel = "WHOLESALE"
): QuotePriceTier {
  if (customer?.customerPriceRules?.length) {
    const applicable = customer.customerPriceRules
      .filter((r) => r.active !== false && (!r.channel || r.channel === salesChannel))
      .sort((a, b) => Number(b.priority ?? 0) - Number(a.priority ?? 0));
    if (applicable.length > 0) {
      return normalizeQuotePriceTier(applicable[0].price_tier);
    }
  }
  const dpt = customer?.defaultPriceTier;
  if (dpt) return normalizeQuotePriceTier(dpt);
  return salesChannel === "WHOLESALE" ? "WHOLESALE" : "LIST";
}

export function catalogPriceForProduct(
  product: Product,
  tier: QuotePriceTier,
  priceMap: Record<string, number>
): number {
  const fromPreview = priceMap[product.id];
  if (fromPreview != null) return fromPreview;
  return resolveUnitPriceFromProduct(product, tier);
}
