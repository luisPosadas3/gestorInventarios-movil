import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [{ title: "Panel — Gestor de Inventario" }],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { products, movements } = useStore();
  const totalProducts = products.length;
  const lowStock = products.filter((p) => p.stock <= p.minStock);
  const totalValue = products.reduce((s, p) => s + p.stock * p.purchasePrice, 0);
  const today = new Date().toDateString();
  const movementsToday = movements.filter((m) => new Date(m.timestamp).toDateString() === today).length;

  return (
    <AppShell>
      <section className="mt-6">
        <h2 className="text-headline-sm font-semibold text-on-surface">Panel Principal</h2>
        <p className="text-body-md text-on-surface-variant">Resumen operativo de hoy</p>
      </section>

      <div className="grid grid-cols-2 gap-stack-gap mt-6">
        <div className="bg-surface-container-lowest border border-outline-variant p-4 rounded-xl flex flex-col justify-between h-32 shadow-sm">
          <Icon name="inventory" className="text-primary p-2 bg-primary-fixed rounded-lg w-fit" />
          <div>
            <p className="text-label-md text-on-surface-variant uppercase tracking-wider">Total Productos</p>
            <p className="text-headline-md text-primary font-semibold">{totalProducts.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant p-4 rounded-xl flex flex-col justify-between h-32 shadow-sm">
          <Icon name="trending_down" className="text-error p-2 bg-error-container rounded-lg w-fit" />
          <div>
            <p className="text-label-md text-on-surface-variant uppercase tracking-wider">Stock Bajo</p>
            <p className="text-headline-md text-error font-semibold">{lowStock.length}</p>
          </div>
        </div>

        <div className="col-span-2 bg-surface-container-lowest border border-outline-variant p-4 rounded-xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <Icon name="payments" filled className="text-secondary p-3 bg-secondary-fixed rounded-full" />
            <div>
              <p className="text-label-md text-on-surface-variant uppercase tracking-wider">Valor Total Inventario</p>
              <p className="text-headline-md text-on-surface font-semibold">${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            </div>
          </div>
        </div>

        <div className="col-span-2 bg-primary-container p-4 rounded-xl flex items-center justify-between text-on-primary-container">
          <div className="flex items-center gap-4">
            <Icon name="swap_horizontal_circle" />
            <span className="text-label-lg font-semibold">Movimientos Hoy</span>
          </div>
          <span className="text-headline-sm font-semibold">{movementsToday}</span>
        </div>

        <Link
          to="/finance"
          className="col-span-2 bg-primary text-on-primary p-4 rounded-xl flex items-center justify-between text-label-lg active:scale-[0.98] transition-all shadow-md"
        >
          <div className="flex items-center gap-2">
            <Icon name="payments" />
            <span>Ver información financiera</span>
          </div>
          <Icon name="chevron_right" />
        </Link>
      </div>

      <section className="mt-section-margin">
        <div className="flex justify-between items-center mb-stack-gap">
          <h3 className="text-headline-sm font-semibold text-on-surface flex items-center gap-2">
            Alertas Críticas
            <span className="flex h-2 w-2 rounded-full bg-error animate-pulse" />
          </h3>
          <Link to="/alerts" className="text-primary text-label-lg font-semibold">
            Ver todas
          </Link>
        </div>

        <div className="space-y-item-gap">
          {lowStock.slice(0, 3).map((p) => (
            <Link
              key={p.id}
              to="/alerts"
              className="bg-surface-container-lowest border-l-4 border-l-error border border-outline-variant p-container-padding rounded-lg flex items-center justify-between active:scale-[0.98] transition-all"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 bg-error-container rounded-lg flex items-center justify-center shrink-0">
                  <Icon name={p.icon} className="text-error" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-label-lg font-semibold text-on-surface truncate">{p.name}</h4>
                  <p className="text-body-md text-error font-semibold">
                    {p.stock === 0 ? "Agotado" : `Quedan ${p.stock} unidades`}
                  </p>
                </div>
              </div>
              <Icon name="chevron_right" className="text-on-surface-variant shrink-0" />
            </Link>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
