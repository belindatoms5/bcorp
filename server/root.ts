import { createTRPCRouter } from "./trpc";
import { schemeRouter } from "./routers/scheme";
import { levyRouter } from "./routers/levy";
import { meetingRouter } from "./routers/meeting";
import { maintenanceRouter } from "./routers/maintenance";
import { documentRouter } from "./routers/document";
import { breachRouter } from "./routers/breach";
import { announcementRouter } from "./routers/announcement";
import { transactionRouter } from "./routers/transaction";
import { sinkingRouter } from "./routers/sinking";
import { settingsRouter } from "./routers/settings";

export const appRouter = createTRPCRouter({
  scheme: schemeRouter,
  levy: levyRouter,
  meeting: meetingRouter,
  maintenance: maintenanceRouter,
  document: documentRouter,
  breach: breachRouter,
  announcement: announcementRouter,
  transaction: transactionRouter,
  sinking: sinkingRouter,
  settings: settingsRouter,
});

export type AppRouter = typeof appRouter;
