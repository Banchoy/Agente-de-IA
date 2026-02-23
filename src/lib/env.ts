
import { z } from "zod";

const envSchema = z.object({
    DATABASE_URL: z.string().url(),
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
    CLERK_SECRET_KEY: z.string().min(1),
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().default("/sign-in"),
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().default("/sign-up"),
    NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: z.string().default("/dashboard"),
    NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: z.string().default("/dashboard"),
    // AI & Integrations
    GOOGLE_GEMINI_API_KEY: z.string().optional(),
    EVOLUTION_API_URL: z.string().url().optional(),
    EVOLUTION_API_KEY: z.string().optional(),
});

export const env = envSchema.parse(process.env);
