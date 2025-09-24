-- CreateTable
CREATE TABLE "CustomerDesign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT,
    "customerEmail" TEXT,
    "productId" TEXT NOT NULL,
    "productTitle" TEXT NOT NULL,
    "designName" TEXT,
    "decorationType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "notes" TEXT,
    "frontFileId" TEXT,
    "backFileId" TEXT,
    "leftFileId" TEXT,
    "rightFileId" TEXT,
    "transforms" TEXT,
    "quantities" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
