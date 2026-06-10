import { z } from "zod";
import { createTRPCRouter, protectedProcedure, committeeProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { addDays } from "date-fns";

// BCCM Act: Form 1 response period is 14 days
const FORM1_RESPONSE_DAYS = 14;

export const breachRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ schemeId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.breachNotice.findMany({
        where: { schemeId: input.schemeId },
        include: { reportedBy: true, accusedLot: true },
        orderBy: { createdAt: "desc" },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        schemeId: z.string().uuid(),
        accusedLotId: z.string().uuid(),
        bylawReference: z.string().min(1),
        description: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.breachNotice.create({
        data: { ...input, reportedById: ctx.user!.id },
      });
    }),

  issueForm1: committeeProcedure
    .input(z.object({ schemeId: z.string().uuid(), breachId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const breach = await ctx.prisma.breachNotice.findFirst({
        where: { id: input.breachId, schemeId: input.schemeId },
      });
      if (!breach) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.prisma.breachNotice.update({
        where: { id: input.breachId },
        data: {
          status: "FORM_1_ISSUED",
          form1IssuedAt: new Date(),
          responseDeadline: addDays(new Date(), FORM1_RESPONSE_DAYS),
        },
      });
    }),

  updateStatus: committeeProcedure
    .input(
      z.object({
        schemeId: z.string().uuid(),
        breachId: z.string().uuid(),
        status: z.enum(["REPORTED", "FORM_1_ISSUED", "RESPONSE_PENDING", "RESOLVED", "ESCALATED_TO_BCCM"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const breach = await ctx.prisma.breachNotice.findFirst({
        where: { id: input.breachId, schemeId: input.schemeId },
      });
      if (!breach) throw new TRPCError({ code: "NOT_FOUND" });

      const extra: Record<string, Date> = {};
      if (input.status === "RESOLVED") extra.resolvedAt = new Date();
      if (input.status === "ESCALATED_TO_BCCM") extra.escalatedAt = new Date();

      return ctx.prisma.breachNotice.update({
        where: { id: input.breachId },
        data: { status: input.status, ...extra },
      });
    }),
});
