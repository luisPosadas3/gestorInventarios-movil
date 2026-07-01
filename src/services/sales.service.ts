import type { Sale } from "@/lib/mock-data";

if (import.meta.env.DEV && !import.meta.env.VITE_API_URL) {
  console.warn("VITE_API_URL no está configurado: las peticiones a la API fallarán.");
}

const API_URL = `${import.meta.env.VITE_API_URL}/sales`;

export type ApiSaleItem = {
  id: string;
  saleId: string;
  productId: string;
  name: string;
  qty: number;
  price: number;
};

export type ApiSale = {
  id: string;
  total: number;
  received: number;
  timestamp: string;
  items: ApiSaleItem[];
};

async function handleResponse<T>(response: Response): Promise<T> {
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.error || `Error ${response.status}`);
  }
  return json as T;
}

export async function getSales(): Promise<ApiSale[]> {
  const res = await fetch(API_URL);
  return handleResponse<ApiSale[]>(res);
}

export async function createSale(data: {
  total: number;
  received: number;
  items: { productId: string; name: string; qty: number; price: number }[];
}): Promise<ApiSale> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  return handleResponse<ApiSale>(res);
}

export function mapApiSaleToSale(api: ApiSale): Sale {
  return {
    id: api.id,
    total: api.total,
    received: api.received,
    timestamp: typeof api.timestamp === "string" ? api.timestamp : new Date(api.timestamp).toISOString(),
    items: api.items.map((item) => ({
      productId: item.productId,
      name: item.name,
      qty: item.qty,
      price: item.price,
    })),
  };
}
