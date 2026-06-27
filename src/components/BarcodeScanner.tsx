import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import { useStore } from "@/lib/store";
import type { Product } from "@/lib/mock-data";

type Props = {
  open: boolean;
  onClose: () => void;
  onDetected: (code: string, product: Product | null) => void;
};

// Minimal types for BarcodeDetector (not in TS lib by default)
type BarcodeDetectorLike = {
  detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>;
};
type BarcodeDetectorCtor = new (opts?: { formats?: string[] }) => BarcodeDetectorLike;

export function BarcodeScanner({ open, onClose, onDetected }: Props) {
  const { products } = useStore();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [manual, setManual] = useState("");

  useEffect(() => {
    if (!open) return;
    setError(null);
    setCode(null);
    setProduct(null);
    setManual("");

    let cancelled = false;
    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setError("Tu navegador no permite acceder a la cámara.");
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }

        const Ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
        if (!Ctor) return; // no detector → user can scan visually or type code

        const detector = new Ctor({
          formats: ["ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e", "qr_code", "itf"],
        });

        const tick = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            const results = await detector.detect(videoRef.current);
            if (results && results.length > 0) {
              handleCode(results[0].rawValue);
              return;
            }
          } catch {
            // ignore frame errors
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "No se pudo acceder a la cámara.";
        setError(msg);
      }
    };

    start();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleCode = (raw: string) => {
    const found =
      products.find((p) => p.sku.toLowerCase() === raw.toLowerCase()) ||
      products.find((p) => p.sku.toLowerCase().includes(raw.toLowerCase())) ||
      null;
    setCode(raw);
    setProduct(found);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  };

  const confirmAndClose = () => {
    if (code) onDetected(code, product);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      <div className="flex items-center justify-between p-4 text-white">
        <h2 className="text-headline-sm font-semibold flex items-center gap-2">
          <Icon name="barcode_scanner" /> Escanear código
        </h2>
        <button onClick={onClose} className="w-10 h-10 grid place-items-center rounded-full bg-white/10 active:scale-95">
          <Icon name="close" />
        </button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted />
        <div className="absolute inset-0 grid place-items-center pointer-events-none">
          <div className="w-[78%] aspect-[3/2] rounded-2xl border-2 border-primary/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
        </div>
        {error && (
          <div className="absolute inset-x-4 top-4 bg-error text-on-error rounded-lg p-3 text-label-md">
            {error}
          </div>
        )}
        <p className="absolute bottom-4 inset-x-0 text-center text-white/80 text-label-md px-4">
          Apunta la cámara al código de barras
        </p>
      </div>

      <div className="bg-surface p-container-padding rounded-t-2xl flex flex-col gap-3">
        {code ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Icon name="qr_code_2" className="text-primary" />
              <span className="text-label-md text-on-surface-variant">Código detectado</span>
            </div>
            <p className="font-mono text-headline-sm text-on-surface break-all">{code}</p>
            {product ? (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary-container text-on-secondary-container">
                <div className="w-12 h-12 rounded-lg bg-white/50 grid place-items-center overflow-hidden shrink-0">
                  {product.image ? (
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <Icon name={product.icon} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-label-lg font-semibold truncate">{product.name}</p>
                  <p className="text-label-md opacity-80 font-mono">SKU: {product.sku}</p>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-error-container text-on-error-container text-label-md flex items-center gap-2">
                <Icon name="search_off" /> No se encontró un producto con ese código.
              </div>
            )}
            <div className="flex gap-2 mt-1">
              <button
                onClick={() => {
                  setCode(null);
                  setProduct(null);
                }}
                className="flex-1 h-11 border border-outline text-on-surface-variant rounded-xl text-label-lg"
              >
                Escanear otro
              </button>
              <button
                onClick={confirmAndClose}
                className="flex-1 h-11 bg-primary text-on-primary rounded-xl text-label-lg font-semibold flex items-center justify-center gap-2 active:scale-95"
              >
                <Icon name="check" /> Usar
              </button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (manual.trim()) handleCode(manual.trim());
            }}
            className="flex gap-2"
          >
            <input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="Ingresar código manualmente"
              className="flex-1 h-11 px-3 bg-surface-container-low border border-outline rounded-lg outline-none font-mono"
            />
            <button type="submit" className="h-11 px-4 bg-primary text-on-primary rounded-lg text-label-lg">
              Buscar
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
