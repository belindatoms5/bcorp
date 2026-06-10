import { z } from "zod";
import { createTRPCRouter, protectedProcedure, committeeProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const maintenanceRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        schemeId: z.string().uuid(),
        title: z.string().min(1),
        description: z.string().min(1),
        photoUrls: z.array(z.string().url()).default([]),
        priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.maintenanceRequest.create({
        data: { ...input, reportedById: ctx.user!.id },
      });
    }),

  classify: committeeProcedure
    .input(
      z.object({
        schemeId: z.string().uuid(),
        requestId: z.string().uuid(),
        areaType: z.enum(["COMMON_PROPERTY", "LOT_OWNER"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.maintenanceRequest.update({
        where: { id: input.requestId },
        data: { areaType: input.areaType, status: "CLASSIFIED" },
      });
    }),

  createWorkOrder: committeeProcedure
    .input(
      z.object({
        schemeId: z.string().uuid(),
        requestId: z.string().uuid(),
        contractorId: z.string().uuid(),
        quotedAmount: z.number().positive().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { schemeId: _s, requestId, ...data } = input;
      const [workOrder] = await ctx.prisma.$transaction([
        ctx.prisma.workOrder.create({ data: { requestId, ...data } }),
        ctx.prisma.maintenanceRequest.update({
          where: { id: requestId },
          data: { status: "WORK_ORDERED" },
        }),
      ]);
      return workOrder;
    }),

  updateWorkOrder: committeeProcedure
    .input(
      z.object({
        schemeId: z.string().uuid(),
        workOrderId: z.string().uuid(),
        status: z.enum(["PENDING", "ACCEPTED", "IN_PROGRESS", "COMPLETED", "INVOICED", "PAID"]),
        finalAmount: z.number().positive().optional(),
        invoiceUrl: z.string().url().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { schemeId: _s, workOrderId, ...data } = input;
      const extra: Record<string, unknown> = {};
      if (data.status === "COMPLETED") extra.completedAt = new Date();

      const wo = await ctx.prisma.workOrder.update({
        where: { id: workOrderId },
        data: { ...data, ...extra },
      });

      if (data.status === "COMPLETED") {
        await ctx.prisma.maintenanceRequest.update({
          where: { id: wo.requestId },
          data: { status: "COMPLETED" },
        });
      }
      return wo;
    }),

  // List contractors (users with CONTRACTOR role in any scheme, or all users as fallback)
  listContractors: committeeProcedure
    .input(z.object({ schemeId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const contractors = await ctx.prisma.user.findMany({
        where: {
          schemeRoles: { some: { schemeId: input.schemeId, role: "CONTRACTOR", termEnd: null } },
        },
      });
      // If none registered yet, return all scheme members so committee can assign
      if (contractors.length === 0) {
        return ctx.prisma.user.findMany({
          where: { schemeRoles: { some: { schemeId: input.schemeId, termEnd: null } } },
        });
      }
      return contractors;
    }),

  addContractor: committeeProcedure
    .input(
      z.object({
        schemeId: z.string().uuid(),
        email: z.string().email(),
        fullName: z.string().min(1),
        phone: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { schemeId, ...userData } = input;
      const user = await ctx.prisma.user.upsert({
        where: { email: userData.email },
        update: {},
        create: userData,
      });
      const existing = await ctx.prisma.schemeRoleRecord.findFirst({
        where: { schemeId, userId: user.id, role: "CONTRACTOR", termEnd: null },
      });
      if (!existing) {
        await ctx.prisma.schemeRoleRecord.create({
          data: { schemeId, userId: user.id, role: "CONTRACTOR", termStart: new Date() },
        });
      }
      return user;
    }),

  list: protectedProcedure
    .input(z.object({ schemeId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.maintenanceRequest.findMany({
        where: { schemeId: input.schemeId },
        include: {
          reportedBy: true,
          workOrder: { include: { contractor: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    }),
});
