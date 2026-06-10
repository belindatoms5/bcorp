import { z } from "zod";
import { createTRPCRouter, committeeProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const sinkingRouter = createTRPCRouter({
  list: committeeProcedure
    .input(z.object({ schemeId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.sinkingFundForecast.findMany({
        where: { schemeId: input.schemeId },
        orderBy: { year: "asc" },
      });
    }),

  upsert: committeeProcedure
    .input(
      z.object({
        schemeId: z.string().uuid(),
        year: z.number().int().min(2020).max(2060),
        openingBalance: z.number(),
        contributions: z.number().min(0),
        expenditure: z.number().min(0),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { schemeId, year, openingBalance, contributions, expenditure, notes } = input;
      const closingBalance = openingBalance + contributions - expenditure;

      return ctx.prisma.sinkingFundForecast.upsert({
        where: { schemeId_year: { schemeId, year } },
        update: { openingBalance, contributions, expenditure, closingBalance, notes },
        create: { schemeId, year, openingBalance, contributions, expenditure, closingBalance, notes },
      });
    }),

  delete: committeeProcedure
    .input(z.object({ schemeId: z.string().uuid(), year: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.prisma.sinkingFundForecast.findUnique({
        where: { schemeId_year: { schemeId: input.schemeId, year: input.year } },
      });
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.prisma.sinkingFundForecast.delete({
        where: { schemeId_year: { schemeId: input.schemeId, year: input.year } },
      });
      return { success: true };
    }),
});
