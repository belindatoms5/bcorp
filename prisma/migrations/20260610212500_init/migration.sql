-- CreateEnum
CREATE TYPE "SchemeRole" AS ENUM ('CHAIRPERSON', 'SECRETARY', 'TREASURER', 'COMMITTEE_MEMBER', 'OWNER', 'CONTRACTOR');

-- CreateEnum
CREATE TYPE "FundType" AS ENUM ('ADMIN', 'SINKING');

-- CreateEnum
CREATE TYPE "ResolutionType" AS ENUM ('ORDINARY', 'SPECIAL', 'MAJORITY');

-- CreateEnum
CREATE TYPE "MeetingType" AS ENUM ('AGM', 'EGM', 'COMMITTEE');

-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('SCHEDULED', 'NOTICE_ISSUED', 'HELD', 'MINUTES_DRAFT', 'MINUTES_APPROVED');

-- CreateEnum
CREATE TYPE "MotionOutcome" AS ENUM ('PASSED', 'FAILED', 'WITHDRAWN', 'DEFERRED');

-- CreateEnum
CREATE TYPE "LevyStatus" AS ENUM ('DRAFT', 'ISSUED', 'PAID', 'OVERDUE', 'DEBT_RECOVERY');

-- CreateEnum
CREATE TYPE "MaintenanceAreaType" AS ENUM ('COMMON_PROPERTY', 'LOT_OWNER');

-- CreateEnum
CREATE TYPE "MaintenanceStatus" AS ENUM ('OPEN', 'CLASSIFIED', 'QUOTE_REQUESTED', 'WORK_ORDERED', 'COMPLETED', 'CLOSED');

