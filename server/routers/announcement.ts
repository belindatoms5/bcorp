import { z } from "zod";
import { createTRPCRouter, protectedProcedure, committeeProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const announcementRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ schemeId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.announcement.findMany({
        where: { schemeId: input.schemeId },
        include: { author: true },
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      });
    }),

  create: committeeProcedure
    .input(
      z.object({
        schemeId: z.string().uuid(),
        title: z.string().min(1),
        body: z.string().min(1),
        isPinned: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.announcement.create({
        data: { ...input, authorId: ctx.user!.id },
      });
    }),

  togglePin: committeeProcedure
    .input(z.object({ schemeId: z.string().uuid(), announcementId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const a = await ctx.prisma.announcement.findFirst({
        where: { id: input.announcementId, schemeId: input.schemeId },
      });
      if (!a) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.prisma.announcement.update({
        where: { id: input.announcementId },
        data: { isPinned: !a.isPinned },
      });
    }),

  delete: committeeProcedure
    .input(z.object({ schemeId: z.string().uuid(), announcementId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const a = await ctx.prisma.announcement.findFirst({
        where: { id: input.announcementId, schemeId: input.schemeId },
      });
      if (!a) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.prisma.announcement.delete({ where: { id: input.announcementId } });
      return { success: true };
    }),
});
