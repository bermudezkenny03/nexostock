CREATE TYPE "auth"."plan_request_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "auth"."plan_change_requests" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "requested_plan_code" TEXT NOT NULL,
    "status" "auth"."plan_request_status" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided_at" TIMESTAMPTZ(3),
    "decided_by_user_id" UUID,

    CONSTRAINT "plan_change_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "plan_change_requests_status_created_at_idx" ON "auth"."plan_change_requests"("status", "created_at" DESC);
CREATE INDEX "plan_change_requests_business_id_status_idx" ON "auth"."plan_change_requests"("business_id", "status");
CREATE UNIQUE INDEX "plan_change_requests_one_pending_idx" ON "auth"."plan_change_requests"("business_id") WHERE "status" = 'PENDING';

ALTER TABLE "auth"."plan_change_requests" ADD CONSTRAINT "plan_change_requests_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "auth"."businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "auth"."plan_change_requests" ADD CONSTRAINT "plan_change_requests_requested_plan_code_fkey" FOREIGN KEY ("requested_plan_code") REFERENCES "auth"."plans"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "auth"."plan_change_requests" ADD CONSTRAINT "plan_change_requests_decided_by_user_id_fkey" FOREIGN KEY ("decided_by_user_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
