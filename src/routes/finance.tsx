import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/finance")({
  head: () => ({ meta: [{ title: "Información Financiera" }] }),
  component: Finance,
});

function Finance() {
  const { sales, movements, products } = useStore();
  const today = new Date().toDateString();
  const salesToday = sales.filter((s) => new Date(s.timestamp).toDateString() === today);
  const totalSales = salesToday.reduce((s, x) => s + x.total, 0) || 15420;
  const numSales = salesToday.length || 42;

  const entradas = movements.filter((m) => m.type === "entrada");
  const salidas = movements.filter((m) => m.type === "salida");
  const entradasValue = entradas.reduce((s, m) => {
    const p = products.find((p) => p.id === m.productId);
    return s + (p?.purchasePrice ?? 0) * m.quantity;
  }, 0);
  const salidasValue = salidas.reduce((s, m) => {
    const p = products.find((p) => p.id === m.productId);
    return s + (p?.purchasePrice ?? 0) * m.quantity;
  }, 0);

  const goal = 20000;
  const progress = Math.min(100, Math.round((totalSales / goal) * 100));

  const recentTx = [
    ...salesToday.slice(0, 3).map((s) => ({ id: s.id, label: `Venta #${s.id.slice(-4)}`, amount: s.total, when: "Hace momentos", positive: true })),
    { id: "x1", label: "Venta #1234", amount: 450, when: "Hace 15 min · Caja 01", positive: true },
    { id: "x2", label: "Ajuste de Inventario", amount: -120, when: "Hace 1h · Depósito", positive: false },
  ];

  return (
    <AppShell title="Finanzas" back>
      <div className="mt-section-margin space-y-section-margin">
        <div className="space-y-1">
          <h2 className="text-headline-sm font-semibold text-on-surface">Información Financiera</h2>
          <p className="text-body-md text-on-surface-variant">Resumen de operaciones y rentabilidad del día</p>
        </div>

        <section className="grid grid-cols-1 gap-3">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
            <div className="flex justify-between items-start mb-2">
              <span className="text-label-lg text-on-surface-variant font-semibold">Ventas del Día</span>
              <Icon name="payments" className="text-primary" />
            </div>
            <p className="text-headline-md font-semibold text-on-surface">${totalSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            <p className="text-label-md text-secondary flex items-center gap-1 mt-1">
              <Icon name="trending_up" style={{ fontSize: 14 }} /> {numSales} ventas realizadas
            </p>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-secondary" />
            <div className="flex justify-between items-start mb-2">
              <span className="text-label-lg text-on-surface-variant font-semibold">Ganancia Estimada del Día</span>
              <Icon name="trending_up" className="text-secondary" />
            </div>
            <p className="text-headline-md font-semibold">${(totalSales * 0.25).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            <p className="text-label-md text-secondary flex items-center gap-1 mt-1">
              <Icon name="check_circle" style={{ fontSize: 14 }} /> Meta diaria en progreso
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-label-lg text-on-surface-variant uppercase tracking-wider font-semibold">Resumen de Movimientos</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface border border-outline-variant rounded-xl p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary-container grid place-items-center shrink-0">
                <Icon name="add_circle" className="text-on-secondary-container" />
              </div>
              <div className="min-w-0">
                <p className="text-label-md text-on-surface-variant">Entradas</p>
                <p className="text-label-lg font-semibold truncate">{entradas.length} items / ${entradasValue.toFixed(0)}</p>
              </div>
            </div>
            <div className="bg-surface border border-outline-variant rounded-xl p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-error-container grid place-items-center shrink-0">
                <Icon name="remove_circle" className="text-error" />
              </div>
              <div className="min-w-0">
                <p className="text-label-md text-on-surface-variant">Salidas</p>
                <p className="text-label-lg font-semibold truncate">{salidas.length} items / ${salidasValue.toFixed(0)}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-end mb-4">
            <div>
              <h3 className="text-headline-sm font-semibold">Progreso de Ventas</h3>
              <p className="text-body-md text-on-surface-variant">Meta diaria: ${goal.toLocaleString()}</p>
            </div>
            <p className="text-headline-md text-primary font-semibold">{progress}%</p>
          </div>
          <div className="w-full h-3 bg-surface-container-highest rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all duration-1000 ease-out" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-6 grid grid-cols-4 gap-2 h-28 items-end">
            <div className="bg-primary/20 rounded-t-lg" style={{ height: "40%" }} />
            <div className="bg-primary/40 rounded-t-lg" style={{ height: "65%" }} />
            <div className="bg-primary/60 rounded-t-lg" style={{ height: "90%" }} />
            <div className="bg-primary rounded-t-lg animate-pulse" style={{ height: `${progress}%` }} />
          </div>
          <div className="flex justify-between mt-2 text-label-md text-outline">
            <span>Lun</span>
            <span>Mar</span>
            <span>Mié</span>
            <span className="text-primary font-bold">Hoy</span>
          </div>
        </section>

        <section className="space-y-3 pb-8">
          <h3 className="text-label-lg text-on-surface-variant uppercase tracking-wider font-semibold">Transacciones Recientes</h3>
          <div className="space-y-2">
            {recentTx.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3 bg-surface border border-outline-variant rounded-xl">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-surface-container-highest grid place-items-center text-primary shrink-0">
                    <Icon name="receipt_long" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-label-lg font-semibold truncate">{t.label}</p>
                    <p className="text-label-md text-on-surface-variant truncate">{t.when}</p>
                  </div>
                </div>
                <p className={`text-headline-sm font-semibold shrink-0 ${t.positive ? "text-primary" : "text-error"}`}>
                  {t.positive ? "+" : "-"}${Math.abs(t.amount).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
