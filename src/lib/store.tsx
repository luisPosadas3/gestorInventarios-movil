import { createContext, useContext, useState, type ReactNode } from "react";
import { initialProducts, initialSales, type Product, type Sale } from "./mock-data";
import { createMovement, mapApiMovementToMovement } from "../services/movements.service";

type CartItem = { productId: string; qty: number };

type Store = {
  products: Product[];
  sales: Sale[];
  cart: CartItem[];
  addProduct: (p: Omit<Product, "id">) => void;
  updateStock: (productId: string, delta: number) => void;
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
  completeSale: (received: number) => Sale;
};

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [sales, setSales] = useState<Sale[]>(initialSales);
  const [cart, setCart] = useState<CartItem[]>([
    { productId: "p1", qty: 2 },
    { productId: "p2", qty: 1 },
  ]);

  const addProduct: Store["addProduct"] = (p) => {
    setProducts((prev) => [...prev, { ...p, id: `p${Date.now()}` }]);
  };

  const updateStock: Store["updateStock"] = (productId, delta) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, stock: Math.max(0, p.stock + delta) } : p)),
    );
  };

  // Ahora llama a la API. El stock lo actualiza el servidor en transacción.
  const addMovement: Store["addMovement"] = async (m) => {
    await createMovement({
      productId: m.productId,
      productName: m.productName,
      type: m.type,
      subtype: m.subtype ?? "manual",
      quantity: m.quantity,
      price: m.price ?? 0,
      note: m.note ?? (m.type === "entrada" ? "Registro manual" : "Salida manual"),
    });
    // Actualiza stock local para reflejo inmediato en UI sin refetch de productos
    updateStock(m.productId, m.type === "entrada" ? m.quantity : -m.quantity);
  };

  const addToCart: Store["addToCart"] = (productId) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === productId);
      if (existing)
        return prev.map((i) => (i.productId === productId ? { ...i, qty: i.qty + 1 } : i));
      return [...prev, { productId, qty: 1 }];
    });
  };

  const setCartQty: Store["setCartQty"] = (productId, qty) => {
    setCart((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, qty: Math.max(1, qty) } : i)),
    );
  };

  const removeFromCart: Store["removeFromCart"] = (productId) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  };

  const clearCart = () => setCart([]);

  const completeSale: Store["completeSale"] = (received) => {
    const items = cart.map((i) => {
      const p = products.find((p) => p.id === i.productId)!;
      return { productId: i.productId, name: p.name, qty: i.qty, price: p.salePrice };
    });
    const total = items.reduce((s, i) => s + i.qty * i.price, 0);
    const sale: Sale = {
      id: `ORD-${Math.floor(Math.random() * 90000 + 10000)}`,
      items,
      total,
      received,
      timestamp: new Date().toISOString(),
    };
    setSales((prev) => [sale, ...prev]);
    items.forEach((i) => updateStock(i.productId, -i.qty));
    setCart([]);
    return sale;
  };

  return (
    <StoreContext.Provider
      value={{
        products,
        sales,
        cart,
        addProduct,
        updateStock,
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
