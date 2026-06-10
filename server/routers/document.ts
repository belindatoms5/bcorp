import { z } from "zod";
import { createTRPCRouter, protectedProcedure, committeeProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

const CATEGORIES = ["MINUTES", "FINANCIAL", "INSURANCE", "BYLAW", "CMS", "CORRESPONDENCE", "OTHER"] as const;

export const documentRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ schemeId: z.string().uuid(), category: z.enum(CATEGORIES).optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.document.findMany({
        where: { schemeId: input.schemeId, ...(input.category ? { category: input.category } : {}) },
        include: { uploadedBy: true },
        orderBy: { createdAt: "desc" },
      });
    }),

  create: committeeProcedure
    .input(
      z.object({
        schemeId: z.string().uuid(),
        title: z.string().min(1),
        category: z.enum(CATEGORIES),
        fileUrl: z.string().url(),
        fileSize: z.number().int().positive().optional(),
        mimeType: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.document.create({
        data: { ...input, uploadedById: ctx.user!.id },
      });
    }),

  delete: committeeProcedure
    .input(z.object({ schemeId: z.string().uuid(), documentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const doc = await ctx.prisma.document.findFirst({
        where: { id: input.documentId, schemeId: input.schemeId },
      });
      if (!doc) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.prisma.document.delete({ where: { id: input.documentId } });
      return { success: true };
    }),
});
