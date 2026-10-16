CREATE SCHEMA IF NOT EXISTS "products";

CREATE TABLE "products"."categories" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "products"."products" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "category_id" UUID,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "categories_id_business_id_key" ON "products"."categories"("id", "business_id");
CREATE UNIQUE INDEX "categories_business_id_name_key" ON "products"."categories"("business_id", "name");
CREATE INDEX "categories_business_id_idx" ON "products"."categories"("business_id");

CREATE UNIQUE INDEX "products_business_id_sku_key" ON "products"."products"("business_id", "sku");
CREATE INDEX "products_business_id_is_active_idx" ON "products"."products"("business_id", "is_active");
CREATE INDEX "products_category_id_idx" ON "products"."products"("category_id");

ALTER TABLE "products"."products"
  ADD CONSTRAINT "products_category_id_business_id_fkey"
  FOREIGN KEY ("category_id", "business_id")
  REFERENCES "products"."categories"("id", "business_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "products"."products"
  ADD CONSTRAINT "products_price_check" CHECK ("price" >= 0);
ALTER TABLE "products"."categories"
  ADD CONSTRAINT "categories_name_check" CHECK (char_length(btrim("name")) > 0);
ALTER TABLE "products"."products"
  ADD CONSTRAINT "products_sku_check" CHECK (char_length(btrim("sku")) > 0);
