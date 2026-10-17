ALTER TABLE "auth"."plans" ADD COLUMN "monthly_price" DECIMAL(12,2);

ALTER TABLE "auth"."plans" ADD CONSTRAINT "plans_monthly_price_check" CHECK ("monthly_price" IS NULL OR "monthly_price" >= 0);

-- Gratis is free. Básico and Pro stay without a published price until the platform sets one.
UPDATE "auth"."plans" SET "monthly_price" = 0 WHERE "code" = 'FREE';
