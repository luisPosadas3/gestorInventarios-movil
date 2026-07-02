import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { parsePagination } from "../lib/pagination.js";

const router = Router();

// GET /movements?type=entrada|salida&page=&limit=
router.get("/", async (req, res) => {
  try {
    const { type } = req.query;

    const movements = await prisma.movement.findMany({
      where: type ? { type: String(type) } : undefined,
      orderBy: { timestamp: "desc" },
      ...parsePagination(req.query),
    });

    res.json(movements);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch movements" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const movement = await prisma.movement.findUnique({ where: { id } });
    if (!movement) return res.status(404).json({ error: "Movement not found" });
    res.json(movement);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch movement" });
  }
});

// POST /movements — crea movimiento Y actualiza stock del producto
router.post("/", async (req, res) => {
  try {
    const {
      productId,
      productName,
      type,
      subtype = "manual",
      quantity,
      price = 0,
      note = "",
    } = req.body;

    if (!["entrada", "salida"].includes(type)) {
      return res.status(400).json({ error: "type must be 'entrada' or 'salida'" });
    }

    if (!["manual", "venta"].includes(subtype)) {
      return res.status(400).json({ error: "subtype must be 'manual' or 'venta'" });
    }

    if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({ error: "quantity must be a positive integer" });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ error: "Product not found" });

    if (type === "salida" && product.stock < quantity) {
      return res.status(400).json({ error: `Stock insuficiente para la salida: ${product.name} (Stock: ${product.stock}, Solicitado: ${quantity})` });
    }

    // Transacción: crear movimiento + actualizar stock
    const [movement] = await prisma.$transaction([
      prisma.movement.create({
        data: {
          productId,
          productName: productName ?? product.name,
          type,
          subtype,
          quantity,
          price,
          note,
        },
      }),
      prisma.product.update({
        where: { id: productId },
        data: {
          stock: {
            increment: type === "entrada" ? quantity : -quantity,
          },
        },
      }),
    ]);

    res.status(201).json(movement);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create movement" });
  }
});

export default router;
