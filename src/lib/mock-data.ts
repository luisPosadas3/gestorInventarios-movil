export type Product = {
  id: string;
  sku: string;
  name: string;
  description?: string;
  icon: string;
  image?: string;
  purchasePrice: number;
  salePrice: number;
  stock: number;
  minStock: number;
};

export type Movement = {
  id: string;
  productId: string;
  productName: string;
  type: "entrada" | "salida";
  quantity: number;
  note: string;
  timestamp: string;
};

export type Sale = {
  id: string;
  items: { productId: string; name: string; qty: number; price: number }[];
  total: number;
  received: number;
  timestamp: string;
};

export const initialProducts: Product[] = [
  { id: "p1", sku: "MK-001", name: "Leche Entera 1L", icon: "water_drop", purchasePrice: 0.95, salePrice: 1.45, stock: 60, minStock: 15 },
  { id: "p2", sku: "EG-012", name: "Huevos (Docena)", icon: "egg", purchasePrice: 1.5, salePrice: 2.25, stock: 15, minStock: 20 },
  { id: "p3", sku: "AR-001", name: "Arroz Blanco 1kg", icon: "rice_bowl", purchasePrice: 0.85, salePrice: 1.2, stock: 85, minStock: 20 },
  { id: "p4", sku: "AC-1L", name: "Aceite Vegetal 1L", icon: "local_drink", purchasePrice: 2.1, salePrice: 3.5, stock: 42, minStock: 15 },
  { id: "p5", sku: "IPH-15", name: "iPhone 15", icon: "smartphone", purchasePrice: 800, salePrice: 1100, stock: 2, minStock: 5 },
  { id: "p6", sku: "USB-C-01", name: "Cable USB-C", icon: "usb", purchasePrice: 3, salePrice: 8, stock: 0, minStock: 10 },
  { id: "p7", sku: "BAT-10K", name: "Batería 10k", icon: "battery_charging_80", purchasePrice: 12, salePrice: 25, stock: 5, minStock: 10 },
  { id: "p8", sku: "AMD-R7-5800X", name: "Microprocesador Ryzen 7", icon: "memory", purchasePrice: 250, salePrice: 380, stock: 2, minStock: 10 },
  { id: "p9", sku: "LG-UW-3440", name: 'Monitor UltraWide 34"', icon: "desktop_windows", purchasePrice: 450, salePrice: 720, stock: 1, minStock: 5 },
  { id: "p10", sku: "COR-K70-RGB", name: "Teclado Mecánico RGB", icon: "keyboard", purchasePrice: 80, salePrice: 140, stock: 8, minStock: 15 },
];

export const initialMovements: Movement[] = [
  { id: "MOV-8842", productId: "p10", productName: "Teclados Mecánicos K-90", type: "entrada", quantity: 20, note: "Almacén Principal", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString() },
  { id: "MOV-8841", productId: "p9", productName: 'Monitor UltraWide 34"', type: "salida", quantity: 5, note: "Despacho Cliente A", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString() },
  { id: "MOV-8839", productId: "p4", productName: "Mouse Gaming Pro", type: "entrada", quantity: 50, note: "Proveedor GlobalLogistics", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString() },
  { id: "MOV-8835", productId: "p3", productName: "Webcam 4K Crystal", type: "salida", quantity: 12, note: "Ajuste de Inventario Dañado", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString() },
];

export const initialSales: Sale[] = [];
