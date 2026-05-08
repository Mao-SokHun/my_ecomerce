-- VET / J&T per-carrier fees and order carrier choice
ALTER TABLE "site_settings" ADD COLUMN "shippingFeeVet" DOUBLE PRECISION NOT NULL DEFAULT 2.0;
ALTER TABLE "site_settings" ADD COLUMN "shippingFeeJnt" DOUBLE PRECISION NOT NULL DEFAULT 2.0;
UPDATE "site_settings" SET "shippingFeeVet" = "shippingFee", "shippingFeeJnt" = "shippingFee";

ALTER TABLE "orders" ADD COLUMN "shippingCarrier" TEXT;
