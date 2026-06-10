import { z } from "zod";
import { createTRPCRouter, protectedProcedure, committeeProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const schemeRouter = createTRPCRouter({
  // Create a new body corporate scheme
  create: protectedProcedure
    .input(
      z.object({
        ctsNumber: z.string().min(1),
        name: z.string().min(1),
        address: z.string().min(1),
        lotCount: z.number().int().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const scheme = await ctx.prisma.scheme.create({
        data: {
          ...input,
          roles: {
            create: {
              userId: ctx.user!.id,
              role: "CHAIRPERSON",
              termStart: new Date(),
            },
          },
        },
      });
      return scheme;
    }),

  // Get all schemes the current user belongs to
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.scheme.findMany({
      where: {
        roles: { some: { userId: ctx.user!.id, termEnd: null } },
      },
      include: { _count: { select: { lots: true } } },
    });
  }),

  // Get a single scheme (must be a member)
  get: protectedProcedure
    .input(z.object({ schemeId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const scheme = await ctx.prisma.scheme.findFirst({
        where: {
          id: input.schemeId,
          roles: { some: { userId: ctx.user!.id, termEnd: null } },
        },
        include: {
          lots: { include: { owners: { include: { user: true } } } },
          roles: { include: { user: true }, where: { termEnd: null } },
        },
      });
      if (!scheme) throw new TRPCError({ code: "NOT_FOUND" });
      return scheme;
    }),

  // Add a lot to the scheme
  addLot: committeeProcedure
    .input(
      z.object({
        schemeId: z.string().uuid(),
        lotNumber: z.string().min(1),
        entitlementAdmin: z.number().int().positive(),
        entitlementSinking: z.number().int().positive(),
        address: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { schemeId, ...data } = input;
      return ctx.prisma.lot.create({ data: { schemeId, ...data } });
    }),

  // Update a lot's details
  updateLot: committeeProcedure
    .input(
      z.object({
        schemeId: z.string().uuid(),
        lotId: z.string().uuid(),
        lotNumber: z.string().min(1),
        address: z.string().min(1),
        entitlementAdmin: z.number().int().positive(),
        entitlementSinking: z.number().int().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { lotId, schemeId: _schemeId, ...data } = input;
      return ctx.prisma.lot.update({ where: { id: lotId }, data });
    }),

  // Invite an owner to a lot
  inviteOwner: committeeProcedure
    .input(
      z.object({
        schemeId: z.string().uuid(),
        lotId: z.string().uuid(),
        email: z.string().email(),
        fullName: z.string().min(1),
        ownershipFrom: z.date(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { schemeId, lotId, email, fullName, ownershipFrom } = input;

      // Upsert user
      const user = await ctx.prisma.user.upsert({
        where: { email },
        update: {},
        create: { email, fullName },
      });

      // Create lot ownership
      const lotOwner = await ctx.prisma.lotOwner.create({
        data: { lotId, userId: user.id, ownershipFrom },
      });

      // Ensure scheme role exists
      await ctx.prisma.schemeRoleRecord.upsert({
        where: {
          // compound unique doesn't exist so findFirst + create
          id: "placeholder",
        },
        update: {},
        create: {
          schemeId,
          userId: user.id,
          role: "OWNER",
          termStart: ownershipFrom,
        },
      }).catch(async () => {
        const existing = await ctx.prisma.schemeRoleRecord.findFirst({
          where: { schemeId, userId: user.id, termEnd: null },
        });
        if (!existing) {
          await ctx.prisma.schemeRoleRecord.create({
            data: { schemeId, userId: user.id, role: "OWNER", termStart: ownershipFrom },
          });
        }
      });

      return lotOwner;
    }),
});
