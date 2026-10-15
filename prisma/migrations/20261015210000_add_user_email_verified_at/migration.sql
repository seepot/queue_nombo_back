-- AlterTable: medan pengesahan e-mel pengguna (null = belum disahkan)
ALTER TABLE "users" ADD COLUMN "email_verified_at" TIMESTAMP(3);

-- Akaun sedia ada dicipta sebelum aliran pengesahan e-mel wujud; anggap sebagai telah disahkan
-- supaya pentadbir tenant sedia ada tidak disekat daripada tindakan bil.
UPDATE "users" SET "email_verified_at" = "created_at" WHERE "email_verified_at" IS NULL;
