-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'head_coach', 'coach', 'parent');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "phone" TEXT,
    "photo" TEXT,
    "bio" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "branchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branches" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "registrationFee" INTEGER NOT NULL DEFAULT 750000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_attendances" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "branchId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'hadir',
    "checkInTime" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fields" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "position" TEXT NOT NULL,
    "ageGroup" TEXT NOT NULL,
    "photo" TEXT,
    "parentName" TEXT NOT NULL,
    "parentPhone" TEXT NOT NULL,
    "parentEmail" TEXT,
    "address" TEXT NOT NULL,
    "packageId" TEXT,
    "packageStartDate" TIMESTAMP(3),
    "packageEndDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "branchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "durationMonths" INTEGER NOT NULL,
    "sessionsPerWeek" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branch_packages" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branch_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "packageId" TEXT,
    "amount" INTEGER NOT NULL,
    "registrationFee" INTEGER NOT NULL DEFAULT 0,
    "totalAmount" INTEGER NOT NULL,
    "paymentType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paymentMethod" TEXT,
    "transactionId" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendances" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "coachId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "checkInTime" TIMESTAMP(3),
    "method" TEXT NOT NULL DEFAULT 'manual',
    "notes" TEXT,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_sessions" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "ageGroup" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "branchId" TEXT,
    "fieldId" TEXT,
    "topicTitle" TEXT NOT NULL,
    "topicDescription" TEXT,
    "objective" TEXT,
    "duration" TEXT,
    "equipment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "ageGroup" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "registrationDeadline" TIMESTAMP(3),
    "location" TEXT,
    "fee" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'open',
    "branchId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_participants" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'recommended',
    "paymentStatus" TEXT NOT NULL DEFAULT 'unpaid',
    "notes" TEXT,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_resets" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "userId" TEXT,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "password_resets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessments" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "assessmentDate" TIMESTAMP(3) NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "passing" INTEGER,
    "control" INTEGER,
    "runningWithBall" INTEGER,
    "dribbling" INTEGER,
    "shooting" INTEGER,
    "longPassing" INTEGER,
    "oneVsOneAttacking" INTEGER,
    "oneVsOneDefending" INTEGER,
    "teknikAvg" DOUBLE PRECISION,
    "attackingPrinciples" INTEGER,
    "possession" INTEGER,
    "transitionAttacking" INTEGER,
    "combinationPlay" INTEGER,
    "switchingPlay" INTEGER,
    "playingOutFromBack" INTEGER,
    "finishingFinalThird" INTEGER,
    "attackingAvg" DOUBLE PRECISION,
    "defendingPrinciples" INTEGER,
    "zonalDefending" INTEGER,
    "retreatRecovery" INTEGER,
    "compactness" INTEGER,
    "transitionDefending" INTEGER,
    "defendingAvg" DOUBLE PRECISION,
    "taktikAvg" DOUBLE PRECISION,
    "maximalStrength" INTEGER,
    "aerobicCapacity" INTEGER,
    "reaction" INTEGER,
    "acceleration" INTEGER,
    "maximalSpeed" INTEGER,
    "speedEndurance" INTEGER,
    "awareness" INTEGER,
    "power" INTEGER,
    "fisikAvg" DOUBLE PRECISION,
    "selfConfidence" INTEGER,
    "decision" INTEGER,
    "leadership" INTEGER,
    "enthusiasm" INTEGER,
    "communication" INTEGER,
    "discipline" INTEGER,
    "mentalAvg" DOUBLE PRECISION,
    "overallAvg" DOUBLE PRECISION,
    "coachComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "assessmentId" TEXT,
    "pdfUrl" TEXT,
    "generatedAt" TIMESTAMP(3),
    "sentToParent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promo_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "discountPercent" INTEGER NOT NULL,
    "maxUses" INTEGER NOT NULL DEFAULT 1,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "allPackages" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promo_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promo_code_packages" (
    "id" TEXT NOT NULL,
    "promoCodeId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,

    CONSTRAINT "promo_code_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promo_code_usages" (
    "id" TEXT NOT NULL,
    "promoCodeId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promo_code_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedules" (
    "id" TEXT NOT NULL,
    "ageGroup" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "date" TIMESTAMP(3),
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "coachId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "branchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_contents" (
    "id" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "title" TEXT,
    "content" JSONB,
    "image" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cms_contents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_cards" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "qrCode" TEXT NOT NULL,
    "cardNumber" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_cards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "branches_code_key" ON "branches"("code");

-- CreateIndex
CREATE UNIQUE INDEX "staff_attendances_userId_date_key" ON "staff_attendances"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "students_studentId_key" ON "students"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "branch_packages_branchId_packageId_key" ON "branch_packages"("branchId", "packageId");

-- CreateIndex
CREATE UNIQUE INDEX "attendances_studentId_date_key" ON "attendances"("studentId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "event_participants_eventId_studentId_key" ON "event_participants"("eventId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "password_resets_token_key" ON "password_resets"("token");

-- CreateIndex
CREATE UNIQUE INDEX "assessments_studentId_month_year_key" ON "assessments"("studentId", "month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "promo_codes_code_key" ON "promo_codes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "promo_code_packages_promoCodeId_packageId_key" ON "promo_code_packages"("promoCodeId", "packageId");

-- CreateIndex
CREATE UNIQUE INDEX "promo_code_usages_promoCodeId_paymentId_key" ON "promo_code_usages"("promoCodeId", "paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "student_cards_studentId_key" ON "student_cards"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "student_cards_qrCode_key" ON "student_cards"("qrCode");

-- CreateIndex
CREATE UNIQUE INDEX "student_cards_cardNumber_key" ON "student_cards"("cardNumber");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_attendances" ADD CONSTRAINT "staff_attendances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_attendances" ADD CONSTRAINT "staff_attendances_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fields" ADD CONSTRAINT "fields_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_packages" ADD CONSTRAINT "branch_packages_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_packages" ADD CONSTRAINT "branch_packages_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_sessions" ADD CONSTRAINT "training_sessions_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_sessions" ADD CONSTRAINT "training_sessions_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_sessions" ADD CONSTRAINT "training_sessions_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "fields"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_code_packages" ADD CONSTRAINT "promo_code_packages_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES "promo_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_code_packages" ADD CONSTRAINT "promo_code_packages_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_code_usages" ADD CONSTRAINT "promo_code_usages_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES "promo_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_code_usages" ADD CONSTRAINT "promo_code_usages_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_cards" ADD CONSTRAINT "student_cards_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

