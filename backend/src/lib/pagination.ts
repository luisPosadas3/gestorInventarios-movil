// Pagination es opt-in: sin `limit` en la query, el endpoint devuelve el listado
// completo igual que antes (compatibilidad con el frontend actual).
export function parsePagination(
  query: Record<string, unknown>,
  maxLimit = 200,
): { take?: number; skip?: number } {
  const limitRaw = query.limit;
  const pageRaw = query.page;

  if (!limitRaw) return { take: undefined, skip: undefined };

  const limit = Math.min(Math.max(parseInt(String(limitRaw), 10) || 0, 1), maxLimit);
  const page = Math.max(parseInt(String(pageRaw ?? "1"), 10) || 1, 1);

  return { take: limit, skip: (page - 1) * limit };
}
