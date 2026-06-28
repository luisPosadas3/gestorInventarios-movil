-- CreateTable
CREATE TABLE "Movement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "subtype" TEXT NOT NULL DEFAULT 'manual',
    "quantity" INTEGER NOT NULL,
    "price" REAL NOT NULL DEFAULT 0,
    "note" TEXT NOT NULL DEFAULT '',
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Movement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
