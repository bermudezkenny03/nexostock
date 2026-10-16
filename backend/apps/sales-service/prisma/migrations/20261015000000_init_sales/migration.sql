CREATE SCHEMA IF NOT EXISTS "sales";

CREATE TYPE "sales"."sale_status" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED', 'CANCELLED');

CREATE TABLE "sales"."sales" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "status" "sales"."sale_status" NOT NULL DEFAULT 'PENDING',
    "total" DECIMAL(12,2) NOT NULL,
    "note" TEXT,
    "created_by" UUID NOT NULL,
    "idempotency_key" TEXT,
    "request_hash" TEXT,
    "failure_code" TEXT,
    "failure_reason" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sales"."sale_lines" (
    "id" UUID NOT NULL,
    "sale_id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "sku" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "line_total" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "sale_lines_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sales_business_id_idempotency_key_key" ON "sales"."sales"("business_id", "idempotency_key");
CREATE INDEX "sales_business_id_created_at_idx" ON "sales"."sales"("business_id", "created_at" DESC);
CREATE INDEX "sales_business_id_status_idx" ON "sales"."sales"("business_id", "status");
CREATE INDEX "sale_lines_sale_id_idx" ON "sales"."sale_lines"("sale_id");
CREATE INDEX "sale_lines_business_id_product_id_idx" ON "sales"."sale_lines"("business_id", "product_id");

ALTER TABLE "sales"."sale_lines"
  ADD CONSTRAINT "sale_lines_sale_id_fkey"
  FOREIGN KEY ("sale_id") REFERENCES "sales"."sales"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sales"."sales"
  ADD CONSTRAINT "sales_total_check" CHECK ("total" >= 0);
ALTER TABLE "sales"."sale_lines"
  ADD CONSTRAINT "sale_lines_quantity_check" CHECK ("quantity" > 0),
  ADD CONSTRAINT "sale_lines_unit_price_check" CHECK ("unit_price" >= 0),
  ADD CONSTRAINT "sale_lines_line_total_check" CHECK ("line_total" >= 0);
