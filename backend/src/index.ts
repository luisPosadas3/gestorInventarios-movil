import express from "express";
import cors from "cors";
import productsRouter from "./routes/products.routes.js";
import movementsRouter from "./routes/movements.routes.js";
import salesRouter from "./routes/sales.routes.js";

const app = express();
const PORT = process.env.PORT ?? 3001;

// Permitir peticiones desde el frontend
app.use(cors());

// Leer JSON
app.use(express.json());

// Rutas
app.use("/products", productsRouter);
app.use("/movements", movementsRouter);
app.use("/sales", salesRouter);

// Health Check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
