import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { type Product, type Sale, type Movement } from "./mock-data";
import { createMovement, getMovements, mapApiMovementToMovement } from "../services/movements.service";
import { getProducts, mapApiProductToProduct } from "../services/products.service";
import { getSales, createSale, mapApiSaleToSale } from "../services/sales.service";

type CartItem = { productId: string; qty: number };

type Store = {
  products: Product[];
  sales: Sale[];
  movements: Movement[];
  cart: CartItem[];
  // Vuelve a cargar el catálogo desde la API. Debe llamarse tras cualquier
  // creación/edición/eliminación de productos hecha fuera del store (p.ej.
  // en /products) para que el resto de pantallas (dashboard, alertas,
  // finanzas, ventas) dejen de mostrar datos obsoletos.
  refreshProducts: () => Promise<void>;
  // Ahora retorna Promise y refresca desde BD
  addMovement: (m: {
    productId: string;
    productName: string;
    type: "entrada" | "salida";
    quantity: number;
    price?: number;
    note?: string;
    subtype?: "manual" | "venta";
  }) => Promise<void>;
  addToCart: (productId: string) => void;
  setCartQty: (productId: string, qty: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  completeSale: (received: number) => Promise<Sale>;
};

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);

  const refreshProducts: Store["refreshProducts"] = async () => {
    const data = await getProducts();
    setProducts(data.map(mapApiProductToProduct));
  };

  useEffect(() => {
    // Cargar catálogo de productos real de la BD
    refreshProducts().catch((err) => console.error("Error al cargar productos en el Store:", err));

    // Cargar historial de ventas real de la BD
    getSales()
      .then((data) => setSales(data.map(mapApiSaleToSale)))
      .catch((err) => console.error("Error al cargar ventas en el Store:", err));

    // Cargar historial de movimientos real de la BD
    getMovements()
      .then((data) => setMovements(data.map(mapApiMovementToMovement)))
      .catch((err) => console.error("Error al cargar movimientos en el Store:", err));
  }, []);

  // Actualización optimista local del stock; el valor real se reconcilia
  // enseguida vía refreshProducts() en cada caller.
  const updateStock = (productId: string, delta: number) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, stock: Math.max(0, p.stock + delta) } : p)),
    );
  };

  // Ahora llama a la API. El stock lo actualiza el servidor en transacción.
  const addMovement: Store["addMovement"] = async (m) => {
    const apiMov = await createMovement({
      productId: m.productId,
      productName: m.productName,
      type: m.type,
      subtype: m.subtype ?? "manual",
      quantity: m.quantity,
      price: m.price ?? 0,
      note: m.note ?? (m.type === "entrada" ? "Registro manual" : "Salida manual"),
    });

    // Agregar movimiento localmente para reflejo inmediato
    setMovements((prev) => [mapApiMovementToMovement(apiMov), ...prev]);

    // Actualiza stock local para reflejo inmediato en UI
    updateStock(m.productId, m.type === "entrada" ? m.quantity : -m.quantity);

    // Reconciliar con el stock real del servidor en segundo plano
    try {
      await refreshProducts();
    } catch (e) {
      console.error("Error al refrescar productos tras el movimiento:", e);
    }
  };

  const addToCart: Store["addToCart"] = (productId) => {
    const stock = products.find((p) => p.id === productId)?.stock ?? 0;
    if (stock <= 0) return;
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === productId);
      if (existing)
        return prev.map((i) =>
          i.productId === productId ? { ...i, qty: Math.min(stock, i.qty + 1) } : i,
        );
      return [...prev, { productId, qty: 1 }];
    });
  };

  const setCartQty: Store["setCartQty"] = (productId, qty) => {
    const stock = products.find((p) => p.id === productId)?.stock ?? Infinity;
    setCart((prev) =>
      prev.map((i) =>
        i.productId === productId ? { ...i, qty: Math.min(stock, Math.max(1, qty)) } : i,
      ),
    );
  };

  const removeFromCart: Store["removeFromCart"] = (productId) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  };

  const clearCart = () => setCart([]);

  const completeSale: Store["completeSale"] = async (received) => {
    const items = cart.map((i) => {
      const p = products.find((p) => p.id === i.productId)!;
      return { productId: i.productId, name: p.name, qty: i.qty, price: p.salePrice };
    });
    const total = items.reduce((s, i) => s + i.qty * i.price, 0);

    // Guardar venta en base de datos (descuenta stock y genera movimientos en el servidor)
    const apiSale = await createSale({
      total,
      received,
      items,
    });

    const sale = mapApiSaleToSale(apiSale);
    setSales((prev) => [sale, ...prev]);

    // Actualizar stock local para reflejo inmediato
    items.forEach((i) => updateStock(i.productId, -i.qty));

    // Refrescar productos y movimientos en segundo plano para reconciliar
    // el stock real del servidor con el parche optimista aplicado arriba.
    try {
      const [, updatedMovements] = await Promise.all([refreshProducts(), getMovements()]);
      setMovements(updatedMovements.map(mapApiMovementToMovement));
    } catch (e) {
      console.error("Error al refrescar datos tras la venta:", e);
    }

    setCart([]);
    return sale;
  };

  return (
    <StoreContext.Provider
      value={{
        products,
        sales,
        movements,
        cart,
        refreshProducts,
        addMovement,
        addToCart,
        setCartQty,
        removeFromCart,
        clearCart,
        completeSale,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
