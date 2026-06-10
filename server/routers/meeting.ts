import { z } from "zod";
import { createTRPCRouter, protectedProcedure, committeeProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { addDays, isBefore } from "date-fns";

// BCCM Act: AGM/EGM = 21 days notice, committee meetings = 7 days
const NOTICE_DAYS: Record<string, number> = {
  AGM: 21,
  EGM: 21,
  COMMITTEE: 7,
};

export const meetingRouter = createTRPCRouter({
  create: committeeProcedure
    .input(
      z.object({
        schemeId: z.string().uuid(),
        meetingType: z.enum(["AGM", "EGM", "COMMITTEE"]),
        scheduledAt: z.date(),
        location: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { meetingType, scheduledAt } = input;
      const minNoticeDays = NOTICE_DAYS[meetingType];
      const earliestDate = addDays(new Date(), minNoticeDays);

      if (isBefore(scheduledAt, earliestDate)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `${meetingType} requires at least ${minNoticeDays} days notice under the BCCM Act. Earliest date: ${earliestDate.toDateString()}`,
        });
      }

      return ctx.prisma.meeting.create({ data: input });
    }),

  list: protectedProcedure
    .input(z.object({ schemeId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.meeting.findMany({
        where: { schemeId: input.schemeId },
        include: { _count: { select: { motions: true } } },
        orderBy: { scheduledAt: "desc" },
      });
    }),

  get: protectedProcedure
    .input(z.object({ meetingId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const meeting = await ctx.prisma.meeting.findUnique({
        where: { id: input.meetingId },
        include: {
          motions: {
            include: { votes: { include: { lotOwner: { include: { user: true } } } } },
            orderBy: { orderIndex: "asc" },
          },
        },
      });
      if (!meeting) throw new TRPCError({ code: "NOT_FOUND" });
      return meeting;
    }),

  addMotion: committeeProcedure
    .input(
      z.object({
        schemeId: z.string().uuid(),
        meetingId: z.string().uuid(),
        title: z.string().min(1),
        description: z.string().optional(),
        resolutionType: z.enum(["ORDINARY", "SPECIAL", "MAJORITY"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { meetingId, schemeId: _schemeId, ...data } = input;
      const count = await ctx.prisma.motion.count({ where: { meetingId } });
      return ctx.prisma.motion.create({
        data: { ...data, meetingId, orderIndex: count + 1 },
      });
    }),

  castVote: protectedProcedure
    .input(
      z.object({
        motionId: z.string().uuid(),
        lotOwnerId: z.string().uuid(),
        voteValue: z.enum(["FOR", "AGAINST", "ABSTAIN"]),
        isProxy: z.boolean().default(false),
        proxyForId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify the voter owns this lot ownership record
      const lotOwner = await ctx.prisma.lotOwner.findFirst({
        where: { id: input.lotOwnerId, userId: ctx.user!.id },
      });
      if (!lotOwner) throw new TRPCError({ code: "FORBIDDEN" });

      const vote = await ctx.prisma.vote.upsert({
        where: { motionId_lotOwnerId: { motionId: input.motionId, lotOwnerId: input.lotOwnerId } },
        update: { voteValue: input.voteValue },
        create: { ...input, castById: ctx.user!.id },
      });

      // Recalculate vote tallies
      const allVotes = await ctx.prisma.vote.findMany({
        where: { motionId: input.motionId },
      });

      await ctx.prisma.motion.update({
        where: { id: input.motionId },
        data: {
          votesFor: allVotes.filter((v) => v.voteValue === "FOR").length,
          votesAgainst: allVotes.filter((v) => v.voteValue === "AGAINST").length,
          votesAbstain: allVotes.filter((v) => v.voteValue === "ABSTAIN").length,
        },
      });

      return vote;
    }),
});
