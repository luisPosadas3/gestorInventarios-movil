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
  completeSale: (received: number) => Promise<Sale>;
};

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    // Cargar catálogo de productos real de la BD
    getProducts()
      .then((data) => setProducts(data.map(mapApiProductToProduct)))
      .catch((err) => console.error("Error al cargar productos en el Store:", err));

    // Cargar historial de ventas real de la BD
    getSales()
      .then((data) => setSales(data.map(mapApiSaleToSale)))
      .catch((err) => console.error("Error al cargar ventas en el Store:", err));

    // Cargar historial de movimientos real de la BD
    getMovements()
      .then((data) => setMovements(data.map(mapApiMovementToMovement)))
      .catch((err) => console.error("Error al cargar movimientos en el Store:", err));
  }, []);

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

    // Refrescar movimientos en segundo plano
    try {
      const updatedMovements = await getMovements();
      setMovements(updatedMovements.map(mapApiMovementToMovement));
    } catch (e) {
      console.error("Error al refrescar movimientos tras la venta:", e);
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
