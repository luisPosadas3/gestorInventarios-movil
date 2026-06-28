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

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { sku, name, image, purchasePrice, salePrice, stock, minStock } = req.body;

    if (typeof sku !== "string" || !sku.trim()) {
      res.status(400).json({ error: "sku is required" });
      return;
    }

    if (typeof name !== "string" || !name.trim()) {
      res.status(400).json({ error: "name is required" });
      return;
    }

    if (typeof purchasePrice !== "number" || purchasePrice < 0) {
      return res.status(400).json({
        error: "purchasePrice must be a non-negative number",
      });
    }

    if (typeof salePrice !== "number" || salePrice < 0) {
      return res.status(400).json({
        error: "salePrice must be a non-negative number",
      });
    }

    if (typeof stock !== "number" || !Number.isInteger(stock) || stock < 0) {
      return res.status(400).json({
        error: "stock must be a non-negative integer",
      });
    }

    if (typeof minStock !== "number" || !Number.isInteger(minStock) || minStock < 0) {
      return res.status(400).json({
        error: "minStock must be a non-negative integer",
      });
    }

    const product = await prisma.product.create({
      data: {
        sku,
        name,
        image,
        purchasePrice,
        salePrice,
        stock,
        minStock,
      },
    });

    res.status(201).json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create product" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { sku, name, image, purchasePrice, salePrice, stock, minStock } = req.body;

    const existing = await prisma.product.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        error: "Product not found",
      });
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        sku,
        name,
        image,
        purchasePrice,
        salePrice,
        stock,
        minStock,
      },
    });

    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Failed to update product",
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.product.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        error: "Product not found",
      });
    }

    await prisma.product.delete({
      where: { id },
    });

    res.json({
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Failed to delete product",
    });
  }
});

export default router;
