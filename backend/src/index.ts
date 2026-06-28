import express from "express";
import productsRouter from "./routes/products.routes.js";

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(express.json());
app.use("/products", productsRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
