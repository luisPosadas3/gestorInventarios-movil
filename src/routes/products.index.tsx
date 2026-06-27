import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/products/")({
  head: () => ({ meta: [{ title: "Productos — Gestor de Inventario" }] }),
  component: Products,
});

function stockColor(stock: number, min: number) {
  if (stock === 0 || stock < min * 0.4) return { text: "text-error", border: "border-l-error" };
  if (stock < min) return { text: "text-tertiary-fixed-dim", border: "border-l-tertiary-fixed-dim" };
  return { text: "text-primary", border: "border-l-secondary" };
}

function Products() {
  const { products } = useStore();
  const [q, setQ] = useState("");
  const filtered = products.filter(
    (p) => p.name.toLowerCase().includes(q.toLowerCase()) || p.sku.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <AppShell>
      <div className="sticky top-[44px] bg-background pt-3 pb-3 z-30 -mx-container-padding px-container-padding">
        <div className="relative">
          <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar productos..."
            className="w-full h-12 bg-surface-container-lowest border border-outline rounded-lg pl-12 pr-12 text-body-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
          />
          <button className="absolute right-3 top-1/2 -translate-y-1/2 text-primary p-1 hover:bg-surface-container-low rounded-full">
            <Icon name="barcode_scanner" />
          </button>
        </div>
      </div>

      <div className="flex justify-between items-center mb-stack-gap">
        <h2 className="text-headline-sm font-semibold text-on-surface">Catálogo de Productos</h2>
        <span className="text-label-md text-on-surface-variant bg-surface-container px-2 py-0.5 rounded">
          {filtered.length} productos
        </span>
      </div>

      <div className="flex flex-col gap-stack-gap">
        {filtered.map((p) => {
          const c = stockColor(p.stock, p.minStock);
          return (
            <div
              key={p.id}
              className={`bg-surface-container-lowest border border-outline-variant border-l-4 ${c.border} rounded-xl p-container-padding flex items-center gap-3 hover:shadow-md transition-shadow`}
            >
              <div className="w-14 h-14 rounded-lg bg-surface-container grid place-items-center shrink-0 overflow-hidden">
                {p.image ? (
                  <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <Icon name={p.icon} className="text-primary" style={{ fontSize: 28 }} />
                )}
              </div>
              <div className="flex-grow min-w-0">
                <h3 className="text-label-lg font-semibold truncate text-on-surface">{p.name}</h3>
                <p className="text-label-md text-on-surface-variant font-mono">SKU: {p.sku}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                  <p className={`text-body-md font-bold ${c.text}`}>Stock: {p.stock} u</p>
                  <p className="text-label-md text-on-surface-variant">
                    Venta: <span className="text-primary font-semibold">${p.salePrice.toFixed(2)}</span>
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-1 items-center shrink-0">
                <button className="text-on-surface-variant hover:text-primary transition-colors p-1">
                  <Icon name="edit" style={{ fontSize: 20 }} />
                </button>
                <button className="text-on-surface-variant hover:text-error transition-colors p-1">
                  <Icon name="delete" style={{ fontSize: 20 }} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <Link
        to="/products/new"
        className="fixed bottom-24 right-4 w-14 h-14 bg-primary text-on-primary rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform z-30"
        aria-label="Agregar producto"
      >
        <Icon name="add" style={{ fontSize: 28 }} />
      </Link>
    </AppShell>
  );
}