-- CreateEnum
CREATE TYPE "WorkOrderStatus" AS ENUM ('PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'INVOICED', 'PAID');

-- CreateEnum
CREATE TYPE "BreachStatus" AS ENUM ('REPORTED', 'FORM_1_ISSUED', 'RESPONSE_PENDING', 'RESOLVED', 'ESCALATED_TO_BCCM');

-- CreateEnum
CREATE TYPE "VoteValue" AS ENUM ('FOR', 'AGAINST', 'ABSTAIN');

-- CreateTable
CREATE TABLE "schemes" (
    "id" TEXT NOT NULL,
    "cts_number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "regulation_module" TEXT NOT NULL DEFAULT 'STANDARD',
    "lot_count" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schemes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lots" (
    "id" TEXT NOT NULL,
    "scheme_id" TEXT NOT NULL,
    "lot_number" TEXT NOT NULL,
    "entitlement_admin" INTEGER NOT NULL,
    "entitlement_sinking" INTEGER NOT NULL,
    "address" TEXT NOT NULL,

    CONSTRAINT "lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT,
    "avatar_url" TEXT,
    "last_login" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lot_owners" (
    "id" TEXT NOT NULL,
    "lot_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "ownership_from" TIMESTAMP(3) NOT NULL,
    "ownership_to" TIMESTAMP(3),
    "is_occupier" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "lot_owners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheme_roles" (
    "id" TEXT NOT NULL,
    "scheme_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "SchemeRole" NOT NULL,
    "term_start" TIMESTAMP(3) NOT NULL,
    "term_end" TIMESTAMP(3),

    CONSTRAINT "scheme_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgets" (
    "id" TEXT NOT NULL,
    "scheme_id" TEXT NOT NULL,
    "financial_year" INTEGER NOT NULL,
    "fund_type" "FundType" NOT NULL,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "approved_at_meeting" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "levy_notices" (
    "id" TEXT NOT NULL,
    "lot_id" TEXT NOT NULL,
    "budget_id" TEXT NOT NULL,
    "fund_type" "FundType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "issued_date" TIMESTAMP(3) NOT NULL,
    "status" "LevyStatus" NOT NULL DEFAULT 'DRAFT',
    "pdf_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "levy_notices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "levy_notice_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paid_date" TIMESTAMP(3) NOT NULL,
    "method" TEXT NOT NULL,
    "stripe_ref" TEXT,
    "reference" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "arrears" (
    "id" TEXT NOT NULL,
    "levy_notice_id" TEXT NOT NULL,
    "principal_owing" DECIMAL(12,2) NOT NULL,
    "interest_accrued" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "LevyStatus" NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "arrears_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sinking_fund_forecasts" (
    "id" TEXT NOT NULL,
    "scheme_id" TEXT NOT NULL,
    "budget_id" TEXT,
    "year" INTEGER NOT NULL,
    "opening_balance" DECIMAL(12,2) NOT NULL,
    "contributions" DECIMAL(12,2) NOT NULL,
    "expenditure" DECIMAL(12,2) NOT NULL,
    "closing_balance" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "sinking_fund_forecasts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "scheme_id" TEXT NOT NULL,
    "fund_type" "FundType" NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "transaction_date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meetings" (
    "id" TEXT NOT NULL,
    "scheme_id" TEXT NOT NULL,
    "meeting_type" "MeetingType" NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "notice_issued_date" TIMESTAMP(3),
    "location" TEXT,
    "status" "MeetingStatus" NOT NULL DEFAULT 'SCHEDULED',
    "minutes_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "motions" (
    "id" TEXT NOT NULL,
    "meeting_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "resolution_type" "ResolutionType" NOT NULL,
    "votes_for" INTEGER NOT NULL DEFAULT 0,
    "votes_against" INTEGER NOT NULL DEFAULT 0,
    "votes_abstain" INTEGER NOT NULL DEFAULT 0,
    "outcome" "MotionOutcome",
    "order_index" INTEGER NOT NULL,

    CONSTRAINT "motions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "votes" (
    "id" TEXT NOT NULL,
    "motion_id" TEXT NOT NULL,
    "lot_owner_id" TEXT NOT NULL,
    "vote_value" "VoteValue" NOT NULL,
    "is_proxy" BOOLEAN NOT NULL DEFAULT false,
    "proxy_for_id" TEXT,
    "cast_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cast_by_id" TEXT NOT NULL,

    CONSTRAINT "votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_requests" (
    "id" TEXT NOT NULL,
    "scheme_id" TEXT NOT NULL,
    "reported_by_id" TEXT NOT NULL,
    "area_type" "MaintenanceAreaType",
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "photo_urls" TEXT[],
    "status" "MaintenanceStatus" NOT NULL DEFAULT 'OPEN',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_orders" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "contractor_id" TEXT NOT NULL,
    "quoted_amount" DECIMAL(12,2),
    "final_amount" DECIMAL(12,2),
    "invoice_url" TEXT,
    "status" "WorkOrderStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "breach_notices" (
    "id" TEXT NOT NULL,
    "scheme_id" TEXT NOT NULL,
    "reported_by_id" TEXT NOT NULL,
    "accused_lot_id" TEXT NOT NULL,
    "bylaw_reference" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "BreachStatus" NOT NULL DEFAULT 'REPORTED',
    "form_1_issued_at" TIMESTAMP(3),
    "response_deadline" TIMESTAMP(3),
    "resolved_at" TIMESTAMP(3),
    "escalated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "breach_notices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "scheme_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_size" INTEGER,
    "mime_type" TEXT,
    "uploaded_by_id" TEXT NOT NULL,
    "breach_notice_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" TEXT NOT NULL,
    "scheme_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "schemes_cts_number_key" ON "schemes"("cts_number");

-- CreateIndex
CREATE UNIQUE INDEX "lots_scheme_id_lot_number_key" ON "lots"("scheme_id", "lot_number");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "budgets_scheme_id_financial_year_fund_type_key" ON "budgets"("scheme_id", "financial_year", "fund_type");

-- CreateIndex
CREATE UNIQUE INDEX "arrears_levy_notice_id_key" ON "arrears"("levy_notice_id");

-- CreateIndex
CREATE UNIQUE INDEX "sinking_fund_forecasts_scheme_id_year_key" ON "sinking_fund_forecasts"("scheme_id", "year");

-- CreateIndex
CREATE UNIQUE INDEX "votes_motion_id_lot_owner_id_key" ON "votes"("motion_id", "lot_owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "work_orders_request_id_key" ON "work_orders"("request_id");

-- AddForeignKey
ALTER TABLE "lots" ADD CONSTRAINT "lots_scheme_id_fkey" FOREIGN KEY ("scheme_id") REFERENCES "schemes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lot_owners" ADD CONSTRAINT "lot_owners_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "lots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lot_owners" ADD CONSTRAINT "lot_owners_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheme_roles" ADD CONSTRAINT "scheme_roles_scheme_id_fkey" FOREIGN KEY ("scheme_id") REFERENCES "schemes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheme_roles" ADD CONSTRAINT "scheme_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_scheme_id_fkey" FOREIGN KEY ("scheme_id") REFERENCES "schemes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "levy_notices" ADD CONSTRAINT "levy_notices_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "lots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "levy_notices" ADD CONSTRAINT "levy_notices_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_levy_notice_id_fkey" FOREIGN KEY ("levy_notice_id") REFERENCES "levy_notices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arrears" ADD CONSTRAINT "arrears_levy_notice_id_fkey" FOREIGN KEY ("levy_notice_id") REFERENCES "levy_notices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sinking_fund_forecasts" ADD CONSTRAINT "sinking_fund_forecasts_scheme_id_fkey" FOREIGN KEY ("scheme_id") REFERENCES "schemes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sinking_fund_forecasts" ADD CONSTRAINT "sinking_fund_forecasts_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "budgets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_scheme_id_fkey" FOREIGN KEY ("scheme_id") REFERENCES "schemes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_scheme_id_fkey" FOREIGN KEY ("scheme_id") REFERENCES "schemes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "motions" ADD CONSTRAINT "motions_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_motion_id_fkey" FOREIGN KEY ("motion_id") REFERENCES "motions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_lot_owner_id_fkey" FOREIGN KEY ("lot_owner_id") REFERENCES "lot_owners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_proxy_for_id_fkey" FOREIGN KEY ("proxy_for_id") REFERENCES "lot_owners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_cast_by_id_fkey" FOREIGN KEY ("cast_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_scheme_id_fkey" FOREIGN KEY ("scheme_id") REFERENCES "schemes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_reported_by_id_fkey" FOREIGN KEY ("reported_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "maintenance_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_contractor_id_fkey" FOREIGN KEY ("contractor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "breach_notices" ADD CONSTRAINT "breach_notices_scheme_id_fkey" FOREIGN KEY ("scheme_id") REFERENCES "schemes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "breach_notices" ADD CONSTRAINT "breach_notices_reported_by_id_fkey" FOREIGN KEY ("reported_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "breach_notices" ADD CONSTRAINT "breach_notices_accused_lot_id_fkey" FOREIGN KEY ("accused_lot_id") REFERENCES "lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_scheme_id_fkey" FOREIGN KEY ("scheme_id") REFERENCES "schemes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_breach_notice_id_fkey" FOREIGN KEY ("breach_notice_id") REFERENCES "breach_notices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_scheme_id_fkey" FOREIGN KEY ("scheme_id") REFERENCES "schemes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
