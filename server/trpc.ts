import { initTRPC, TRPCError } from "@trpc/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";
import superjson from "superjson";
import { ZodError } from "zod";

export const createTRPCContext = async () => {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { user, prisma };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const committeeProcedure = protectedProcedure.use(
  async ({ ctx, next, getRawInput }) => {
    const raw = await getRawInput();
    const input = raw as Record<string, unknown>;
    const schemeId = input?.schemeId as string | undefined;
    if (!schemeId) throw new TRPCError({ code: "BAD_REQUEST", message: "schemeId required" });

    const role = await ctx.prisma.schemeRoleRecord.findFirst({
      where: {
        schemeId,
        userId: ctx.user.id,
        role: { in: ["CHAIRPERSON", "SECRETARY", "TREASURER", "COMMITTEE_MEMBER"] },
        termEnd: null,
      },
    });

    if (!role) throw new TRPCError({ code: "FORBIDDEN", message: "Committee access required" });
    return next({ ctx: { ...ctx, userRole: role } });
  }
);
