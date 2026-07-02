import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { parsePagination } from "../lib/pagination.js";

class InsufficientStockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InsufficientStockError";
  }
}

const router = Router();

// GET /sales — List all sales (soporta ?page=&limit= opcional)
router.get("/", async (req, res) => {
  try {
    const sales = await prisma.sale.findMany({
      include: {
        items: true,
      },
      orderBy: {
        timestamp: "desc",
      },
      ...parsePagination(req.query),
    });
    res.json(sales);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch sales" });
  }
});

// POST /sales — Create a new sale
router.post("/", async (req, res) => {
  try {
    const { received, items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "items must be a non-empty array" });
    }

    for (const item of items) {
      if (typeof item?.productId !== "string" || !item.productId) {
        return res.status(400).json({ error: "each item requires a valid productId" });
      }
      if (typeof item.name !== "string" || !item.name.trim()) {
        return res.status(400).json({ error: "each item requires a valid name" });
      }
      if (typeof item.qty !== "number" || !Number.isInteger(item.qty) || item.qty < 1) {
        return res
          .status(400)
          .json({ error: `quantity must be a positive integer for product ${item.productId}` });
      }
      if (typeof item.price !== "number" || !Number.isFinite(item.price) || item.price < 0) {
        return res
          .status(400)
          .json({ error: `price must be a non-negative number for product ${item.productId}` });
      }
    }

    // El total se calcula en el servidor a partir de los items validados;
    // nunca se confía en el total enviado por el cliente.
    const total = items.reduce((sum: number, item: any) => sum + item.qty * item.price, 0);

    if (typeof received !== "number" || !Number.isFinite(received) || received < 0) {
      return res.status(400).json({ error: "received must be a non-negative number" });
    }

    if (received < total) {
      return res.status(400).json({ error: "El pago recibido no puede ser menor al total de la compra" });
    }

    // Execute everything in a single transaction to guarantee consistency
    const sale = await prisma.$transaction(async (tx) => {
      // 1. Create Sale record
      const createdSale = await tx.sale.create({
        data: {
          total,
          received,
          items: {
            create: items.map((item: any) => ({
              productId: item.productId,
              name: item.name,
              qty: item.qty,
              price: item.price,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      // 2. Loop through items to update stock and create movements
      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new Error(`Product with ID ${item.productId} not found`);
        }

        if (product.stock < item.qty) {
          throw new InsufficientStockError(`Stock insuficiente para el producto: ${product.name} (Stock: ${product.stock}, Solicitado: ${item.qty})`);
        }

        // Create a matching movement with type: "salida" and subtype: "venta"
        await tx.movement.create({
          data: {
            productId: item.productId,
            productName: product.name,
            type: "salida",
            subtype: "venta",
            quantity: item.qty,
            price: item.price,
            note: "Venta",
          },
        });

        // Decrement product stock
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.qty,
            },
          },
        });
      }

      return createdSale;
    });

    res.status(201).json(sale);
  } catch (error) {
    if (error instanceof InsufficientStockError) {
      return res.status(400).json({ error: error.message });
    }
    console.error(error);
    const message = error instanceof Error ? error.message : "Failed to create sale";
    res.status(500).json({ error: message });
  }
});

export default router;
