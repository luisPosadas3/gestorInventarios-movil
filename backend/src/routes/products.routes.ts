import { Router } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { name: "asc" },
    });
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { sku, name, stock, price } = req.body;

    if (typeof sku !== "string" || !sku.trim()) {
      res.status(400).json({ error: "sku is required" });
      return;
    }

    if (typeof name !== "string" || !name.trim()) {
      res.status(400).json({ error: "name is required" });
      return;
    }

    if (typeof stock !== "number" || !Number.isInteger(stock) || stock < 0) {
      res.status(400).json({ error: "stock must be a non-negative integer" });
      return;
    }

    if (typeof price !== "number" || price < 0) {
      res.status(400).json({ error: "price must be a non-negative number" });
      return;
    }

    const product = await prisma.product.create({
      data: {
        sku: sku.trim(),
        name: name.trim(),
        stock,
        price,
      },
    });

    res.status(201).json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create product" });
  }
});

export default router;
