import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/sales/")({
  head: () => ({ meta: [{ title: "Punto de Venta" }] }),
  component: Sales,
});

function Sales() {
  const { products, cart, setCartQty, removeFromCart, addToCart, clearCart, completeSale } =
    useStore();
  const [received, setReceived] = useState("");
  const [q, setQ] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [confirm, setConfirm] = useState<null | {
    total: number;
    received: number;
    change: number;
    items: { name: string; qty: number; subtotal: number }[];
  }>(null);

  const cartItems = cart.map((c) => {
    const p = products.find((p) => p.id === c.productId)!;
    return { ...c, product: p, subtotal: p.salePrice * c.qty };
  });
  const total = cartItems.reduce((s, i) => s + i.subtotal, 0);
  const [orderId, setOrderId] = useState("ORD-00000");
  const [dateLabel, setDateLabel] = useState("");
  useEffect(() => {
    setOrderId(`ORD-${String(Math.floor(Math.random() * 90000 + 10000))}`);
    setDateLabel(
      new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "short" }),
    );
  }, []);

  const searchResults = q
    ? products
        .filter(
          (p) =>
            p.name.toLowerCase().includes(q.toLowerCase()) ||
            p.sku.toLowerCase().includes(q.toLowerCase()),
        )
        .slice(0, 5)
    : [];

  const handleCharge = () => {
    if (cart.length === 0) return;
    const recv = parseFloat(received) || total;
    setConfirm({
      total,
      received: recv,
      change: recv - total,
      items: cartItems.map((i) => ({ name: i.product.name, qty: i.qty, subtotal: i.subtotal })),
    });
  };

  const confirmSale = () => {
    completeSale(confirm!.received);
    setConfirm(null);
    setReceived("");
  };

  return (
    <AppShell title="Punto de Venta">
      <section className="flex flex-col gap-stack-gap mt-4">
        <div className="bg-surface border border-outline-variant rounded-xl p-2 flex items-center shadow-sm">
          <Icon name="search" className="px-2 text-on-surface-variant" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setShowAdd(true);
            }}
            placeholder="Buscar producto o SKU..."
            className="flex-1 border-none outline-none bg-transparent text-body-lg"
          />
          <button
            type="button"
            onClick={() => setScanOpen(true)}
            className="flex items-center gap-2 bg-primary-container text-on-primary-container px-3 py-2 rounded-lg text-label-lg active:scale-95"
            aria-label="Escanear código"
          >
            <Icon name="barcode_scanner" />
          </button>
        </div>

        {showAdd && searchResults.length > 0 && (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
            {searchResults.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  addToCart(p.id);
                  setQ("");
                  setShowAdd(false);
                }}
                className="w-full px-3 py-2 flex items-center gap-3 hover:bg-surface-container-low text-left border-b border-outline-variant last:border-0"
              >
                <Icon name={p.icon} className="text-on-surface-variant" />
                <div className="flex-1 min-w-0">
                  <p className="text-label-lg font-semibold truncate">{p.name}</p>
                  <p className="text-label-md text-on-surface-variant">
                    ${p.salePrice.toFixed(2)} · Stock: {p.stock}
                  </p>
                </div>
                <Icon name="add_circle" className="text-primary" />
              </button>
            ))}
          </div>
        )}

        <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden shadow-sm">
          <div className="p-container-padding border-b border-outline-variant bg-surface-container-low flex justify-between items-center gap-2">
            <h2 className="text-headline-sm font-semibold">Venta Actual</h2>
            <div className="text-right">
              <p className="text-label-md text-on-surface-variant font-mono">{orderId}</p>
              <p className="text-label-md text-on-surface-variant">{dateLabel}</p>
            </div>
          </div>
          <div className="divide-y divide-outline-variant">
            {cartItems.length === 0 && (
              <div className="p-8 text-center text-on-surface-variant">
                El carrito está vacío. Busca productos arriba.
              </div>
            )}
            {cartItems.map((i) => (
              <div key={i.productId} className="p-3 flex items-center gap-2">
                <div className="w-10 h-10 bg-surface-container rounded-lg grid place-items-center shrink-0">
                  <Icon name={i.product.icon} className="text-on-surface-variant" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-label-lg font-semibold truncate">{i.product.name}</h3>
                  <p className="text-label-md text-on-surface-variant">
                    ${i.product.salePrice.toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setCartQty(i.productId, i.qty - 1)}
                    className="w-7 h-7 rounded-full border border-outline-variant grid place-items-center hover:bg-surface-container-high"
                  >
                    <Icon name="remove" style={{ fontSize: 16 }} />
                  </button>
                  <span className="w-6 text-center font-bold">{i.qty}</span>
                  <button
                    onClick={() => setCartQty(i.productId, i.qty + 1)}
                    className="w-7 h-7 rounded-full border border-outline-variant grid place-items-center hover:bg-surface-container-high"
                  >
                    <Icon name="add" style={{ fontSize: 16 }} />
                  </button>
                </div>
                <div className="w-16 text-right shrink-0">
                  <p className="text-label-md text-primary font-semibold">
                    ${i.subtotal.toFixed(2)}
                  </p>
                </div>
                <button
                  onClick={() => removeFromCart(i.productId)}
                  className="text-error p-1 shrink-0"
                >
                  <Icon name="delete" style={{ fontSize: 20 }} />
                </button>
              </div>
            ))}
          </div>
          {cartItems.length > 0 && (
            <div className="p-container-padding bg-surface-container-lowest">
              <button
                onClick={clearCart}
                className="w-full h-11 border border-error text-error rounded-xl text-label-lg flex items-center justify-center gap-2 hover:bg-error-container"
              >
                <Icon name="clear_all" /> Limpiar
              </button>
            </div>
          )}
        </div>

        <div className="bg-surface border border-outline-variant rounded-xl p-container-padding shadow-sm flex flex-col gap-2">
          <h2 className="text-label-lg text-on-surface-variant uppercase tracking-wider">
            Resumen
          </h2>
          <div className="border-t border-outline-variant pt-3 flex justify-between items-center">
            <span className="text-headline-sm font-semibold">Total</span>
            <span className="text-headline-lg font-bold text-primary">${total.toFixed(2)}</span>
          </div>
          <div className="mt-2 flex flex-col gap-1">
            <label className="text-label-md text-on-surface-variant font-semibold">Recibido:</label>
            <div className="bg-surface-container-low border border-outline-variant rounded-lg p-2 flex items-center">
              <Icon
                name="payments"
                className="px-2 text-on-surface-variant"
                style={{ fontSize: 18 }}
              />
              <input
                type="number"
                step="0.01"
                value={received}
                onChange={(e) => setReceived(e.target.value)}
                placeholder="0.00"
                className="flex-1 border-none outline-none bg-transparent font-mono text-body-lg"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 mt-2">
          <button
            disabled={cart.length === 0}
            onClick={handleCharge}
            className="w-full h-14 bg-primary text-on-primary rounded-xl text-headline-sm font-semibold flex items-center justify-center gap-2 shadow-md active:scale-[0.98] disabled:opacity-50"
          >
            <Icon name="receipt_long" /> Cobrar Venta
          </button>
          <button
            onClick={clearCart}
            className="w-full h-11 border border-outline text-on-surface-variant rounded-xl text-label-lg flex items-center justify-center gap-2 hover:bg-error-container hover:text-on-error-container hover:border-transparent transition-all"
          >
            <Icon name="cancel" /> Cancelar Venta
          </button>
        </div>
      </section>

      {confirm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-surface-container-lowest rounded-xl shadow-xl overflow-hidden">
            <div className="px-container-padding py-5 text-center border-b border-outline-variant bg-surface-container-low">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full mb-2">
                <Icon name="verified" filled className="text-primary" style={{ fontSize: 28 }} />
              </div>
              <h2 className="text-headline-sm font-semibold">Confirmar Venta</h2>
            </div>
            <div className="p-container-padding space-y-3">
              {confirm.items.map((it, idx) => (
                <div key={idx} className="flex justify-between text-body-md">
                  <span>
                    {it.name} ×{it.qty}
                  </span>
                  <span className="font-mono">${it.subtotal.toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t border-outline-variant pt-3 flex flex-col gap-1">
                <div className="flex justify-between">
                  <span className="text-label-lg text-on-surface-variant">Total</span>
                  <span className="text-headline-sm text-primary font-bold">
                    ${confirm.total.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-label-lg text-on-surface-variant">Recibido</span>
                  <span className="font-mono">${confirm.received.toFixed(2)}</span>
                </div>
                <div className="flex justify-between bg-secondary-container/40 p-2 rounded-lg">
                  <span className="text-label-lg text-on-secondary-container font-semibold">
                    Cambio
                  </span>
                  <span className="text-headline-sm text-on-secondary-container font-bold">
                    ${confirm.change.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
            <div className="p-container-padding bg-surface-container-low flex flex-col gap-2">
              <button
                onClick={confirmSale}
                className="w-full h-12 bg-primary text-on-primary rounded-xl text-label-lg flex items-center justify-center gap-2 shadow-md active:scale-95"
              >
                <Icon name="check_circle" /> Confirmar Venta
              </button>
              <button
                onClick={() => setConfirm(null)}
                className="w-full h-12 border border-outline text-on-surface-variant rounded-xl text-label-lg hover:bg-surface-container-high"
              >
                Seguir Editando
              </button>
            </div>
          </div>
        </div>
      )}

      <BarcodeScanner
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onDetected={(code, product) => {
          if (product) {
            addToCart(product.id);
            setQ("");
            setShowAdd(false);
          } else {
            setQ(code);
            setShowAdd(true);
          }
        }}
      />
    </AppShell>
  );
}
