import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/finance")({
  head: () => ({ meta: [{ title: "Información Financiera" }] }),
  component: Finance,
});

function formatTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function Finance() {
  const { sales, movements, products } = useStore();

  // ── Ventas de hoy ────────────────────────────────────────────────
  const today = new Date().toDateString();
  const salesToday = sales.filter((s) => new Date(s.timestamp).toDateString() === today);
  const totalSales = salesToday.reduce((s, x) => s + x.total, 0);
  const numSales = salesToday.length;

  // Ganancia real: (precio_venta − precio_compra) × cantidad por ítem
  const profitToday = salesToday.reduce((total, sale) => {
    return (
      total +
      sale.items.reduce((s, item) => {
        const product = products.find((p) => p.id === item.productId);
        const cost = (product?.purchasePrice ?? item.price) * item.qty;
        return s + item.price * item.qty - cost;
      }, 0)
    );
  }, 0);

  // ── Movimientos del día ──────────────────────────────────────────
  const entradas = movements.filter(
    (m) => m.type === "entrada" && new Date(m.timestamp).toDateString() === today,
  );
  const salidas = movements.filter(
    (m) => m.type === "salida" && new Date(m.timestamp).toDateString() === today,
  );
  const entradasValue = entradas.reduce((s, m) => {
    const p = products.find((p) => p.id === m.productId);
    return s + (p?.purchasePrice ?? 0) * m.quantity;
  }, 0);
  const salidasValue = salidas.reduce((s, m) => {
    const p = products.find((p) => p.id === m.productId);
    return s + (p?.purchasePrice ?? 0) * m.quantity;
  }, 0);

  // ── Meta dinámica: promedio de ventas de los últimos 7 días ─────
  const last7DaysTotals = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (i + 1));
    const dateStr = d.toDateString();
    return sales
      .filter((s) => new Date(s.timestamp).toDateString() === dateStr)
      .reduce((sum, s) => sum + s.total, 0);
  });
  const avgDailySales = last7DaysTotals.reduce((sum, v) => sum + v, 0) / 7;
  const goal = Math.round(avgDailySales);
  const hasGoal = goal > 0;
  const progress = hasGoal ? Math.min(100, Math.round((totalSales / goal) * 100)) : 0;

  // ── Gráfico: últimos 4 días ──────────────────────────────────────
  const last4Days = Array.from({ length: 4 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (3 - i));
    return d;
  });
  const last4DaySales = last4Days.map((d, i) => ({
    label: i === 3 ? "Hoy" : DAY_LABELS[d.getDay()],
    isToday: i === 3,
    total: sales
      .filter((s) => new Date(s.timestamp).toDateString() === d.toDateString())
      .reduce((sum, s) => sum + s.total, 0),
  }));
  const maxDaySales = Math.max(1, ...last4DaySales.map((d) => d.total));

  // ── Transacciones recientes ──────────────────────────────────────
  const recentSales = [...sales]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5);

  return (
    <AppShell title="Finanzas" back>
      <div className="mt-section-margin space-y-section-margin">
        <div className="space-y-1">
          <h2 className="text-headline-sm font-semibold text-on-surface">Información Financiera</h2>
          <p className="text-body-md text-on-surface-variant">
            Resumen de operaciones y rentabilidad del día
          </p>
        </div>

        <section className="grid grid-cols-1 gap-3">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
            <div className="flex justify-between items-start mb-2">
              <span className="text-label-lg text-on-surface-variant font-semibold">
                Ventas del Día
              </span>
              <Icon name="payments" className="text-primary" />
            </div>
            <p className="text-headline-md font-semibold text-on-surface">
              ${totalSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <p className="text-label-md text-secondary flex items-center gap-1 mt-1">
              <Icon name="trending_up" style={{ fontSize: 14 }} /> {numSales}{" "}
              {numSales === 1 ? "venta realizada" : "ventas realizadas"}
            </p>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-secondary" />
            <div className="flex justify-between items-start mb-2">
              <span className="text-label-lg text-on-surface-variant font-semibold">
                Ganancia del Día
              </span>
              <Icon name="trending_up" className="text-secondary" />
            </div>
            <p className="text-headline-md font-semibold">
              ${profitToday.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            {numSales > 0 && (
              <p className="text-label-md text-secondary flex items-center gap-1 mt-1">
                <Icon name="percent" style={{ fontSize: 14 }} /> Margen:{" "}
                {totalSales > 0 ? Math.round((profitToday / totalSales) * 100) : 0}%
              </p>
            )}
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-label-lg text-on-surface-variant uppercase tracking-wider font-semibold">
            Resumen de Movimientos del dia
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface border border-outline-variant rounded-xl p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary-container grid place-items-center shrink-0">
                <Icon name="add_circle" className="text-on-secondary-container" />
              </div>
              <div className="min-w-0">
                <p className="text-label-md text-on-surface-variant">Entradas</p>
                <p className="text-label-lg font-semibold truncate">
                  {entradas.length} · ${entradasValue.toFixed(0)}
                </p>
              </div>
            </div>
            <div className="bg-surface border border-outline-variant rounded-xl p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-error-container grid place-items-center shrink-0">
                <Icon name="remove_circle" className="text-error" />
              </div>
              <div className="min-w-0">
                <p className="text-label-md text-on-surface-variant">Salidas</p>
                <p className="text-label-lg font-semibold truncate">
                  {salidas.length} · ${salidasValue.toFixed(0)}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-end mb-4">
            <div>
              <h3 className="text-headline-sm font-semibold">Progreso de Ventas</h3>
              <p className="text-body-md text-on-surface-variant">
                {hasGoal
                  ? `Meta estimada (prom. 7d): $${goal.toLocaleString()}`
                  : "Sin historial para estimar meta"}
              </p>
            </div>
            {hasGoal && <p className="text-headline-md text-primary font-semibold">{progress}%</p>}
          </div>
          <div className="w-full h-3 bg-surface-container-highest rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-1000 ease-out"
              style={{ width: `${hasGoal ? progress : 0}%` }}
            />
          </div>
          <div className="mt-6 grid grid-cols-4 gap-2 h-28 items-end">
            {last4DaySales.map((day) => {
              const heightPct = Math.max(4, Math.round((day.total / maxDaySales) * 100));
              return (
                <div
                  key={day.label}
                  className={`rounded-t-lg transition-all ${
                    day.isToday ? "bg-primary animate-pulse" : "bg-primary/40"
                  }`}
                  style={{ height: `${heightPct}%` }}
                />
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-label-md text-outline">
            {last4DaySales.map((day) => (
              <span key={day.label} className={day.isToday ? "text-primary font-bold" : ""}>
                {day.label}
              </span>
            ))}
          </div>
        </section>

        <section className="space-y-3 pb-8">
          <h3 className="text-label-lg text-on-surface-variant uppercase tracking-wider font-semibold">
            Transacciones Recientes
          </h3>
          {recentSales.length === 0 ? (
            <div className="p-8 text-center text-on-surface-variant bg-surface-container-lowest border border-outline-variant rounded-xl">
              <Icon name="receipt_long" style={{ fontSize: 32 }} />
              <p className="mt-2 text-body-md">Sin ventas registradas</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentSales.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-3 bg-surface border border-outline-variant rounded-xl"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-surface-container-highest grid place-items-center text-primary shrink-0">
                      <Icon name="receipt_long" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-label-lg font-semibold truncate">
                        Venta #{s.id.slice(-6).toUpperCase()}
                      </p>
                      <p className="text-label-md text-on-surface-variant truncate">
                        {s.items.length} {s.items.length === 1 ? "producto" : "productos"} ·{" "}
                        {formatTime(s.timestamp)}
                      </p>
                    </div>
                  </div>
                  <p className="text-headline-sm font-semibold shrink-0 text-primary">
                    +${s.total.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
