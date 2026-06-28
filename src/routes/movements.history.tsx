import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { getMovements, mapApiMovementToMovement } from "../services/movements.service";
import type { Movement } from "@/lib/mock-data";

export const Route = createFileRoute("/movements/history")({
  head: () => ({ meta: [{ title: "Historial de Movimientos" }] }),
  component: History,
});

function groupByDay(movements: Movement[]) {
  const map = new Map<string, Movement[]>();
  for (const m of movements) {
    const key = new Date(m.timestamp).toDateString();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(m);
  }
  return map;
}

function dayLabel(key: string) {
  const d = new Date(key);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Hoy";
  if (d.toDateString() === yest.toDateString()) return "Ayer";
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

function History() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"todos" | "entrada" | "salida">("todos");

  useEffect(() => {
    setLoading(true);
    setError(null);
    getMovements(filter === "todos" ? undefined : filter)
      .then((data) => setMovements(data.map(mapApiMovementToMovement)))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [filter]);

  const groups = groupByDay(movements);

  return (
    <AppShell title="Historial" back>
      <section className="mt-section-margin">
        <h2 className="text-headline-md font-bold text-on-surface mb-1">
          Historial de Movimientos
        </h2>
        <p className="text-body-md text-on-surface-variant">
          Seguimiento detallado de entradas y salidas de inventario.
        </p>
      </section>

      {/* Filtros — mismo diseño, ahora funcionales */}
      <section className="mb-section-margin overflow-x-auto hide-scrollbar -mx-container-padding px-container-padding flex gap-stack-gap mt-4">
        {[
          { icon: "swap_vert", color: "text-secondary", label: "Tipo", value: "todos" },
          {
            icon: "arrow_circle_down",
            color: "text-secondary",
            label: "Entradas",
            value: "entrada",
          },
          { icon: "arrow_circle_up", color: "text-error", label: "Salidas", value: "salida" },
        ].map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value as typeof filter)}
            className={`shrink-0 border rounded-xl p-3 flex flex-col gap-1 min-w-[130px] text-left transition-all ${
              filter === f.value
                ? "bg-primary text-on-primary border-primary"
                : "bg-surface-container-lowest border-outline-variant"
            }`}
          >
            <Icon name={f.icon} className={filter === f.value ? "text-on-primary" : f.color} />
            <span className="text-label-md opacity-70">{f.label}</span>
            <span className="text-label-lg font-semibold">
              {f.value === "todos" ? "Todos" : f.value === "entrada" ? "Entradas" : "Salidas"}
            </span>
          </button>
        ))}
      </section>

      {/* Estados */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-on-surface-variant">
          <Icon name="progress_activity" className="animate-spin" style={{ fontSize: 32 }} />
          <p className="text-body-md">Cargando movimientos…</p>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 rounded-xl bg-error/10 border border-error/30 text-error text-body-md flex items-center gap-2">
          <Icon name="error" />
          {error}
        </div>
      )}

      {!loading && !error && movements.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-on-surface-variant">
          <Icon name="inventory_2" style={{ fontSize: 40 }} />
          <p className="text-body-md">Sin movimientos registrados</p>
        </div>
      )}

      {/* Lista — misma UI original */}
      {!loading && !error && (
        <div className="space-y-3">
          {[...groups.entries()].map(([key, list]) => (
            <div key={key} className="space-y-3">
              <div className="flex items-center gap-2 py-1">
                <div className="h-px flex-grow bg-outline-variant" />
                <span className="text-label-md text-on-surface-variant uppercase tracking-wider">
                  {dayLabel(key)},{" "}
                  {new Date(key).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                </span>
                <div className="h-px flex-grow bg-outline-variant" />
              </div>
              {list.map((m) => (
                <div
                  key={m.id}
                  className="bg-surface-container-lowest border border-outline-variant rounded-xl relative p-container-padding flex items-center gap-3 overflow-hidden"
                >
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1.5 ${m.type === "entrada" ? "bg-secondary" : "bg-error"} rounded-l-full`}
                  />
                  <div
                    className={`w-10 h-10 rounded-lg ${m.type === "entrada" ? "bg-secondary/10 text-secondary" : "bg-error/10 text-error"} grid place-items-center shrink-0`}
                  >
                    <Icon name={m.type === "entrada" ? "south_east" : "north_east"} />
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="text-label-lg font-semibold truncate">{m.productName}</h3>
                      <span
                        className={`font-mono text-data-mono ${m.type === "entrada" ? "text-secondary" : "text-error"} shrink-0`}
                      >
                        {m.type === "entrada" ? "+" : "-"}
                        {String(m.quantity).padStart(2, "0")} u
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-body-md text-on-surface-variant">
                        {m.type === "entrada" ? "Entrada" : "Salida"}:
                      </p>
                      {/* Etiqueta: venta vs salida manual */}
                      <span
                        className={`text-label-sm px-2 py-0.5 rounded-full font-medium ${
                          m.note === "Venta"
                            ? "bg-tertiary-fixed text-on-tertiary-fixed-variant"
                            : "bg-surface-container text-on-surface-variant"
                        }`}
                      >
                        {m.note}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Icon name="schedule" className="text-outline" style={{ fontSize: 14 }} />
                      <span className="text-label-md text-outline">
                        {new Date(m.timestamp).toLocaleTimeString("es-ES", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        · ID: #{m.id.slice(0, 8)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
