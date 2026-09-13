import type { RouterClient } from "@orpc/server";

import { protectedProcedure, publicProcedure } from "../index";
import { adminRouter } from "./admin";
import { clinicRouter } from "./clinic";
import { clinicalRouter } from "./clinical";
import { patientRouter } from "./patient";
import { patientRecordRouter } from "./patient-record";
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
  admin: adminRouter,
  clinic: clinicRouter,
  patient: patientRouter,
  patientRecord: patientRecordRouter,
  clinical: clinicalRouter,
  triage: triageRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
