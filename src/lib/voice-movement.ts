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
  const secondScore = scored[1]?.score ?? 0;
  const best = scored.filter((item) => item.score === bestScore).map((item) => item.product);

  if (best.length === 1 && bestScore >= 45 && (bestScore >= 60 || bestScore - secondScore >= 10)) {
    return { status: "matched", product: best[0] };
  }

  return {
    status: best.length > 1 || bestScore >= 45 ? "ambiguous" : "not-found",
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
  const tokenSimilarity = scoreTokenOverlap(nameTokens, [...queryTokens]);
  const compactSimilarity = scoreTextSimilarity(compactName, compactQuery);
  const skuSimilarity = scoreTextSimilarity(compactSku, compactQuery);
  const numericBonus = scoreNumericAlignment(nameTokens, [...queryTokens]);

  const score = Math.max(tokenSimilarity * 100, compactSimilarity * 100, skuSimilarity * 100);

  return Math.round(Math.min(100, score + numericBonus));
}

function getMeaningfulTokens(value: string): string[] {
  return value.split(" ").filter((token) => token && !ignoredProductTokens.has(token));
}

function compactText(value: string): string {
  return value.replace(/\s+/g, "");
}

function scoreTokenOverlap(leftTokens: string[], rightTokens: string[]): number {
  if (leftTokens.length === 0 || rightTokens.length === 0) return 0;

  const leftBest = leftTokens.map((leftToken) =>
    rightTokens.reduce(
      (best, rightToken) => Math.max(best, tokenSimilarity(leftToken, rightToken)),
      0,
    ),
  );
  const rightBest = rightTokens.map((rightToken) =>
    leftTokens.reduce(
      (best, leftToken) => Math.max(best, tokenSimilarity(leftToken, rightToken)),
      0,
    ),
  );

  const leftAverage = leftBest.reduce((sum, value) => sum + value, 0) / leftBest.length;
  const rightAverage = rightBest.reduce((sum, value) => sum + value, 0) / rightBest.length;

  return Math.max(leftAverage, rightAverage);
}

function scoreTextSimilarity(left: string, right: string): number {
  if (!left || !right) return 0;
  if (left === right) return 1;
  if (left.includes(right) || right.includes(left)) return 0.92;
  if (left.startsWith(right) || right.startsWith(left)) return 0.88;
  return diceCoefficient(left, right);
}

function scoreNumericAlignment(leftTokens: string[], rightTokens: string[]): number {
  const leftNumbers = leftTokens.filter((token) => /^\d+$/.test(token));
  const rightNumbers = rightTokens.filter((token) => /^\d+$/.test(token));
  if (leftNumbers.length === 0 || rightNumbers.length === 0) return 0;

  const matches = leftNumbers.filter((token) => rightNumbers.includes(token)).length;
  return matches > 0 ? 0.1 : 0;
}

function tokenSimilarity(left: string, right: string): number {
  if (left === right) return 1;
  if (left.length < 2 || right.length < 2) return 0;
  if (left.includes(right) || right.includes(left)) {
    const ratio = Math.min(left.length, right.length) / Math.max(left.length, right.length);
    return 0.75 + ratio * 0.2;
  }
  if (left.slice(0, 4) === right.slice(0, 4) && Math.min(left.length, right.length) >= 4) {
    return 0.78;
  }
  return diceCoefficient(left, right);
}

function diceCoefficient(left: string, right: string): number {
  const leftBigrams = buildBigrams(left);
  const rightBigrams = buildBigrams(right);
  if (leftBigrams.length === 0 || rightBigrams.length === 0) return 0;

  let intersection = 0;
  const rightPool = [...rightBigrams];
  for (const bigram of leftBigrams) {
    const index = rightPool.indexOf(bigram);
    if (index >= 0) {
      intersection += 1;
      rightPool.splice(index, 1);
    }
  }

  return (2 * intersection) / (leftBigrams.length + rightBigrams.length);
}

function buildBigrams(value: string): string[] {
  const compact = value.replace(/\s+/g, "");
  if (compact.length < 2) return [];

  const out: string[] = [];
  for (let i = 0; i < compact.length - 1; i += 1) {
    out.push(compact.slice(i, i + 2));
  }
  return out;
}

const ignoredProductTokens = new Set([
  "de",
  "del",
  "la",
  "el",
  "los",
  "las",
  "un",
  "una",
  "unos",
  "unas",
  "y",
  "o",
  "con",
  "sin",
  "cada",
  "por",
  "para",
  "tipo",
  "entrada",
  "salida",
  "llego",
  "llegaron",
  "salio",
  "salieron",
  "peso",
  "pesos",
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
