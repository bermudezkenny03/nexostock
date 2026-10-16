CREATE SCHEMA IF NOT EXISTS "inventory";

CREATE TYPE "inventory"."movement_type" AS ENUM ('IN', 'OUT', 'ADJUSTMENT');

CREATE TABLE "inventory"."stock_items" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "min_quantity" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "stock_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inventory"."movements" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "stock_item_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "type" "inventory"."movement_type" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "stock_after" INTEGER NOT NULL,
    "reason" TEXT,
    "reference_type" TEXT,
    "reference_id" UUID,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inventory"."idempotency_records" (
    "business_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "request_hash" TEXT NOT NULL,
    "status_code" INTEGER NOT NULL,
    "response_body" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotency_records_pkey" PRIMARY KEY ("business_id", "key")
);

CREATE UNIQUE INDEX "stock_items_business_id_product_id_key" ON "inventory"."stock_items"("business_id", "product_id");
CREATE INDEX "stock_items_business_id_idx" ON "inventory"."stock_items"("business_id");
CREATE INDEX "movements_business_id_created_at_idx" ON "inventory"."movements"("business_id", "created_at" DESC);
CREATE INDEX "movements_business_id_product_id_idx" ON "inventory"."movements"("business_id", "product_id");
CREATE INDEX "movements_reference_type_reference_id_idx" ON "inventory"."movements"("reference_type", "reference_id");

ALTER TABLE "inventory"."movements"
  ADD CONSTRAINT "movements_stock_item_id_fkey"
  FOREIGN KEY ("stock_item_id") REFERENCES "inventory"."stock_items"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inventory"."stock_items"
  ADD CONSTRAINT "stock_items_quantity_check" CHECK ("quantity" >= 0),
  ADD CONSTRAINT "stock_items_min_quantity_check" CHECK ("min_quantity" >= 0);

ALTER TABLE "inventory"."movements"
  ADD CONSTRAINT "movements_quantity_check" CHECK ("quantity" > 0),
  ADD CONSTRAINT "movements_stock_after_check" CHECK ("stock_after" >= 0);
