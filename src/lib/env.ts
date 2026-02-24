
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
    EVOLUTION_API_URL: z.string().optional(),
    EVOLUTION_API_KEY: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    const isBuild = process.env.NODE_ENV === "production" && !process.env.DATABASE_URL;

    if (isBuild) {
        console.warn("⚠️ Variáveis de ambiente faltando durante o build. Isso é normal se você estiver gerando uma imagem Docker sem segredos expostos.");
    } else {
        console.error("❌ Erro de validação das variáveis de ambiente:");
        const errors = parsed.error.flatten().fieldErrors;
        Object.entries(errors).forEach(([field, messages]) => {
            console.error(`  - ${field}: ${messages?.join(", ")}`);
        });
        // Não jogamos erro aqui para não travar o server, mas os logs avisarão
    }
}

export const env = parsed.success ? parsed.data : (process.env as unknown as z.infer<typeof envSchema>);
