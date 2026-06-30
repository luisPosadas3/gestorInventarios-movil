import type { ApiProduct } from "@/services/products.service";

export type VoiceMovementDraft = {
  type: "entrada" | "salida" | null;
  product: string;
  quantity: number | null;
  purchasePrice: number | null;
};

export type VoiceProductMatch =
  | { status: "matched"; product: ApiProduct }
  | { status: "ambiguous"; products: ApiProduct[] }
  | { status: "not-found"; products: ApiProduct[] };

export const emptyVoiceMovementDraft: VoiceMovementDraft = {
  type: null,
  product: "",
  quantity: null,
  purchasePrice: null,
};

export function normalizeVoiceMovementDraft(value: unknown): VoiceMovementDraft {
  if (!value || typeof value !== "object") return emptyVoiceMovementDraft;

  const data = value as Record<string, unknown>;
  const type = data.type === "entrada" || data.type === "salida" ? data.type : null;
  const product = typeof data.product === "string" ? data.product.trim() : "";
  const quantity = toPositiveInteger(data.quantity);
  const purchasePrice = toNonNegativeNumber(data.purchasePrice);

  return {
    type,
    product,
    quantity,
    purchasePrice,
  };
}

export function findVoiceProductMatch(
  products: ApiProduct[],
  spokenProduct: string,
): VoiceProductMatch {
  const query = normalizeText(spokenProduct);
  if (!query) return { status: "not-found", products: [] };

  const scored = products
    .map((product) => ({
      product,
      score: scoreProduct(product, query),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return { status: "not-found", products: [] };

  const bestScore = scored[0].score;
  const best = scored.filter((item) => item.score === bestScore).map((item) => item.product);

  if (bestScore >= 90 && best.length === 1) return { status: "matched", product: best[0] };
  if (bestScore >= 65 && best.length === 1) return { status: "matched", product: best[0] };

  return {
    status: best.length > 1 ? "ambiguous" : "not-found",
    products: scored.slice(0, 6).map((item) => item.product),
  };
}

export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/(\d+)([a-z]+)/g, "$1 $2")
    .replace(/([a-z]+)(\d+)/g, "$1 $2")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreProduct(product: ApiProduct, query: string): number {
  const name = normalizeText(product.name);
  const sku = normalizeText(product.sku);
  const compactName = compactText(name);
  const compactQuery = compactText(query);
  const compactSku = compactText(sku);

  if (name === query || sku === query) return 100;
  if (compactName === compactQuery || compactSku === compactQuery) return 100;
  if (name.includes(query) || sku.includes(query)) return 90;
  if (compactQuery.includes(compactName) || compactQuery.includes(compactSku)) return 90;
  if (query.includes(name)) return 85;

  const queryTokens = new Set(getMeaningfulTokens(query));
  const nameTokens = getMeaningfulTokens(name);
  const hits = nameTokens.filter((token) => queryTokens.has(token)).length;

  if (hits === 0) return 0;

  const productCoverage = hits / nameTokens.length;
  const queryCoverage = hits / Math.max(queryTokens.size, 1);
  const score = Math.max(productCoverage * 90, queryCoverage * 80);

  return Math.round(score);
}

function getMeaningfulTokens(value: string): string[] {
  return value.split(" ").filter((token) => token && !ignoredProductTokens.has(token));
}

function compactText(value: string): string {
  return value.replace(/\s+/g, "");
}

const ignoredProductTokens = new Set([
  "de",
  "del",
  "la",
  "el",
  "los",
  "las",
  "natural",
  "sabor",
  "ml",
  "mililitros",
  "litro",
  "litros",
  "g",
  "gr",
  "gramo",
  "gramos",
  "kg",
  "kilo",
  "kilos",
]);

function toPositiveInteger(value: unknown): number | null {
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue)) return null;
  const integer = Math.floor(numberValue);
  return integer > 0 ? integer : null;
}

function toNonNegativeNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue) || numberValue < 0) return null;
  return numberValue;
}
