import { z } from "zod";

import { PIN_LENGTH } from "@/features/auth/domain/verifier";

export const signInSchema = z.object({
  pin: z
    .string()
    .regex(new RegExp(`^\\d{${PIN_LENGTH}}$`), `PIN — це ${PIN_LENGTH} цифри`),
});

export type SignInInput = z.infer<typeof signInSchema>;
