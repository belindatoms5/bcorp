import { z } from "zod";
import { createTRPCRouter, protectedProcedure, committeeProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { addDays, isBefore } from "date-fns";

// BCCM Act: levy notices must be issued at least 30 days before due date
const BCCM_MIN_NOTICE_DAYS = 30;

export const levyRouter = createTRPCRouter({
  // Create annual budget
  createBudget: committeeProcedure
    .input(
      z.object({
        schemeId: z.string().uuid(),
        financialYear: z.number().int().min(2020).max(2040),
        fundType: z.enum(["ADMIN", "SINKING"]),
        totalAmount: z.number().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { schemeId, financialYear, fundType, totalAmount } = input;
      return ctx.prisma.budget.create({
        data: { schemeId, financialYear, fundType, totalAmount },
      });
    }),

  // Issue levy notices for all lots in a scheme from a budget
  // Enforces 30-day BCCM notice period
  issueNotices: committeeProcedure
    .input(
      z.object({
        schemeId: z.string().uuid(),
        budgetId: z.string().uuid(),
        dueDate: z.date().refine(
          (d) => !isBefore(d, addDays(new Date(), BCCM_MIN_NOTICE_DAYS)),
          {
            message: `Due date must be at least ${BCCM_MIN_NOTICE_DAYS} days from today (BCCM Act requirement)`,
          }
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { schemeId, budgetId, dueDate } = input;

      const budget = await ctx.prisma.budget.findFirst({
        where: { id: budgetId, schemeId },
      });
      if (!budget) throw new TRPCError({ code: "NOT_FOUND" });

      const lots = await ctx.prisma.lot.findMany({
        where: { schemeId },
      });

      const totalEntitlement = lots.reduce(
        (sum, l) => sum + (budget.fundType === "ADMIN" ? l.entitlementAdmin : l.entitlementSinking), 0
      );

      const notices = await ctx.prisma.$transaction(
        lots.map((lot) => {
          const entitlement = budget.fundType === "ADMIN" ? lot.entitlementAdmin : lot.entitlementSinking;
          const amount = (Number(budget.totalAmount) * entitlement) / totalEntitlement;
          return ctx.prisma.levyNotice.create({
            data: {
              lotId: lot.id,
              budgetId,
              fundType: budget.fundType,
              amount,
              dueDate,
              issuedDate: new Date(),
              status: "ISSUED",
            },
          });
        })
      );

      return { count: notices.length };
    }),

  // Update an existing budget's total amount
  updateBudget: committeeProcedure
    .input(
      z.object({
        schemeId: z.string().uuid(),
        budgetId: z.string().uuid(),
        totalAmount: z.number().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { budgetId, schemeId, totalAmount } = input;
      const budget = await ctx.prisma.budget.findFirst({ where: { id: budgetId, schemeId } });
      if (!budget) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.prisma.budget.update({ where: { id: budgetId }, data: { totalAmount } });
    }),

  // Void unpaid notices for a budget and reissue at updated amounts
  reissueNotices: committeeProcedure
    .input(
      z.object({
        schemeId: z.string().uuid(),
        budgetId: z.string().uuid(),
        dueDate: z.date().refine(
          (d) => !isBefore(d, addDays(new Date(), BCCM_MIN_NOTICE_DAYS)),
          { message: `Due date must be at least ${BCCM_MIN_NOTICE_DAYS} days from today (BCCM Act requirement)` }
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { schemeId, budgetId, dueDate } = input;

      const budget = await ctx.prisma.budget.findFirst({ where: { id: budgetId, schemeId } });
      if (!budget) throw new TRPCError({ code: "NOT_FOUND" });

      const lots = await ctx.prisma.lot.findMany({ where: { schemeId } });

      const totalEntitlement = lots.reduce(
        (sum, l) => sum + (budget.fundType === "ADMIN" ? l.entitlementAdmin : l.entitlementSinking), 0
      );

      await ctx.prisma.$transaction(async (tx) => {
        // Delete unpaid notices for this budget (keep PAID ones)
        await tx.levyNotice.deleteMany({
          where: { budgetId, status: { notIn: ["PAID", "DEBT_RECOVERY"] } },
        });

        // Create fresh notices
        for (const lot of lots) {
          const entitlement = budget.fundType === "ADMIN" ? lot.entitlementAdmin : lot.entitlementSinking;
          const amount = (Number(budget.totalAmount) * entitlement) / totalEntitlement;
          await tx.levyNotice.create({
            data: { lotId: lot.id, budgetId, fundType: budget.fundType, amount, dueDate, issuedDate: new Date(), status: "ISSUED" },
          });
        }
      });

      return { count: lots.length };
    }),

  // List levy notices for a scheme (committee view)
  listForScheme: committeeProcedure
    .input(z.object({ schemeId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.levyNotice.findMany({
        where: { lot: { schemeId: input.schemeId } },
        include: {
          lot: { include: { owners: { include: { user: true } } } },
          payments: true,
          arrears: true,
        },
        orderBy: { dueDate: "asc" },
      });
    }),

  // Owner: view my levy notices
  myNotices: protectedProcedure
    .input(z.object({ schemeId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.levyNotice.findMany({
        where: {
          lot: {
            schemeId: input.schemeId,
            owners: { some: { userId: ctx.user!.id, ownershipTo: null } },
          },
        },
        include: { payments: true, budget: true },
        orderBy: { dueDate: "asc" },
      });
    }),

  // Record a payment against a levy notice
  recordPayment: committeeProcedure
    .input(
      z.object({
        schemeId: z.string().uuid(),
        levyNoticeId: z.string().uuid(),
        amount: z.number().positive(),
        paidDate: z.date(),
        method: z.enum(["BANK_TRANSFER", "BPAY", "CHEQUE", "CASH", "OTHER"]),
        reference: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { schemeId: _s, levyNoticeId, ...paymentData } = input;

      const notice = await ctx.prisma.levyNotice.findFirst({
        where: { id: levyNoticeId, lot: { schemeId: _s } },
        include: { payments: true, lot: true },
      });
      if (!notice) throw new TRPCError({ code: "NOT_FOUND" });

      const [payment] = await ctx.prisma.$transaction([
        // Record the payment
        ctx.prisma.payment.create({
          data: { levyNoticeId, ...paymentData },
        }),
        // Create matching transaction entry
        ctx.prisma.transaction.create({
          data: {
            schemeId: _s,
            fundType: notice.fundType,
            category: "LEVY_INCOME",
            amount: input.amount,
            transactionDate: input.paidDate,
            description: `Levy payment — Lot ${notice.lot.lotNumber} (${notice.fundType === "ADMIN" ? "Admin" : "Sinking"} fund)${input.reference ? ` · ${input.reference}` : ""}`,
            createdById: ctx.user!.id,
          },
        }),
      ]);

      // Recalculate status
      const totalPaid =
        notice.payments.reduce((s, p) => s + Number(p.amount), 0) + input.amount;
      const newStatus = totalPaid >= Number(notice.amount) ? "PAID" : notice.status;

      await ctx.prisma.levyNotice.update({
        where: { id: levyNoticeId },
        data: { status: newStatus },
      });

      return payment;
    }),

  // List budgets for a scheme
  listBudgets: committeeProcedure
    .input(z.object({ schemeId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.budget.findMany({
        where: { schemeId: input.schemeId },
        orderBy: [{ financialYear: "desc" }, { fundType: "asc" }],
        include: { _count: { select: { levyNotices: true } } },
      });
    }),

  // Summary for dashboard
  summary: committeeProcedure
    .input(z.object({ schemeId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [total, paid, overdue] = await Promise.all([
        ctx.prisma.levyNotice.aggregate({
          where: { lot: { schemeId: input.schemeId } },
          _sum: { amount: true },
          _count: true,
        }),
        ctx.prisma.levyNotice.aggregate({
          where: { lot: { schemeId: input.schemeId }, status: "PAID" },
          _sum: { amount: true },
          _count: true,
        }),
        ctx.prisma.levyNotice.aggregate({
          where: { lot: { schemeId: input.schemeId }, status: { in: ["OVERDUE", "DEBT_RECOVERY"] } },
          _sum: { amount: true },
          _count: true,
        }),
      ]);

      return {
        totalAmount: total._sum.amount ?? 0,
        totalCount: total._count,
        paidAmount: paid._sum.amount ?? 0,
        paidCount: paid._count,
        overdueAmount: overdue._sum.amount ?? 0,
        overdueCount: overdue._count,
      };
    }),
});
