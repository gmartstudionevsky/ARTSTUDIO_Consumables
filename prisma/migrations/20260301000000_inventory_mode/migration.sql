CREATE TYPE "InventoryMode" AS ENUM ('REGULAR', 'OPENING');

ALTER TABLE "InventorySession"
ADD COLUMN "mode" "InventoryMode" NOT NULL DEFAULT 'REGULAR';
