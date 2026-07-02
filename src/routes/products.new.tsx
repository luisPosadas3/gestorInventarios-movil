import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { createProduct, updateProduct, getProductById } from "@/services/products.service";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/products/new")({
  head: () => ({ meta: [{ title: "Registrar Producto" }] }),
  validateSearch: (search: Record<string, unknown>): { editId?: string } => ({
    editId: typeof search.editId === "string" ? search.editId : undefined,
  }),
  component: NewProduct,
});

function NewProduct() {
  const navigate = useNavigate();
  const { refreshProducts } = useStore();
  const { editId } = useSearch({ from: "/products/new" });
  const isEditing = Boolean(editId);

  const [form, setForm] = useState({
    name: "",
    sku: "",
    purchasePrice: "",
    salePrice: "",
    stock: "",
    minStock: "5",
  });
  const [image, setImage] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEditing);
  const [scanOpen, setScanOpen] = useState(false);
  const [errorModal, setErrorModal] = useState<string | null>(null);

  useEffect(() => {
    if (!editId) return;
    getProductById(editId)
      .then((p) => {
        setForm({
          name: p.name,
          sku: p.sku,
          purchasePrice: String(p.purchasePrice),
          salePrice: String(p.salePrice),
          stock: String(p.stock),
          minStock: String(p.minStock),
        });
        setImage(p.image ?? "");
      })
      .catch((err) =>
        setErrorModal(err instanceof Error ? err.message : "Error al cargar el producto"),
      )
      .finally(() => setLoading(false));
  }, [editId]);

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const missingFields: string[] = [];
    if (!form.name.trim()) missingFields.push("Nombre del Producto");
    if (!form.sku.trim()) missingFields.push("SKU");
    if (!form.purchasePrice) missingFields.push("Precio Compra");
    if (!form.salePrice) missingFields.push("Precio Venta");
    if (!form.stock) missingFields.push(isEditing ? "Stock Actual" : "Stock Inicial");

    if (missingFields.length > 0) {
      setErrorModal(`Completa los siguientes campos obligatorios: ${missingFields.join(", ")}.`);
      return;
    }

    const purchasePriceNum = Number(form.purchasePrice);
    const salePriceNum = Number(form.salePrice);
    const stockNum = Number(form.stock);

    if (stockNum < 0) {
      setErrorModal(
        isEditing
          ? "El stock actual no puede ser un número negativo."
          : "El stock inicial no puede ser un número negativo.",
      );
      return;
    }

    if (purchasePriceNum > salePriceNum) {
      setErrorModal("El precio de compra no puede ser mayor al precio de venta.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        sku: form.sku.trim(),
        name: form.name.trim(),
        image: image || null,
        purchasePrice: purchasePriceNum,
        salePrice: salePriceNum,
        stock: stockNum,
        minStock: Number(form.minStock || 5),
      };

      if (isEditing && editId) {
        await updateProduct(editId, payload);
      } else {
        await createProduct(payload);
      }

      // Sincroniza el catálogo compartido para que dashboard, alertas,
      // finanzas y ventas reflejen el cambio sin necesitar recargar.
      await refreshProducts();

      navigate({ to: "/products" });
    } catch (error) {
      setErrorModal(error instanceof Error ? error.message : "Error al guardar producto");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppShell title="Editar Producto" back hideNav>
        <p className="text-body-md text-on-surface-variant text-center py-16">Cargando...</p>
      </AppShell>
    );
  }

  return (
    <AppShell title={isEditing ? "Editar Producto" : "Registrar Producto"} back hideNav>
      <p className="text-body-md text-on-surface-variant mt-section-margin mb-6">
        {isEditing
          ? "Modifica los datos del producto y guarda los cambios."
          : "Ingrese los detalles del nuevo artículo para integrarlo al inventario operativo."}
      </p>

      <form onSubmit={handleSave} className="flex flex-col gap-6 pb-32">
        <Card title="Imagen del Producto" icon="image">
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 rounded-lg bg-surface-container border border-outline-variant overflow-hidden grid place-items-center shrink-0">
              {image ? (
                <img src={image} alt="Vista previa" className="w-full h-full object-cover" />
              ) : (
                <Icon
                  name="add_photo_alternate"
                  className="text-on-surface-variant"
                  style={{ fontSize: 32 }}
                />
              )}
            </div>
            <div className="flex-1 flex flex-col gap-2">
              <label className="h-10 px-4 bg-primary text-on-primary rounded-full font-semibold flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-transform text-label-lg">
                <Icon name="upload" style={{ fontSize: 18 }} />
                {image ? "Cambiar imagen" : "Subir imagen"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
              {image && (
                <button
                  type="button"
                  onClick={() => setImage("")}
                  className="h-9 px-3 text-error text-label-md font-medium flex items-center justify-center gap-1 hover:bg-error-container rounded-full"
                >
                  <Icon name="delete" style={{ fontSize: 16 }} /> Eliminar
                </button>
              )}
            </div>
          </div>
          <p className="text-[11px] text-on-surface-variant leading-tight">
            Formatos admitidos: JPG, PNG, WEBP. Recomendado 1:1.
          </p>
        </Card>

        <Card title="Información Básica" icon="info">
          <Field label="Nombre del Producto" required>
            <input
              value={form.name}
              onChange={update("name")}
              placeholder="Ej: Cable Industrial Cat6"
              className="w-full h-12 px-3 bg-white border border-outline-variant rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </Field>
          <Field label="SKU" required>
            <div className="flex flex-col gap-2">
              <input
                value={form.sku}
                onChange={update("sku")}
                placeholder="Ej: MK-001"
                className="w-full h-12 px-3 bg-white border border-outline-variant rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary font-mono"
              />
              <button
                type="button"
                onClick={() => setScanOpen(true)}
                className="hidden h-11 px-4 bg-tertiary-fixed text-on-tertiary-fixed-variant rounded-xl text-label-lg font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <Icon name="barcode_scanner" />
                Escanear SKU
              </button>
            </div>
          </Field>
        </Card>

        <Card title="Precios y Costos" icon="payments">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Precio Compra" required>
              <div className="h-12 px-3 bg-white border border-outline-variant rounded-lg flex items-center">
                <span className="text-on-surface-variant mr-2">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.purchasePrice}
                  onChange={update("purchasePrice")}
                  placeholder="0.00"
                  className="w-full bg-transparent outline-none font-mono"
                />
              </div>
            </Field>
            <Field label="Precio Venta" required>
              <div className="h-12 px-3 bg-white border border-outline-variant rounded-lg flex items-center">
                <span className="text-on-surface-variant mr-2">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.salePrice}
                  onChange={update("salePrice")}
                  placeholder="0.00"
                  className="w-full bg-transparent outline-none font-mono"
                />
              </div>
            </Field>
          </div>
        </Card>

        <div className="bg-surface-container-lowest border border-outline-variant p-container-padding rounded-xl relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-secondary" />
          <h2 className="text-label-lg font-semibold text-primary mb-4 flex items-center gap-2">
            <Icon name="inventory_2" style={{ fontSize: 18 }} /> Control de Inventario
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label={isEditing ? "Stock Actual" : "Stock Inicial"} required>
              <input
                type="number"
                value={form.stock}
                onChange={update("stock")}
                placeholder="0"
                className="w-full h-12 px-3 bg-white border border-outline-variant rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary font-mono"
              />
            </Field>
            <Field label="Stock Mínimo" required>
              <input
                type="number"
                min="0"
                value={form.minStock}
                onChange={update("minStock")}
                placeholder="5"
                className="w-full h-12 px-3 bg-white border border-outline-variant rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary font-mono"
              />
            </Field>
          </div>
          <p className="mt-4 text-[11px] text-on-surface-variant leading-tight">
            Se generará una alerta automática cuando las existencias sean menores al Stock Mínimo
            definido.
          </p>
        </div>

        <footer className="fixed bottom-0 left-0 w-full z-40 bg-surface border-t border-outline-variant p-container-padding">
          <button
            type="submit"
            disabled={saving}
            className="w-full h-12 bg-primary text-on-primary rounded-full font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md disabled:opacity-70"
          >
            <Icon name={saving ? "sync" : "save"} className={saving ? "animate-spin" : ""} />
            {saving ? "Guardando..." : isEditing ? "Guardar Cambios" : "Guardar Producto"}
          </button>
        </footer>
      </form>

      <BarcodeScanner
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        mode="capture"
        onDetected={(code) => setForm((prev) => ({ ...prev, sku: code }))}
      />

      {errorModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-surface-container-lowest rounded-xl shadow-xl overflow-hidden border border-error/20">
            <div className="px-container-padding py-5 text-center border-b border-outline-variant bg-error-container/10">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-error/10 rounded-full mb-2">
                <Icon name="error" filled className="text-error" style={{ fontSize: 28 }} />
              </div>
              <h2 className="text-headline-sm font-semibold text-error">No se pudo continuar</h2>
            </div>
            <div className="p-container-padding py-6 text-center">
              <p className="text-body-lg text-on-surface-variant font-medium">{errorModal}</p>
            </div>
            <div className="p-container-padding bg-surface-container-low flex flex-col gap-2">
              <button
                onClick={() => setErrorModal(null)}
                className="w-full h-12 bg-error text-on-error rounded-xl text-label-lg font-semibold flex items-center justify-center gap-2 shadow-md active:scale-95"
              >
                <Icon name="close" /> Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function Card({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant p-container-padding rounded-xl">
      <h2 className="text-label-lg font-semibold text-primary mb-4 flex items-center gap-2">
        <Icon name={icon} style={{ fontSize: 18 }} /> {title}
      </h2>
      <div className="flex flex-col gap-stack-gap">{children}</div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-label-md text-on-surface-variant">
        {label} {required && <span className="text-error">*</span>}
      </span>
      {children}
    </label>
  );
}
