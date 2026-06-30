import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/alerts/")({
  head: () => ({ meta: [{ title: "Alertas de Inventario" }] }),
  component: Alerts,
});

const STORAGE_KEY = "alerts-requested";

function loadRequested(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveRequested(set: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch {}
}

type Filter = "todos" | "criticos";

function Alerts() {
  const { products, movements } = useStore();
  const [requested, setRequested] = useState<Set<string>>(loadRequested);
  const [filter, setFilter] = useState<Filter>("todos");

  // Ordenados: agotados primero, luego por ratio stock/minStock ascendente
  const lowStock = products
    .filter((p) => p.stock <= p.minStock)
    .sort((a, b) => {
      const aRatio = a.minStock > 0 ? a.stock / a.minStock : 0;
      const bRatio = b.minStock > 0 ? b.stock / b.minStock : 0;
      return aRatio - bRatio;
    });

  const critical = lowStock.filter((p) => p.stock < p.minStock * 0.4 || p.stock === 0);
  const displayed = filter === "criticos" ? critical : lowStock;

  const handleRequest = (id: string) => {
    setRequested((prev) => {
      const next = new Set(prev).add(id);
      saveRequested(next);
      return next;
    });
  };

  const lastEntryLabel = (productId: string): string => {
    const entries = movements
      .filter((m) => m.productId === productId && m.type === "entrada")
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (entries.length === 0) return "Sin entradas registradas";

    const date = new Date(entries[0].timestamp);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Última entrada: Hoy";
    if (date.toDateString() === yesterday.toDateString()) return "Última entrada: Ayer";
    return `Última entrada: ${date.toLocaleDateString("es-ES", { day: "numeric", month: "short" })}`;
  };

  return (
    <AppShell title="Alertas">
      <section className="mt-4 mb-section-margin">
        <h2 className="text-headline-lg font-bold text-on-surface">Panel de Alertas</h2>
        <p className="text-body-md text-on-surface-variant">
          Productos que requieren reposición inmediata para evitar quiebre de stock.
        </p>
      </section>

      {/* Contadores */}
      <div className="grid grid-cols-2 gap-2 mb-section-margin">
        <div className="bg-error-container p-container-padding rounded-xl flex flex-col gap-1">
          <span className="text-label-md text-on-error-container uppercase">Críticos</span>
          <div className="flex items-center gap-2">
            <span className="text-headline-md text-on-error-container font-semibold">
              {critical.length}
            </span>
            <Icon name="warning" className="text-error" />
          </div>
        </div>
        <div className="bg-surface-container-high p-container-padding rounded-xl flex flex-col gap-1">
          <span className="text-label-md text-on-surface-variant uppercase">Solicitados</span>
          <div className="flex items-center gap-2">
            <span className="text-headline-md text-on-surface font-semibold">
              {String(requested.size).padStart(2, "0")}
            </span>
            <Icon name="local_shipping" className="text-secondary" />
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex bg-surface-container p-1 rounded-lg mb-section-margin">
        <button
          onClick={() => setFilter("todos")}
          className={`flex-1 py-2 rounded-md text-label-lg font-semibold transition-all ${
            filter === "todos"
              ? "bg-surface text-on-surface shadow-sm"
              : "text-on-surface-variant"
          }`}
        >
          Todos ({lowStock.length})
        </button>
        <button
          onClick={() => setFilter("criticos")}
          className={`flex-1 py-2 rounded-md text-label-lg font-semibold transition-all ${
            filter === "criticos"
              ? "bg-error text-on-error shadow-sm"
              : "text-on-surface-variant"
          }`}
        >
          Críticos ({critical.length})
        </button>
      </div>

      {/* Lista */}
      <div className="flex flex-col gap-3 pb-8">
        {displayed.map((p) => {
          const isCritical = p.stock < p.minStock * 0.4 || p.stock === 0;
          const isReq = requested.has(p.id);
          const pct = p.minStock > 0 ? Math.min(100, Math.round((p.stock / p.minStock) * 100)) : 0;
          return (
            <div
              key={p.id}
              className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden active:scale-[0.99] transition-all"
            >
              <div className="flex">
                <div className={`w-2 ${isCritical ? "bg-error" : "bg-tertiary-fixed-dim"}`} />
                <div className="p-container-padding flex-1 flex flex-col gap-2">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <h3 className="text-headline-sm font-semibold text-on-surface truncate">
                        {p.name}
                      </h3>
                      <span className="font-mono text-data-mono text-on-surface-variant">
                        SKU: {p.sku}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 ${
                        isCritical
                          ? "bg-error-container text-on-error-container"
                          : "bg-tertiary-fixed text-on-tertiary-fixed-variant"
                      }`}
                    >
                      {isCritical ? "Stock Crítico" : "Bajo Stock"}
                    </span>
                  </div>

                  <div className="flex items-end justify-between gap-3">
                    <div className="flex flex-col">
                      <span className="text-label-md text-on-surface-variant">Actual / Mínimo</span>
                      <div className="flex items-baseline gap-1">
                        <span
                          className={`text-headline-md font-semibold ${isCritical ? "text-error" : "text-tertiary-fixed-dim"}`}
                        >
                          {p.stock}
                        </span>
                        <span className="text-body-md text-outline">/ {p.minStock} unidades</span>
                      </div>
                    </div>
                    {isReq ? (
                      <button
                        disabled
                        className="bg-secondary-container text-on-secondary-container text-label-lg font-semibold px-3 py-2 rounded-lg flex items-center gap-1"
                      >
                        <Icon name="check_circle" style={{ fontSize: 18 }} /> Solicitado
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRequest(p.id)}
                        className="bg-primary text-on-primary text-label-lg font-semibold px-3 py-2 rounded-lg flex items-center gap-1 active:scale-95"
                      >
                        <Icon name="add_shopping_cart" style={{ fontSize: 18 }} /> Marcar
                      </button>
                    )}
                  </div>

                  <div className="w-full bg-surface-container-high h-1.5 rounded-full">
                    <div
                      className={`${isCritical ? "bg-error" : "bg-tertiary-fixed-dim"} h-full rounded-full transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="flex items-center gap-1">
                    <Icon name="schedule" className="text-outline" style={{ fontSize: 13 }} />
                    <span className="text-label-sm text-outline">{lastEntryLabel(p.id)}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {displayed.length === 0 && (
          <div className="p-8 text-center text-on-surface-variant bg-surface-container-lowest border border-outline-variant rounded-xl">
            <Icon name="check_circle" className="text-secondary" style={{ fontSize: 40 }} />
            <p className="mt-2 text-body-lg">
              {filter === "criticos" ? "Sin alertas críticas" : "Sin alertas de stock"}
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
