import { z } from "zod";
import { createTRPCRouter, committeeProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

const COMMITTEE_ROLES = ["CHAIRPERSON", "SECRETARY", "TREASURER", "COMMITTEE_MEMBER"] as const;

export const settingsRouter = createTRPCRouter({
  // Get full scheme details + all roles
  get: committeeProcedure
    .input(z.object({ schemeId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const scheme = await ctx.prisma.scheme.findUnique({
        where: { id: input.schemeId },
        include: {
          roles: {
            where: { termEnd: null },
            include: { user: true },
            orderBy: { termStart: "asc" },
          },
        },
      });
      if (!scheme) throw new TRPCError({ code: "NOT_FOUND" });
      return scheme;
    }),

  // Update scheme details (chairperson only)
  update: committeeProcedure
    .input(
      z.object({
        schemeId: z.string().uuid(),
        name: z.string().min(1).optional(),
        address: z.string().min(1).optional(),
        regulationModule: z.enum(["STANDARD", "ACCOMMODATION", "COMMERCIAL", "SMALL_SCHEME"]).optional(),
        lotCount: z.number().int().positive().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { schemeId, ...data } = input;
      // Only chairperson can edit scheme details
      if (ctx.userRole.role !== "CHAIRPERSON") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the chairperson can edit scheme details" });
      }
      return ctx.prisma.scheme.update({ where: { id: schemeId }, data });
    }),

  // Add a committee member (or change their role)
  addRole: committeeProcedure
    .input(
      z.object({
        schemeId: z.string().uuid(),
        email: z.string().email(),
        fullName: z.string().min(1),
        role: z.enum(COMMITTEE_ROLES),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { schemeId, email, fullName, role } = input;

      const user = await ctx.prisma.user.upsert({
        where: { email },
        update: {},
        create: { email, fullName },
      });

      // End any existing active role for this user in this scheme
      await ctx.prisma.schemeRoleRecord.updateMany({
        where: { schemeId, userId: user.id, termEnd: null },
        data: { termEnd: new Date() },
      });

      return ctx.prisma.schemeRoleRecord.create({
        data: { schemeId, userId: user.id, role, termStart: new Date() },
        include: { user: true },
      });
    }),

  // Remove a role (end term)
  removeRole: committeeProcedure
    .input(z.object({ schemeId: z.string().uuid(), roleId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const role = await ctx.prisma.schemeRoleRecord.findFirst({
        where: { id: input.roleId, schemeId: input.schemeId, termEnd: null },
      });
      if (!role) throw new TRPCError({ code: "NOT_FOUND" });
      // Prevent removing yourself if you're the last chairperson
      if (role.userId === ctx.user.id && role.role === "CHAIRPERSON") {
        const otherChairs = await ctx.prisma.schemeRoleRecord.count({
          where: { schemeId: input.schemeId, role: "CHAIRPERSON", termEnd: null, id: { not: input.roleId } },
        });
        if (otherChairs === 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot remove the only chairperson" });
        }
      }
      return ctx.prisma.schemeRoleRecord.update({
        where: { id: input.roleId },
        data: { termEnd: new Date() },
      });
    }),
});
