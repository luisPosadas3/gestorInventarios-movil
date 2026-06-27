import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/products/new")({
  head: () => ({ meta: [{ title: "Registrar Producto" }] }),
  component: NewProduct,
});

function NewProduct() {
  const { addProduct } = useStore();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    sku: "",
    description: "",
    purchasePrice: "",
    salePrice: "",
    stock: "",
    minStock: "5",
  });
  const [image, setImage] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.purchasePrice || !form.salePrice || !form.stock) return;
    setSaving(true);
    setTimeout(() => {
      addProduct({
        name: form.name,
        sku: form.sku || `SKU-${Date.now().toString().slice(-6)}`,
        description: form.description,
        icon: "category",
        image: image || undefined,
        purchasePrice: parseFloat(form.purchasePrice),
        salePrice: parseFloat(form.salePrice),
        stock: parseInt(form.stock),
        minStock: parseInt(form.minStock || "5"),
      });
      navigate({ to: "/products" });
    }, 700);
  };

  return (
    <AppShell title="Registrar Producto" back hideNav>
      <p className="text-body-md text-on-surface-variant mt-section-margin mb-6">
        Ingrese los detalles del nuevo artículo para integrarlo al inventario operativo.
      </p>

      <form onSubmit={handleSave} className="flex flex-col gap-6 pb-32">
        <Card title="Información Básica" icon="info">
          <Field label="Nombre del Producto" required>
            <input
              required
              value={form.name}
              onChange={update("name")}
              placeholder="Ej: Cable Industrial Cat6"
              className="w-full h-12 px-3 bg-white border border-outline-variant rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </Field>
          <Field label="SKU">
            <input
              value={form.sku}
              onChange={update("sku")}
              placeholder="Opcional"
              className="w-full h-12 px-3 bg-white border border-outline-variant rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary font-mono"
            />
          </Field>
          <Field label="Descripción">
            <textarea
              value={form.description}
              onChange={update("description")}
              placeholder="Especificaciones técnicas, marca o modelo..."
              className="w-full min-h-[96px] p-3 bg-white border border-outline-variant rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
            />
          </Field>
        </Card>

        <Card title="Precios y Costos" icon="payments">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Precio Compra" required>
              <div className="h-12 px-3 bg-white border border-outline-variant rounded-lg flex items-center">
                <span className="text-on-surface-variant mr-2">$</span>
                <input
                  required
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
                  required
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
            <Field label="Stock Inicial" required>
              <input
                required
                type="number"
                min="0"
                value={form.stock}
                onChange={update("stock")}
                placeholder="0"
                className="w-full h-12 px-3 bg-white border border-outline-variant rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary font-mono"
              />
            </Field>
            <Field label="Stock Mínimo" required>
              <input
                required
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
            Se generará una alerta automática cuando las existencias sean menores al Stock Mínimo definido.
          </p>
        </div>

        <footer className="fixed bottom-0 left-0 w-full z-40 bg-surface border-t border-outline-variant p-container-padding">
          <button
            type="submit"
            disabled={saving}
            className="w-full h-12 bg-primary text-on-primary rounded-full font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md disabled:opacity-70"
          >
            <Icon name={saving ? "sync" : "save"} className={saving ? "animate-spin" : ""} />
            {saving ? "Guardando..." : "Guardar Producto"}
          </button>
        </footer>
      </form>
    </AppShell>
  );
}

function Card({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant p-container-padding rounded-xl">
      <h2 className="text-label-lg font-semibold text-primary mb-4 flex items-center gap-2">
        <Icon name={icon} style={{ fontSize: 18 }} /> {title}
      </h2>
      <div className="flex flex-col gap-stack-gap">{children}</div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-label-md text-on-surface-variant">
        {label} {required && <span className="text-error">*</span>}
      </span>
      {children}
    </label>
  );
}
