import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/root";
import { createTRPCContext } from "@/server/trpc";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: createTRPCContext,
    onError: ({ path, error }) => {
      if (process.env.NODE_ENV === "development") {
        console.error(`tRPC error on ${path}:`, error);
      }
    },
  });

export { handler as GET, handler as POST };
