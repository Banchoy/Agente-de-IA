
import Redis from "ioredis";
import { env } from "./env";

const redisUrl = env.REDIS_URL;

if (!redisUrl) {
    console.warn("⚠️ REDIS_URL não configurada. Cache e sessões via Redis estarão desativados.");
}

export const redis = redisUrl 
    ? new Redis(redisUrl, {
        tls: redisUrl.startsWith("rediss://") ? { rejectUnauthorized: false } : undefined,
        maxRetriesPerRequest: null,
        connectTimeout: 15000,
        family: 4, // Forçar IPv4 para consistência no Railway/Upstash
        retryStrategy: (times) => {
            const delay = Math.min(times * 100, 3000);
            return delay;
        },
        reconnectOnError: (err) => {
            const targetError = "READONLY";
            if (err.message.includes(targetError)) return true;
            return false;
        }
    })
    : null;

// Diagnóstico inicial
if (redis) {
    const maskedUrl = redisUrl?.replace(/:[^:@]+@/, ":****@");
    console.log(`🔌 [Redis] Tentando conectar em: ${maskedUrl}`);
    
    redis.on("connect", () => {
        console.log("✅ [Redis] Evento: Connect");
        redis.ping()
            .then(pong => console.log("🏓 [Redis] Ping result:", pong))
            .catch(e => {
                if (e.message.includes("WRONGPASS")) {
                    console.error("❌ [Redis] ERRO CRÍTICO: Senha incorreta ou usuário desativado (WRONGPASS). Verifique a REDIS_URL no Railway.");
                } else {
                    console.error("❌ [Redis] Ping falhou:", e.message);
                }
            });
    });
    
    redis.on("ready", () => console.log("🚀 [Redis] Conexão pronta (READY)"));
    
    redis.on("error", (err: any) => {
        if (err.message.includes("WRONGPASS")) {
            console.error("❌ [Redis] Erro de Autenticação Detectado (WRONGPASS).");
        } else {
            console.error("❌ [Redis] Erro detectado:", err.name, err.message);
        }
        
        if (err instanceof AggregateError) {
            console.error("🔍 [Redis] Erros agregados:", err.errors.map((e: any) => e.message).join(" | "));
        }
    });
}
