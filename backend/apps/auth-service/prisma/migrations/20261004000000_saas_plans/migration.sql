CREATE TABLE "auth"."plans" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "max_users" INTEGER,
    "max_products" INTEGER,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("code")
);

ALTER TABLE "auth"."plans" ADD CONSTRAINT "plans_code_format_check" CHECK ("code" ~ '^[A-Z0-9_]+$');
ALTER TABLE "auth"."plans" ADD CONSTRAINT "plans_max_users_check" CHECK ("max_users" IS NULL OR "max_users" > 0);
ALTER TABLE "auth"."plans" ADD CONSTRAINT "plans_max_products_check" CHECK ("max_products" IS NULL OR "max_products" > 0);

INSERT INTO "auth"."plans" ("code", "name", "description", "max_users", "max_products", "sort_order", "updated_at") VALUES
    ('FREE',  'Gratis', 'Para empezar: el dueño y un empleado.', 2, 50, 1, CURRENT_TIMESTAMP),
    ('BASIC', 'Básico', 'Para negocios pequeños con un equipo de hasta 5 personas.', 5, 500, 2, CURRENT_TIMESTAMP),
    ('PRO',   'Pro', 'Sin límites de usuarios ni de productos.', NULL, NULL, 3, CURRENT_TIMESTAMP);

ALTER TABLE "auth"."businesses" ADD COLUMN "plan_code" TEXT NOT NULL DEFAULT 'FREE';

CREATE INDEX "businesses_plan_code_idx" ON "auth"."businesses"("plan_code");

ALTER TABLE "auth"."businesses" ADD CONSTRAINT "businesses_plan_code_fkey" FOREIGN KEY ("plan_code") REFERENCES "auth"."plans"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
