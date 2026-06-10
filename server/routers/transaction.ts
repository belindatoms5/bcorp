import { z } from "zod";
import { createTRPCRouter, committeeProcedure } from "../trpc";

const CATEGORIES = [
  "LEVY_INCOME",
  "INSURANCE",
  "UTILITIES",
  "REPAIRS",
  "MANAGEMENT",
  "LEGAL",
  "ACCOUNTING",
  "LANDSCAPING",
  "CLEANING",
  "CAPITAL_WORKS",
  "OTHER",
] as const;

export const transactionRouter = createTRPCRouter({
  list: committeeProcedure
    .input(
      z.object({
        schemeId: z.string().uuid(),
        fundType: z.enum(["ADMIN", "SINKING"]).optional(),
        year: z.number().int().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { schemeId, fundType, year } = input;
      return ctx.prisma.transaction.findMany({
        where: {
          schemeId,
          ...(fundType ? { fundType } : {}),
          ...(year
            ? {
                transactionDate: {
                  gte: new Date(`${year}-01-01`),
                  lt: new Date(`${year + 1}-01-01`),
                },
              }
            : {}),
        },
        include: { createdBy: true },
        orderBy: { transactionDate: "desc" },
      });
    }),

  summary: committeeProcedure
    .input(z.object({ schemeId: z.string().uuid(), fundType: z.enum(["ADMIN", "SINKING"]).optional() }))
    .query(async ({ ctx, input }) => {
      const where = { schemeId: input.schemeId, ...(input.fundType ? { fundType: input.fundType } : {}) };
      const [income, expenses] = await Promise.all([
        ctx.prisma.transaction.aggregate({
          where: { ...where, amount: { gt: 0 } },
          _sum: { amount: true },
          _count: true,
        }),
        ctx.prisma.transaction.aggregate({
          where: { ...where, amount: { lt: 0 } },
          _sum: { amount: true },
          _count: true,
        }),
      ]);
      return {
        income: Number(income._sum.amount ?? 0),
        incomeCount: income._count,
        expenses: Math.abs(Number(expenses._sum.amount ?? 0)),
        expensesCount: expenses._count,
        balance: Number(income._sum.amount ?? 0) + Number(expenses._sum.amount ?? 0),
      };
    }),

  create: committeeProcedure
    .input(
      z.object({
        schemeId: z.string().uuid(),
        fundType: z.enum(["ADMIN", "SINKING"]),
        category: z.enum(CATEGORIES),
        amount: z.number().refine((n) => n !== 0, "Amount cannot be zero"),
        transactionDate: z.date(),
        description: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.transaction.create({
        data: { ...input, createdById: ctx.user!.id },
      });
    }),

  delete: committeeProcedure
    .input(z.object({ schemeId: z.string().uuid(), transactionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.transaction.deleteMany({
        where: { id: input.transactionId, schemeId: input.schemeId },
      });
      return { success: true };
    }),
});
