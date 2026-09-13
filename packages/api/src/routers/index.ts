import type { RouterClient } from "@orpc/server";

import { protectedProcedure, publicProcedure } from "../index";
import { clinicRouter } from "./clinic";
import { clinicalRouter } from "./clinical";
import { patientRouter } from "./patient";
import { triageRouter } from "./triage";

export const appRouter = {
  healthCheck: publicProcedure.handler(() => {
    return "OK";
  }),
  privateData: protectedProcedure.handler(({ context }) => {
    return {
      message: "This is private",
      user: context.session?.user,
    };
  }),
  clinic: clinicRouter,
  patient: patientRouter,
  clinical: clinicalRouter,
  triage: triageRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
