-- AlterTable
ALTER TABLE "packages" ADD COLUMN     "isCustom" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "isOldMember" BOOLEAN NOT NULL DEFAULT false;
