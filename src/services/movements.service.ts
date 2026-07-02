import type { Movement } from "@/lib/mock-data";

if (import.meta.env.DEV && !import.meta.env.VITE_API_URL) {
  console.warn("VITE_API_URL no está configurado: las peticiones a la API fallarán.");
}

const API_URL = `${import.meta.env.VITE_API_URL}/movements`;

export type ApiMovement = {
  id: string;
  productId: string;
  productName: string;
  type: "entrada" | "salida";
  subtype: "manual" | "venta";
  quantity: number;
  price: number;
  note: string;
  timestamp: string; // ISO string desde Prisma
};

async function handleResponse<T>(response: Response): Promise<T> {
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.error || `Error ${response.status}`);
  }
  return json as T;
}

export async function getMovements(
  type?: "entrada" | "salida",
  pagination?: { page?: number; limit?: number },
): Promise<ApiMovement[]> {
  const params = new URLSearchParams();
  if (type) params.set("type", type);
  if (pagination?.limit) params.set("limit", String(pagination.limit));
  if (pagination?.page) params.set("page", String(pagination.page));
  const qs = params.toString();
  const res = await fetch(qs ? `${API_URL}?${qs}` : API_URL);
  return handleResponse<ApiMovement[]>(res);
}

export async function createMovement(
  data: Omit<ApiMovement, "id" | "timestamp">,
): Promise<ApiMovement> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse<ApiMovement>(res);
}

export function mapApiMovementToMovement(api: ApiMovement): Movement {
  return {
    id: api.id,
    productId: api.productId,
    productName: api.productName,
    type: api.type,
    quantity: api.quantity,
    // En salida: muestra si fue venta o salida manual
    note: api.type === "salida" ? (api.subtype === "venta" ? "Venta" : "Salida manual") : api.note,
    timestamp:
      typeof api.timestamp === "string" ? api.timestamp : new Date(api.timestamp).toISOString(),
  };
}
