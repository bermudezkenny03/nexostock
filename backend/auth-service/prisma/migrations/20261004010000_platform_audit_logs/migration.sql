CREATE TYPE "auth"."platform_action" AS ENUM ('BUSINESS_ACTIVATED', 'BUSINESS_DEACTIVATED', 'PLAN_CHANGED', 'OWNER_PASSWORD_RESET');

CREATE TABLE "auth"."platform_audit_logs" (
    "id" UUID NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "action" "auth"."platform_action" NOT NULL,
    "target_user_id" UUID,
    "details" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_audit_logs_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "auth"."platform_audit_logs" ADD CONSTRAINT "platform_audit_logs_target_check" CHECK ("action" <> 'OWNER_PASSWORD_RESET' OR "target_user_id" IS NOT NULL);

CREATE INDEX "platform_audit_logs_business_id_created_at_idx" ON "auth"."platform_audit_logs"("business_id", "created_at" DESC);

CREATE INDEX "platform_audit_logs_created_at_idx" ON "auth"."platform_audit_logs"("created_at" DESC);

ALTER TABLE "auth"."platform_audit_logs" ADD CONSTRAINT "platform_audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "auth"."platform_audit_logs" ADD CONSTRAINT "platform_audit_logs_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "auth"."businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "auth"."platform_audit_logs" ADD CONSTRAINT "platform_audit_logs_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
