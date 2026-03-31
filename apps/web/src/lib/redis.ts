
import Redis from "ioredis";
import { env } from "./env";

const redisUrl = env.REDIS_URL;
const redisHost = env.REDISHOST;

if (!redisUrl && !redisHost) {
    console.warn("⚠️ REDIS_URL ou REDISHOST não configurada. Cache e sessões via Redis estarão desativados.");
}

// Configuração de conexão flexível: tenta variáveis individuais primeiro por serem mais estáveis
const connectionOptions: any = redisHost 
    ? {
        host: redisHost,
        password: env.REDISPASSWORD,
        port: Number(env.REDISPORT || 6379),
        username: env.REDISUSER || "default",
        family: 4,
    }
    : redisUrl;

export const redis = (redisUrl || redisHost) 
    ? new Redis(connectionOptions, {
        tls: (redisUrl?.startsWith("rediss://") || env.REDISPORT === "29508") ? { rejectUnauthorized: false } : undefined,
        maxRetriesPerRequest: null,
        connectTimeout: 15000,
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
    const maskedUrl = redisHost 
        ? `host: ${redisHost}:${env.REDISPORT} (Variáveis Individuais)`
        : redisUrl?.replace(/:[^:@]+@/, ":****@") + " (URL)";
        
    console.log(`🔌 [Redis] Tentando conectar via ${maskedUrl}`);
    
    redis.on("connect", () => {
        console.log("✅ [Redis] Evento: Connect");
        redis.ping()
            .then(pong => console.log("🏓 [Redis] Ping result:", pong))
            .catch(e => {
                if (e.message.includes("WRONGPASS")) {
                    console.error("❌ [Redis] ERRO CRÍTICO: Senha incorreta ou usuário desativado (WRONGPASS). Certifique-se que REDISPASSWORD está correta.");
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
