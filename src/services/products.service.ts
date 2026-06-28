import type { Product } from "@/lib/mock-data";

const API_BASE = "http://localhost:3001";

export type ApiProduct = {
  id: string;
  sku: string;
  name: string;
  stock: number;
  price: number;
};

export type CreateProductInput = {
  sku: string;
  name: string;
  stock: number;
  price: number;
};

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `Error ${response.status}`;
    try {
      const body = await response.json();
      if (body?.error) message = String(body.error);
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export async function getProducts(): Promise<ApiProduct[]> {
  const response = await fetch(`${API_BASE}/products`);
  return handleResponse<ApiProduct[]>(response);
}

export async function createProduct(data: CreateProductInput): Promise<ApiProduct> {
  const response = await fetch(`${API_BASE}/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse<ApiProduct>(response);
}

export function mapApiProductToProduct(api: ApiProduct): Product {
  return {
    id: api.id,
    sku: api.sku,
    name: api.name,
    icon: "inventory_2",
    purchasePrice: api.price,
    salePrice: api.price,
    stock: api.stock,
    minStock: 10,
  };
}
