import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { startRecording, type Recorder } from "@/lib/recorder";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/movements/")({
  head: () => ({ meta: [{ title: "Movimientos" }] }),
  component: Movements,
});

function Movements() {
  const { products, addMovement } = useStore();
  const [type, setType] = useState<"entrada" | "salida">("entrada");
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState("");
  const [confirm, setConfirm] = useState<null | { product: typeof products[number]; qty: number; type: "entrada" | "salida"; unit: number }>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [lastScan, setLastScan] = useState<{ code: string; matched: boolean } | null>(null);

  const recorderRef = useRef<Recorder | null>(null);
  const [recState, setRecState] = useState<"idle" | "recording" | "processing">("idle");
  const [transcript, setTranscript] = useState<string>("");
  const [voiceError, setVoiceError] = useState<string>("");

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
        if (!res.ok) throw new Error(data?.error?.message || data?.error || "Error de transcripción");
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

  const product = products.find((p) => p.id === productId);
  const unit = parseFloat(price) || product?.salePrice || 0;
  const total = unit * qty;

  const handleConfirm = () => {
    if (!product) return;
    setConfirm({ product, qty, type, unit });
  };

  const finalize = () => {
    addMovement({
      productId: confirm!.product.id,
      productName: confirm!.product.name,
      type: confirm!.type,
      quantity: confirm!.qty,
      note: confirm!.type === "entrada" ? "Registro manual" : "Salida manual",
    });
    setConfirm(null);
    setQty(1);
    setPrice("");
  };

  return (
    <AppShell title="Registrar Movimiento">
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
            name={recState === "processing" ? "progress_activity" : recState === "recording" ? "stop" : "mic"}
            className={recState === "processing" ? "text-on-surface animate-spin" : "text-on-primary"}
            style={{ fontSize: 44 }}
          />
        </button>
        <h2 className="text-headline-sm font-semibold text-on-surface mb-1">
          {recState === "recording" ? "Escuchando…" : recState === "processing" ? "Transcribiendo…" : "Toca para hablar"}
        </h2>
        <p className="text-on-surface-variant text-body-md italic">(ej: "Entrada 50 martillos")</p>

        {transcript && (
          <div className="mt-4 w-full p-3 rounded-lg bg-primary-fixed text-on-primary-fixed-variant text-left">
            <p className="text-label-md text-on-surface-variant mb-1">Reconocido:</p>
            <p className="text-body-lg font-medium">"{transcript}"</p>
          </div>
        )}
        {voiceError && (
          <p className="mt-3 text-label-md text-error">{voiceError}</p>
        )}
      </section>


      <section className="mt-section-margin flex flex-col gap-stack-gap bg-surface-container-lowest p-container-padding rounded-xl border border-outline-variant">
        <h3 className="text-headline-sm font-semibold">Registro Manual</h3>

        <div className="flex bg-surface-container p-1 rounded-lg">
          <button
            onClick={() => setType("entrada")}
            className={`flex-1 py-2 rounded-md text-label-lg font-semibold transition-all ${
              type === "entrada" ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant"
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

        <label className="flex flex-col gap-1">
          <span className="text-label-md text-on-surface-variant px-1">Producto</span>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="w-full h-11 px-3 bg-surface border border-outline rounded-lg outline-none focus:ring-2 focus:ring-primary"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.sku}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-label-md text-on-surface-variant px-1">Cantidad</span>
            <div className="flex items-center bg-surface border border-outline rounded-lg h-11 px-2 gap-1">
              <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-8 h-8 grid place-items-center rounded bg-surface-container-high active:scale-90">
                <Icon name="remove" />
              </button>
              <input
                type="number"
                value={qty}
                onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full text-center bg-transparent outline-none font-mono"
              />
              <button type="button" onClick={() => setQty((q) => q + 1)} className="w-8 h-8 grid place-items-center rounded bg-surface-container-high active:scale-90">
                <Icon name="add" />
              </button>
            </div>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-label-md text-on-surface-variant px-1">Precio unit.</span>
            <input
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder={product?.salePrice.toFixed(2)}
              className="w-full h-11 px-3 bg-surface border border-outline rounded-lg outline-none focus:ring-2 focus:ring-primary font-mono"
            />
            <span className="text-label-md text-primary bg-primary-fixed px-2 py-0.5 rounded-full self-end">
              Total: ${total.toFixed(2)}
            </span>
          </label>
        </div>

        <button
          onClick={handleConfirm}
          className="mt-2 w-full h-11 bg-primary text-on-primary rounded-xl text-label-lg font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md"
        >
          <Icon name="check_circle" /> Confirmar Movimiento
        </button>
      </section>

      <section className="mt-section-margin grid grid-cols-2 gap-3">
        <Link to="/movements/history" className="p-4 bg-secondary-container text-on-secondary-container rounded-xl flex flex-col gap-2 active:scale-95 transition-transform">
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
          <Icon name={lastScan.matched ? "check_circle" : "search_off"} className={lastScan.matched ? "text-secondary" : "text-error"} />
          <div className="flex-1 min-w-0">
            <p className="text-label-md text-on-surface-variant">Último código escaneado</p>
            <p className="font-mono text-label-lg truncate">{lastScan.code}</p>
            {!lastScan.matched && <p className="text-label-md text-error">Sin coincidencia en el catálogo</p>}
          </div>
        </section>
      )}

      {confirm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-surface-container-lowest rounded-xl shadow-xl overflow-hidden">
            <div className="px-container-padding py-5 text-center border-b border-outline-variant bg-surface-container-low">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full mb-2">
                <Icon name="verified" filled className="text-primary" style={{ fontSize: 28 }} />
              </div>
              <h2 className="text-headline-sm font-semibold">Confirmar Registro</h2>
              <p className="text-body-md text-on-surface-variant">Revisa los detalles del movimiento</p>
            </div>
            <div className="p-container-padding space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-xl border border-outline-variant">
                <div className="w-12 h-12 rounded-lg bg-surface-container-highest grid place-items-center">
                  <Icon name={confirm.product.icon} className="text-primary" />
                </div>
                <div>
                  <span className="text-label-md text-on-surface-variant uppercase tracking-wider block">Producto</span>
                  <span className="text-headline-sm font-semibold">{confirm.product.name}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border border-outline-variant bg-surface-container-low">
                  <span className="text-label-md text-on-surface-variant block mb-1">Tipo</span>
                  <div className={`flex items-center gap-2 ${confirm.type === "entrada" ? "text-secondary" : "text-error"}`}>
                    <Icon name={confirm.type === "entrada" ? "arrow_circle_down" : "arrow_circle_up"} filled style={{ fontSize: 20 }} />
                    <span className="text-label-lg font-semibold">{confirm.type === "entrada" ? "Entrada" : "Salida"}</span>
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
                    <span className="text-headline-md font-bold">${(confirm.qty * confirm.unit).toFixed(2)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-label-md opacity-70 block">Unitario</span>
                    <span className="text-label-lg">${confirm.unit.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-container-padding flex flex-col gap-2">
              <button onClick={finalize} className="w-full h-11 bg-primary text-on-primary rounded-lg text-label-lg flex items-center justify-center gap-2 active:scale-95 shadow-md">
                <Icon name="check_circle" /> Confirmar y Guardar
              </button>
              <button onClick={() => setConfirm(null)} className="w-full h-11 border border-outline text-on-surface-variant rounded-lg text-label-lg hover:bg-surface-container-high">
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
          if (product) setProductId(product.id);
        }}
      />
    </AppShell>
  );
}
