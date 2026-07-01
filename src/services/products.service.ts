import type { Product } from "@/lib/mock-data";

if (import.meta.env.DEV && !import.meta.env.VITE_API_URL) {
  console.warn("VITE_API_URL no está configurado: las peticiones a la API fallarán.");
}

const API_URL = `${import.meta.env.VITE_API_URL}/products`;

export type ApiProduct = {
  id: string;
  sku: string;
  name: string;
  image: string | null;
  purchasePrice: number;
  salePrice: number;
  stock: number;
  minStock: number;
};

async function handleResponse<T>(response: Response): Promise<T> {
  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.error || `Error ${response.status}`);
  }

  return json as T;
}

export async function getProducts(): Promise<ApiProduct[]> {
  const res = await fetch(API_URL);
  return handleResponse<ApiProduct[]>(res);
}

export async function createProduct(data: Omit<ApiProduct, "id">): Promise<ApiProduct> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return handleResponse<ApiProduct>(res);
}

export async function updateProduct(id: string, data: Partial<ApiProduct>): Promise<ApiProduct> {
  const res = await fetch(`${API_URL}/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return handleResponse<ApiProduct>(res);
}

export async function deleteProduct(id: string): Promise<{ message: string }> {
  const res = await fetch(`${API_URL}/${id}`, {
    method: "DELETE",
  });

  return handleResponse<{ message: string }>(res);
}

export async function getProductById(id: string): Promise<ApiProduct> {
  const res = await fetch(`${API_URL}/${id}`);
  return handleResponse<ApiProduct>(res);
}

export function mapApiProductToProduct(api: ApiProduct): Product {
  return {
    id: api.id,
    sku: api.sku,
    name: api.name,
    image: api.image ?? undefined,
    purchasePrice: api.purchasePrice,
    salePrice: api.salePrice,
    stock: api.stock,
    minStock: api.minStock,

    // Mientras quitamos completamente mock-data
    icon: "inventory_2",
  };
}
