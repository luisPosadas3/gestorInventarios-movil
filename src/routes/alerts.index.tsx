import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/alerts/")({
  head: () => ({ meta: [{ title: "Alertas de Inventario" }] }),
  component: Alerts,
});

function Alerts() {
  const { products } = useStore();
  const [requested, setRequested] = useState<Set<string>>(new Set());

  const lowStock = products.filter((p) => p.stock <= p.minStock);
  const critical = lowStock.filter((p) => p.stock < p.minStock * 0.4 || p.stock === 0);

  const handleRequest = (id: string) => {
    setRequested((s) => new Set(s).add(id));
  };

  return (
    <AppShell title="Alertas">
      <section className="mt-4 mb-section-margin">
        <h2 className="text-headline-lg font-bold text-on-surface">Panel de Alertas</h2>
        <p className="text-body-md text-on-surface-variant">
          Productos que requieren reposición inmediata para evitar quiebre de stock.
        </p>
      </section>

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

      <div className="flex flex-col gap-3 pb-8">
        {lowStock.map((p) => {
          const isCritical = p.stock < p.minStock * 0.4 || p.stock === 0;
          const isReq = requested.has(p.id);
          const pct = Math.min(100, Math.round((p.stock / p.minStock) * 100));
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
                        <Icon name="add_shopping_cart" style={{ fontSize: 18 }} /> Solicitar
                      </button>
                    )}
                  </div>
                  <div className="w-full bg-surface-container-high h-1.5 rounded-full mt-1">
                    <div
                      className={`${isCritical ? "bg-error" : "bg-tertiary-fixed-dim"} h-full rounded-full transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {lowStock.length === 0 && (
          <div className="p-8 text-center text-on-surface-variant bg-surface-container-lowest border border-outline-variant rounded-xl">
            <Icon name="check_circle" className="text-secondary" style={{ fontSize: 40 }} />
            <p className="mt-2 text-body-lg">Sin alertas de stock</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
