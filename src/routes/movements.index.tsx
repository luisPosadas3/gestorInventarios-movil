import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { startRecording, type Recorder } from "@/lib/recorder";
import { useStore } from "@/lib/store";
import { getProducts, mapApiProductToProduct, type ApiProduct } from "../services/products.service";
import { createMovement } from "../services/movements.service";

export const Route = createFileRoute("/movements/")({
  head: () => ({ meta: [{ title: "Movimientos" }] }),
  component: Movements,
});

function Movements() {
  const { updateStock } = useStore();

  // ── Productos desde API ──────────────────────────────────────────
  const [apiProducts, setApiProducts] = useState<ApiProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    getProducts()
      .then(setApiProducts)
      .finally(() => setLoadingProducts(false));
  }, []);

  // ── Buscador de producto ─────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<ApiProduct | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const filtered =
    search.length >= 1
      ? apiProducts
          .filter(
            (p) =>
              p.name.toLowerCase().includes(search.toLowerCase()) ||
              p.sku.toLowerCase().includes(search.toLowerCase()),
          )
          .slice(0, 6)
      : [];

  const selectProduct = (p: ApiProduct) => {
    setSelectedProduct(p);
    setSearch(`${p.sku} — ${p.name}`);
    setShowDropdown(false);
    // Auto-fill precio según tipo
    setPrice(type === "entrada" ? p.purchasePrice.toFixed(2) : p.salePrice.toFixed(2));
  };

  // Cerrar dropdown al click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Formulario ───────────────────────────────────────────────────
  const [type, setType] = useState<"entrada" | "salida">("entrada");
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<null | {
    product: ApiProduct;
    qty: number;
    type: "entrada" | "salida";
    unit: number;
  }>(null);

  // Al cambiar tipo, actualiza precio auto si hay producto seleccionado
  useEffect(() => {
    if (selectedProduct) {
      setPrice(
        type === "entrada"
          ? selectedProduct.purchasePrice.toFixed(2)
          : selectedProduct.salePrice.toFixed(2),
      );
    }
  }, [type, selectedProduct]);

  const unit = parseFloat(price) || 0;
  const total = unit * qty;

  const handleConfirm = () => {
    if (!selectedProduct) return;
    setConfirm({ product: selectedProduct, qty, type, unit });
  };

  const finalize = async () => {
    if (!confirm) return;
    setSaving(true);
    try {
      await createMovement({
        productId: confirm.product.id,
        productName: confirm.product.name,
        type: confirm.type,
        subtype: "manual",
        quantity: confirm.qty,
        price: confirm.unit,
        note: confirm.type === "entrada" ? "Registro manual" : "Salida manual",
      });
      // Reflejo inmediato en store local
      updateStock(confirm.product.id, confirm.type === "entrada" ? confirm.qty : -confirm.qty);
      setConfirm(null);
      setQty(1);
      setPrice("");
      setSearch("");
      setSelectedProduct(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  // ── Voz ──────────────────────────────────────────────────────────
  const recorderRef = useRef<Recorder | null>(null);
  const [recState, setRecState] = useState<"idle" | "recording" | "processing">("idle");
  const [transcript, setTranscript] = useState("");
  const [voiceError, setVoiceError] = useState("");

  const handleMicClick = async () => {
    setVoiceError("");
    if (recState === "recording") {
      const rec = recorderRef.current;
      if (!rec) return;
      recorderRef.current = null;
      setRecState("processing");
      try {
        const blob = await rec.stop();
        const fd = new FormData();
        fd.append("file", blob, "recording.wav");
        const res = await fetch("/api/transcribe", { method: "POST", body: fd });
        const data = await res.json().catch(() => ({}));
        if (!res.ok)
          throw new Error(data?.error?.message || data?.error || "Error de transcripción");
        setTranscript((data.text || "").trim() || "(sin voz detectada)");
      } catch (e) {
        setVoiceError(e instanceof Error ? e.message : "Error al transcribir");
      } finally {
        setRecState("idle");
      }
      return;
    }
    try {
      const rec = await startRecording();
      recorderRef.current = rec;
      setTranscript("");
      setRecState("recording");
    } catch {
      setVoiceError("No se pudo acceder al micrófono.");
    }
  };

  // ── Scanner ───────────────────────────────────────────────────────
  const [scanOpen, setScanOpen] = useState(false);
  const [lastScan, setLastScan] = useState<{ code: string; matched: boolean } | null>(null);

  return (
    <AppShell title="Registrar Movimiento">
      {/* Sección voz — sin cambios */}
      <section className="mt-4 flex flex-col items-center justify-center p-6 bg-surface-container-lowest border border-outline-variant rounded-xl text-center">
        <button
          type="button"
          onClick={handleMicClick}
          disabled={recState === "processing"}
          aria-label={recState === "recording" ? "Detener grabación" : "Empezar a hablar"}
          className={`mb-4 w-28 h-28 rounded-full grid place-items-center shadow-lg active:scale-95 transition-transform ${
            recState === "recording"
              ? "bg-error animate-pulse"
              : recState === "processing"
                ? "bg-surface-container-high"
                : "bg-primary"
          }`}
        >
          <Icon
            name={
              recState === "processing"
                ? "progress_activity"
                : recState === "recording"
                  ? "stop"
                  : "mic"
            }
            className={
              recState === "processing" ? "text-on-surface animate-spin" : "text-on-primary"
            }
            style={{ fontSize: 44 }}
          />
        </button>
        <h2 className="text-headline-sm font-semibold text-on-surface mb-1">
          {recState === "recording"
            ? "Escuchando…"
            : recState === "processing"
              ? "Transcribiendo…"
              : "Toca para hablar"}
        </h2>
        <p className="text-on-surface-variant text-body-md italic">(ej: "Entrada 50 martillos")</p>
        {transcript && (
          <div className="mt-4 w-full p-3 rounded-lg bg-primary-fixed text-on-primary-fixed-variant text-left">
            <p className="text-label-md text-on-surface-variant mb-1">Reconocido:</p>
            <p className="text-body-lg font-medium">"{transcript}"</p>
          </div>
        )}
        {voiceError && <p className="mt-3 text-label-md text-error">{voiceError}</p>}
      </section>

      {/* Registro manual */}
      <section className="mt-section-margin flex flex-col gap-stack-gap bg-surface-container-lowest p-container-padding rounded-xl border border-outline-variant">
        <h3 className="text-headline-sm font-semibold">Registro Manual</h3>

        {/* Toggle entrada/salida */}
        <div className="flex bg-surface-container p-1 rounded-lg">
          <button
            onClick={() => setType("entrada")}
            className={`flex-1 py-2 rounded-md text-label-lg font-semibold transition-all ${
              type === "entrada"
                ? "bg-primary text-on-primary shadow-sm"
                : "text-on-surface-variant"
            }`}
          >
            Entrada
          </button>
          <button
            onClick={() => setType("salida")}
            className={`flex-1 py-2 rounded-md text-label-lg font-semibold transition-all ${
              type === "salida" ? "bg-error text-on-error shadow-sm" : "text-on-surface-variant"
            }`}
          >
            Salida
          </button>
        </div>

        {/* Buscador de producto */}
        <div ref={searchRef} className="relative flex flex-col gap-1">
          <span className="text-label-md text-on-surface-variant px-1">Producto</span>
          <div
            className={`flex items-center bg-surface border rounded-lg h-11 px-3 gap-2 transition-all ${
              showDropdown ? "border-primary ring-2 ring-primary" : "border-outline"
            }`}
          >
            <Icon
              name="search"
              className="text-on-surface-variant shrink-0"
              style={{ fontSize: 18 }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelectedProduct(null);
                setShowDropdown(true);
                setPrice("");
              }}
              onFocus={() => {
                if (search) setShowDropdown(true);
              }}
              placeholder={loadingProducts ? "Cargando productos…" : "Buscar por nombre o SKU…"}
              disabled={loadingProducts}
              className="flex-1 bg-transparent outline-none text-body-md"
            />
            {selectedProduct && (
              <Icon
                name="check_circle"
                className="text-secondary shrink-0"
                style={{ fontSize: 18 }}
              />
            )}
            {search && !selectedProduct && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setSelectedProduct(null);
                  setShowDropdown(false);
                  setPrice("");
                }}
                className="text-on-surface-variant"
              >
                <Icon name="close" style={{ fontSize: 18 }} />
              </button>
            )}
          </div>

          {/* Dropdown resultados */}
          {showDropdown && filtered.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg overflow-hidden">
              {filtered.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onMouseDown={() => selectProduct(p)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-surface-container text-left transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 grid place-items-center shrink-0">
                    <Icon name="inventory_2" className="text-primary" style={{ fontSize: 16 }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-label-lg font-semibold truncate">{p.name}</p>
                    <p className="text-label-md text-on-surface-variant font-mono">{p.sku}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-label-md text-on-surface-variant">
                      {type === "entrada" ? "Compra" : "Venta"}
                    </p>
                    <p className="text-label-lg font-mono font-semibold text-primary">
                      ${(type === "entrada" ? p.purchasePrice : p.salePrice).toFixed(2)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {showDropdown && search.length >= 1 && filtered.length === 0 && (
            <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-surface-container-lowest border border-outline-variant rounded-xl p-4 text-center text-on-surface-variant text-body-md shadow-lg">
              Sin resultados para "{search}"
            </div>
          )}

          {/* Info del producto seleccionado */}
          {selectedProduct && (
            <div className="flex items-center gap-3 px-3 py-2 bg-secondary/10 rounded-lg border border-secondary/20">
              <Icon name="check_circle" className="text-secondary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-label-md text-secondary font-semibold truncate">
                  {selectedProduct.name}
                </p>
                <p className="text-label-md text-on-surface-variant">
                  Stock actual:{" "}
                  <span className="font-mono font-semibold">{selectedProduct.stock}</span> u
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Cantidad y precio */}
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-label-md text-on-surface-variant px-1">Cantidad</span>
            <div className="flex items-center bg-surface border border-outline rounded-lg h-11 px-2 gap-1">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="w-8 h-8 grid place-items-center rounded bg-surface-container-high active:scale-90"
              >
                <Icon name="remove" />
              </button>
              <input
                type="number"
                value={qty}
                onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full text-center bg-transparent outline-none font-mono"
              />
              <button
                type="button"
                onClick={() => setQty((q) => q + 1)}
                className="w-8 h-8 grid place-items-center rounded bg-surface-container-high active:scale-90"
              >
                <Icon name="add" />
              </button>
            </div>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-label-md text-on-surface-variant px-1">
              Precio unit.{" "}
              <span className="text-outline text-label-sm">
                ({type === "entrada" ? "compra" : "venta"})
              </span>
            </span>
            <input
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              className="w-full h-11 px-3 bg-surface border border-outline rounded-lg outline-none focus:ring-2 focus:ring-primary font-mono"
            />
            <span className="text-label-md text-primary bg-primary-fixed px-2 py-0.5 rounded-full self-end">
              Total: ${total.toFixed(2)}
            </span>
          </label>
        </div>

        <button
          onClick={handleConfirm}
          disabled={!selectedProduct}
          className="mt-2 w-full h-11 bg-primary text-on-primary rounded-xl text-label-lg font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md disabled:opacity-40 disabled:pointer-events-none"
        >
          <Icon name="check_circle" /> Confirmar Movimiento
        </button>
      </section>

      {/* Cards inferiores — sin cambios */}
      <section className="mt-section-margin grid grid-cols-2 gap-3">
        <Link
          to="/movements/history"
          className="p-4 bg-secondary-container text-on-secondary-container rounded-xl flex flex-col gap-2 active:scale-95 transition-transform"
        >
          <Icon name="history" />
          <p className="text-label-md">Historial</p>
          <p className="text-headline-sm font-semibold">Ver movimientos</p>
        </Link>
        <button
          type="button"
          onClick={() => setScanOpen(true)}
          className="p-4 bg-tertiary-fixed text-on-tertiary-fixed-variant rounded-xl flex flex-col gap-2 active:scale-95 transition-transform text-left"
        >
          <Icon name="barcode_scanner" />
          <p className="text-label-md">Escanear código</p>
          <p className="text-headline-sm font-semibold">Abrir Cámara</p>
        </button>
      </section>

      {lastScan && (
        <section className="mt-section-margin p-3 rounded-xl border border-outline-variant bg-surface-container-lowest flex items-center gap-3">
          <Icon
            name={lastScan.matched ? "check_circle" : "search_off"}
            className={lastScan.matched ? "text-secondary" : "text-error"}
          />
          <div className="flex-1 min-w-0">
            <p className="text-label-md text-on-surface-variant">Último código escaneado</p>
            <p className="font-mono text-label-lg truncate">{lastScan.code}</p>
            {!lastScan.matched && (
              <p className="text-label-md text-error">Sin coincidencia en el catálogo</p>
            )}
          </div>
        </section>
      )}

      {/* Modal confirmación */}
      {confirm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-surface-container-lowest rounded-xl shadow-xl overflow-hidden">
            <div className="px-container-padding py-5 text-center border-b border-outline-variant bg-surface-container-low">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full mb-2">
                <Icon name="verified" filled className="text-primary" style={{ fontSize: 28 }} />
              </div>
              <h2 className="text-headline-sm font-semibold">Confirmar Registro</h2>
              <p className="text-body-md text-on-surface-variant">
                Revisa los detalles del movimiento
              </p>
            </div>
            <div className="p-container-padding space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-xl border border-outline-variant">
                <div className="w-12 h-12 rounded-lg bg-surface-container-highest grid place-items-center">
                  <Icon name="inventory_2" className="text-primary" />
                </div>
                <div>
                  <span className="text-label-md text-on-surface-variant uppercase tracking-wider block">
                    Producto
                  </span>
                  <span className="text-headline-sm font-semibold">{confirm.product.name}</span>
                  <span className="text-label-md text-on-surface-variant font-mono block">
                    {confirm.product.sku}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border border-outline-variant bg-surface-container-low">
                  <span className="text-label-md text-on-surface-variant block mb-1">Tipo</span>
                  <div
                    className={`flex items-center gap-2 ${confirm.type === "entrada" ? "text-secondary" : "text-error"}`}
                  >
                    <Icon
                      name={confirm.type === "entrada" ? "arrow_circle_down" : "arrow_circle_up"}
                      filled
                      style={{ fontSize: 20 }}
                    />
                    <span className="text-label-lg font-semibold">
                      {confirm.type === "entrada" ? "Entrada" : "Salida"}
                    </span>
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-outline-variant bg-surface-container-low">
                  <span className="text-label-md text-on-surface-variant block mb-1">Cantidad</span>
                  <div className="flex items-center gap-2">
                    <Icon name="layers" className="text-primary" style={{ fontSize: 20 }} />
                    <span className="text-label-lg font-semibold">{confirm.qty} unidades</span>
                  </div>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-primary text-on-primary">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-label-md opacity-80 block">Precio Total</span>
                    <span className="text-headline-md font-bold">
                      ${(confirm.qty * confirm.unit).toFixed(2)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-label-md opacity-70 block">Unitario</span>
                    <span className="text-label-lg">${confirm.unit.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-container-padding flex flex-col gap-2">
              <button
                onClick={finalize}
                disabled={saving}
                className="w-full h-11 bg-primary text-on-primary rounded-lg text-label-lg flex items-center justify-center gap-2 active:scale-95 shadow-md disabled:opacity-60"
              >
                <Icon
                  name={saving ? "progress_activity" : "check_circle"}
                  className={saving ? "animate-spin" : ""}
                />
                {saving ? "Guardando…" : "Confirmar y Guardar"}
              </button>
              <button
                onClick={() => setConfirm(null)}
                disabled={saving}
                className="w-full h-11 border border-outline text-on-surface-variant rounded-lg text-label-lg hover:bg-surface-container-high disabled:opacity-60"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <BarcodeScanner
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onDetected={(code, product) => {
          setLastScan({ code, matched: !!product });
          setSearch(code);
          setSelectedProduct(null);
          setShowDropdown(true);
          setPrice("");
        }}
      />
    </AppShell>
  );
}
