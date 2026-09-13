import { z } from "zod";

export const registerProfileInput = z.object({
  name: z.string().min(2),
  type: z.enum(["clinic", "hospital"]),
  address: z.string().min(3),
  city: z.string().min(2),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  ownerName: z.string().min(2),
  phone: z.string().min(10),
  licenseNumber: z.string().min(3),
});

export type RegisterProfileInput = z.infer<typeof registerProfileInput>;
