CREATE SCHEMA IF NOT EXISTS "auth";

CREATE TABLE "auth"."businesses" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "legal_name" TEXT,
    "tax_id" TEXT,
    "primary_color" TEXT,
    "logo_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "businesses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "auth"."modules" (
    "id" UUID NOT NULL,
    "parent_id" UUID,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "route" TEXT,
    "icon" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "modules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "auth"."permissions" (
    "id" UUID NOT NULL,
    "module_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "auth"."roles" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "auth"."role_permissions" (
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

CREATE TABLE "auth"."users" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "auth"."refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "auth"."user_details" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "user_details_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "auth"."user_roles" (
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "business_id" UUID NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id")
);

CREATE UNIQUE INDEX "modules_code_key" ON "auth"."modules"("code");

CREATE INDEX "modules_parent_id_idx" ON "auth"."modules"("parent_id");

CREATE UNIQUE INDEX "permissions_code_key" ON "auth"."permissions"("code");

CREATE INDEX "permissions_module_id_idx" ON "auth"."permissions"("module_id");

CREATE UNIQUE INDEX "roles_business_id_code_key" ON "auth"."roles"("business_id", "code");

CREATE UNIQUE INDEX "roles_id_business_id_key" ON "auth"."roles"("id", "business_id");

CREATE INDEX "role_permissions_permission_id_idx" ON "auth"."role_permissions"("permission_id");

CREATE UNIQUE INDEX "users_email_key" ON "auth"."users"("email");

CREATE INDEX "users_business_id_idx" ON "auth"."users"("business_id");

CREATE UNIQUE INDEX "users_id_business_id_key" ON "auth"."users"("id", "business_id");

CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "auth"."refresh_tokens"("token_hash");

CREATE INDEX "refresh_tokens_user_id_idx" ON "auth"."refresh_tokens"("user_id");

CREATE INDEX "refresh_tokens_expires_at_idx" ON "auth"."refresh_tokens"("expires_at");

CREATE UNIQUE INDEX "user_details_user_id_key" ON "auth"."user_details"("user_id");

CREATE INDEX "user_roles_role_id_business_id_idx" ON "auth"."user_roles"("role_id", "business_id");

CREATE UNIQUE INDEX "user_roles_user_id_business_id_key" ON "auth"."user_roles"("user_id", "business_id");

ALTER TABLE "auth"."modules" ADD CONSTRAINT "modules_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "auth"."modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "auth"."permissions" ADD CONSTRAINT "permissions_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "auth"."modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "auth"."roles" ADD CONSTRAINT "roles_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "auth"."businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "auth"."role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "auth"."roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "auth"."role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "auth"."permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "auth"."users" ADD CONSTRAINT "users_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "auth"."businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "auth"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "auth"."user_details" ADD CONSTRAINT "user_details_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "auth"."user_roles" ADD CONSTRAINT "user_roles_user_id_business_id_fkey" FOREIGN KEY ("user_id", "business_id") REFERENCES "auth"."users"("id", "business_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "auth"."user_roles" ADD CONSTRAINT "user_roles_role_id_business_id_fkey" FOREIGN KEY ("role_id", "business_id") REFERENCES "auth"."roles"("id", "business_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "auth"."users" ADD CONSTRAINT "users_email_lowercase_check" CHECK ("email" = lower("email"));

ALTER TABLE "auth"."businesses" ADD CONSTRAINT "businesses_name_not_blank_check" CHECK (length(btrim("name")) > 0);

ALTER TABLE "auth"."businesses" ADD CONSTRAINT "businesses_primary_color_check" CHECK ("primary_color" IS NULL OR "primary_color" ~ '^#[0-9A-F]{6}$');

ALTER TABLE "auth"."roles" ADD CONSTRAINT "roles_code_format_check" CHECK ("code" ~ '^[A-Z0-9_]+$');

ALTER TABLE "auth"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_expiry_check" CHECK ("expires_at" > "created_at");
