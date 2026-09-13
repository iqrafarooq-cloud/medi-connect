import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  client: {
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().min(1).optional(),
  },
  runtimeEnv: {
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  },
  emptyStringAsUndefined: true,
});
