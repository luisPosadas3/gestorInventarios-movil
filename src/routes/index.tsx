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
  const { products, movements, sales } = useStore();

  const today = new Date().toDateString();
  const totalProducts = products.length;
  const lowStock = products.filter((p) => p.stock <= p.minStock);
  const totalValue = products.reduce((s, p) => s + p.stock * p.purchasePrice, 0);
  const movementsToday = movements.filter(
    (m) => new Date(m.timestamp).toDateString() === today,
  ).length;

  // Ventas y ganancia del día
  const salesToday = sales.filter((s) => new Date(s.timestamp).toDateString() === today);
  const totalSalesToday = salesToday.reduce((s, x) => s + x.total, 0);
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

  // Actividad reciente: últimos 3 movimientos
  const recentMovements = [...movements]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 3);

  return (
    <AppShell>
      <section className="mt-6">
        <h2 className="text-headline-sm font-semibold text-on-surface">Panel Principal</h2>
        <p className="text-body-md text-on-surface-variant">Resumen operativo de hoy</p>
      </section>

      <div className="grid grid-cols-2 gap-stack-gap mt-6">
        {/* Total Productos */}
        <div className="bg-surface-container-lowest border border-outline-variant p-4 rounded-xl flex flex-col justify-between h-32 shadow-sm">
          <Icon name="inventory" className="text-primary p-2 bg-primary-fixed rounded-lg w-fit" />
          <div>
            <p className="text-label-md text-on-surface-variant uppercase tracking-wider">
              Total Productos
            </p>
            <p className="text-headline-md text-primary font-semibold">{totalProducts}</p>
          </div>
        </div>

        {/* Stock Bajo */}
        <div className="bg-surface-container-lowest border border-outline-variant p-4 rounded-xl flex flex-col justify-between h-32 shadow-sm">
          <Icon
            name="trending_down"
            className="text-error p-2 bg-error-container rounded-lg w-fit"
          />
          <div>
            <p className="text-label-md text-on-surface-variant uppercase tracking-wider">
              Stock Bajo
            </p>
            <p className="text-headline-md text-error font-semibold">{lowStock.length}</p>
          </div>
        </div>

        {/* Ventas + Ganancia del día — mini card hacia finanzas */}
        <Link
          to="/finance"
          className="col-span-2 bg-primary text-on-primary p-4 rounded-xl flex items-center justify-between active:scale-[0.98] transition-all shadow-md"
        >
          <div className="flex flex-col gap-0.5">
            <span className="text-label-md opacity-80 uppercase tracking-wider">Ventas de hoy</span>
            <span className="text-headline-md font-bold">
              ${totalSalesToday.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <span className="text-label-md opacity-80">
              Ganancia: ${profitToday.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Icon name="payments" style={{ fontSize: 28 }} />
            <span className="text-label-md opacity-70">
              {salesToday.length} {salesToday.length === 1 ? "venta" : "ventas"}
            </span>
            <Icon name="chevron_right" style={{ fontSize: 18 }} />
          </div>
        </Link>

        {/* Valor Inventario */}
        <div className="bg-surface-container-lowest border border-outline-variant p-4 rounded-xl flex flex-col justify-between shadow-sm">
          <Icon
            name="payments"
            filled
            className="text-secondary p-2 bg-secondary-fixed rounded-full w-fit"
          />
          <div>
            <p className="text-label-md text-on-surface-variant uppercase tracking-wider mt-1">
              Valor Inventario
            </p>
            <p className="text-headline-sm font-semibold text-on-surface">
              ${Math.round(totalValue).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
            </p>
          </div>
        </div>

        {/* Movimientos Hoy */}
        <div className="bg-primary-container p-4 rounded-xl flex flex-col justify-between shadow-sm">
          <Icon name="swap_horizontal_circle" className="text-on-primary-container" />
          <div>
            <p className="text-label-md text-on-primary-container uppercase tracking-wider mt-1">
              Movimientos Hoy
            </p>
            <p className="text-headline-sm font-semibold text-on-primary-container">
              {movementsToday}
            </p>
          </div>
        </div>
      </div>

      {/* Alertas Críticas */}
      <section className="mt-section-margin">
        <div className="flex justify-between items-center mb-stack-gap">
          <h3 className="text-headline-sm font-semibold text-on-surface flex items-center gap-2">
            Alertas Críticas
            {lowStock.length > 0 && (
              <span className="flex h-2 w-2 rounded-full bg-error animate-pulse" />
            )}
          </h3>
          {lowStock.length > 0 && (
            <Link to="/alerts" className="text-primary text-label-lg font-semibold">
              Ver todas
            </Link>
          )}
        </div>

        {lowStock.length === 0 ? (
          <div className="p-5 rounded-xl bg-secondary-container/30 border border-secondary/20 flex items-center gap-3">
            <Icon name="check_circle" className="text-secondary" style={{ fontSize: 28 }} />
            <div>
              <p className="text-label-lg font-semibold text-on-surface">Inventario en orden</p>
              <p className="text-body-md text-on-surface-variant">
                Todos los productos tienen stock suficiente
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-item-gap">
            {lowStock.slice(0, 3).map((p) => (
              <div
                key={p.id}
                className="bg-surface-container-lowest border-l-4 border-l-error border border-outline-variant p-container-padding rounded-lg flex items-center justify-between"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-error-container rounded-lg flex items-center justify-center shrink-0">
                    <Icon name={p.icon} className="text-error" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-label-lg font-semibold text-on-surface truncate">
                      {p.name}
                    </h4>
                    <p className="text-body-md text-error font-semibold">
                      {p.stock === 0 ? "Agotado" : `Quedan ${p.stock} unidades`}
                    </p>
                  </div>
                </div>
                <Link
                  to="/movements"
                  className="shrink-0 bg-primary text-on-primary px-3 py-1.5 rounded-lg text-label-md font-semibold flex items-center gap-1 active:scale-95 transition-transform"
                >
                  <Icon name="add" style={{ fontSize: 16 }} /> Entrada
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Actividad Reciente */}
      {recentMovements.length > 0 && (
        <section className="mt-section-margin pb-6">
          <div className="flex justify-between items-center mb-stack-gap">
            <h3 className="text-headline-sm font-semibold text-on-surface">Actividad Reciente</h3>
            <Link to="/movements/history" className="text-primary text-label-lg font-semibold">
              Ver todo
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {recentMovements.map((m) => (
              <div
                key={m.id}
                className="bg-surface-container-lowest border border-outline-variant rounded-xl p-3 flex items-center gap-3"
              >
                <div
                  className={`w-9 h-9 rounded-lg grid place-items-center shrink-0 ${
                    m.type === "entrada"
                      ? "bg-secondary/10 text-secondary"
                      : "bg-error/10 text-error"
                  }`}
                >
                  <Icon
                    name={m.type === "entrada" ? "south_east" : "north_east"}
                    style={{ fontSize: 18 }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-label-lg font-semibold truncate">{m.productName}</p>
                  <p className="text-label-md text-on-surface-variant truncate">{m.note}</p>
                </div>
                <div className="text-right shrink-0">
                  <p
                    className={`font-mono text-label-lg font-semibold ${
                      m.type === "entrada" ? "text-secondary" : "text-error"
                    }`}
                  >
                    {m.type === "entrada" ? "+" : "-"}
                    {m.quantity} u
                  </p>
                  <p className="text-label-sm text-outline">
                    {new Date(m.timestamp).toLocaleTimeString("es-ES", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </AppShell>
  );
}
