import { Router } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

function validateProductPayload(body: {
  sku?: unknown;
  name?: unknown;
  purchasePrice?: unknown;
  salePrice?: unknown;
  stock?: unknown;
  minStock?: unknown;
}) {
  const { sku, name, purchasePrice, salePrice, stock, minStock } = body;

  if (typeof sku !== "string" || !sku.trim()) {
    return "sku is required";
  }

  if (typeof name !== "string" || !name.trim()) {
    return "name is required";
  }

  if (typeof purchasePrice !== "number" || !Number.isFinite(purchasePrice) || purchasePrice < 0) {
    return "purchasePrice must be a non-negative number";
  }

  if (typeof salePrice !== "number" || !Number.isFinite(salePrice) || salePrice < 0) {
    return "salePrice must be a non-negative number";
  }

  if (purchasePrice > salePrice) {
    return "purchasePrice cannot be greater than salePrice";
  }

  if (typeof stock !== "number" || !Number.isInteger(stock) || stock < 0) {
    return "stock must be a non-negative integer";
  }

  if (typeof minStock !== "number" || !Number.isInteger(minStock) || minStock < 0) {
    return "minStock must be a non-negative integer";
  }

  return null;
}

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

    const validationError = validateProductPayload(req.body);
    if (validationError) {
      return res.status(400).json({ error: validationError });
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

    const validationError = validateProductPayload(req.body);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

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
