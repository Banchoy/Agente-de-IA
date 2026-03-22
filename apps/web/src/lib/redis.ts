
import Redis from "ioredis";
import { env } from "./env";

const redisUrl = env.REDIS_URL;

if (!redisUrl) {
    console.warn("⚠️ REDIS_URL não configurada. Cache e sessões via Redis estarão desativados.");
}

export const redis = redisUrl 
    ? new Redis(redisUrl, {
        tls: { rejectUnauthorized: false }, // Obrigatório para Upstash na Render
        maxRetriesPerRequest: null,
        connectTimeout: 10000, // 10s
        retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
        }
    })
    : null;

if (redis) {
    redis.on("connect", () => console.log("✅ [Redis] Conectado ao Upstash"));
    redis.on("error", (err) => console.error("❌ [Redis] Erro de conexão:", err));
}
