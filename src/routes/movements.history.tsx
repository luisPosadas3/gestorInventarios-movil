import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { useStore } from "@/lib/store";
import type { Movement } from "@/lib/mock-data";

export const Route = createFileRoute("/movements/history")({
  head: () => ({ meta: [{ title: "Historial de Movimientos" }] }),
  component: History,
});

function groupByDay(movements: Movement[]) {
  const map = new Map<string, Movement[]>();
  for (const m of movements) {
    const d = new Date(m.timestamp);
    const key = d.toDateString();
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
  const { movements } = useStore();
  const sorted = [...movements].sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));
  const groups = groupByDay(sorted);

  return (
    <AppShell title="Historial" back>
      <section className="mt-section-margin">
        <h2 className="text-headline-md font-bold text-on-surface mb-1">Historial de Movimientos</h2>
        <p className="text-body-md text-on-surface-variant">Seguimiento detallado de entradas y salidas de inventario.</p>
      </section>

      <section className="mb-section-margin overflow-x-auto hide-scrollbar -mx-container-padding px-container-padding flex gap-stack-gap mt-4">
        {[
          { icon: "calendar_month", color: "text-primary", label: "Fecha", value: "Hoy" },
          { icon: "swap_vert", color: "text-secondary", label: "Tipo", value: "Todos" },
          { icon: "category", color: "text-tertiary-fixed-dim", label: "Categoría", value: "Todas" },
        ].map((f) => (
          <div key={f.label} className="shrink-0 bg-surface-container-lowest border border-outline-variant rounded-xl p-3 flex flex-col gap-1 min-w-[130px]">
            <Icon name={f.icon} className={f.color} />
            <span className="text-label-md text-on-surface-variant">{f.label}</span>
            <span className="text-label-lg font-semibold">{f.value}</span>
          </div>
        ))}
      </section>

      <div className="space-y-3">
        {[...groups.entries()].map(([key, list]) => (
          <div key={key} className="space-y-3">
            <div className="flex items-center gap-2 py-1">
              <div className="h-px flex-grow bg-outline-variant" />
              <span className="text-label-md text-on-surface-variant uppercase tracking-wider">
                {dayLabel(key)}, {new Date(key).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
              </span>
              <div className="h-px flex-grow bg-outline-variant" />
            </div>
            {list.map((m) => (
              <div
                key={m.id}
                className="bg-surface-container-lowest border border-outline-variant rounded-xl relative p-container-padding flex items-center gap-3 overflow-hidden"
              >
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${m.type === "entrada" ? "bg-secondary" : "bg-error"} rounded-l-full`} />
                <div className={`w-10 h-10 rounded-lg ${m.type === "entrada" ? "bg-secondary/10 text-secondary" : "bg-error/10 text-error"} grid place-items-center shrink-0`}>
                  <Icon name={m.type === "entrada" ? "south_east" : "north_east"} />
                </div>
                <div className="flex-grow min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="text-label-lg font-semibold truncate">{m.productName}</h3>
                    <span className={`font-mono text-data-mono ${m.type === "entrada" ? "text-secondary" : "text-error"} shrink-0`}>
                      {m.type === "entrada" ? "+" : "-"}
                      {String(m.quantity).padStart(2, "0")} u
                    </span>
                  </div>
                  <p className="text-body-md text-on-surface-variant">
                    {m.type === "entrada" ? "Entrada" : "Salida"}: {m.note}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Icon name="schedule" className="text-outline" style={{ fontSize: 14 }} />
                    <span className="text-label-md text-outline">
                      {new Date(m.timestamp).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })} · ID: #{m.id}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </AppShell>
  );
}
