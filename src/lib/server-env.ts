import "server-only";
import { z } from "zod";

export const serverEnv = z
  .object({
    CLERK_SECRET_KEY: z.string().min(1),
  })
  .parse({
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
  });
