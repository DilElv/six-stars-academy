/*
  Warnings:

  - You are about to drop the column `promoCode` on the `pending_registrations` table. All the data in the column will be lost.
  - You are about to drop the `promo_code_packages` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `promo_code_usages` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `promo_codes` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "promo_code_packages" DROP CONSTRAINT "promo_code_packages_packageId_fkey";

-- DropForeignKey
ALTER TABLE "promo_code_packages" DROP CONSTRAINT "promo_code_packages_promoCodeId_fkey";

-- DropForeignKey
ALTER TABLE "promo_code_usages" DROP CONSTRAINT "promo_code_usages_paymentId_fkey";

-- DropForeignKey
ALTER TABLE "promo_code_usages" DROP CONSTRAINT "promo_code_usages_promoCodeId_fkey";

-- AlterTable
ALTER TABLE "pending_registrations" DROP COLUMN "promoCode";

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "registrationScholarshipPercent" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sppScholarshipPercent" INTEGER NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "promo_code_packages";

-- DropTable
DROP TABLE "promo_code_usages";

-- DropTable
DROP TABLE "promo_codes";
