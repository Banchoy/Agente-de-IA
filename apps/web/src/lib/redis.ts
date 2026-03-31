
import Redis from "ioredis";
import { env } from "./env";

const redisUrl = env.REDIS_URL;
const redisHost = env.REDISHOST;

if (!redisUrl && !redisHost) {
    console.warn("⚠️ REDIS_URL ou REDISHOST não configurada. Cache e sessões via Redis estarão desativados.");
}

// Helper para extrair opções puras da URL se necessário
const parseRedisUrl = (urlStr: string) => {
    try {
        const url = new URL(urlStr);
        return {
            host: url.hostname,
            port: Number(url.port),
            password: decodeURIComponent(url.password),
            username: url.username || "default",
        };
    } catch (e) {
        return null;
    }
};

const urlOptions = redisUrl ? parseRedisUrl(redisUrl) : null;

// Configuração de conexão flexível
const connectionOptions: any = (redisHost || process.env.REDISHOST || process.env.REDIS_HOST) 
    ? {
        host: redisHost || process.env.REDISHOST || process.env.REDIS_HOST,
        password: (process.env.REDISPASSWORD || process.env.REDIS_PASSWORD || env.REDISPASSWORD || env.REDIS_PASSWORD)?.trim(),
        // Regra de Ouro: Se o host é interno do Railway, a porta obrigatoriamente deve ser 6379
        port: (redisHost || process.env.REDISHOST || process.env.REDIS_HOST)?.includes("railway.internal") 
            ? 6379 
            : Number(env.REDISPORT || env.REDIS_PORT || process.env.REDISPORT || 6379),
        username: env.REDISUSER || process.env.REDISUSER || "default",
    }
    : urlOptions || redisUrl;

if (connectionOptions.password) {
    console.log(`🔌 [Redis] Senha detectada no sistema (${connectionOptions.password.length} caracteres)`);
} else {
    console.warn("⚠️ [Redis] CRÍTICO: Nenhuma senha encontrada no process.env!");
}

export const redis = (redisUrl || redisHost || process.env.REDISHOST || process.env.REDIS_HOST) 
    ? new Redis(connectionOptions, {
        // Habilita TLS SOMENTE se não for conexão interna E (for porta pública ou esquema rediss)
        tls: (!redisHost?.includes("railway.internal") && (
            redisUrl?.startsWith("rediss://") || 
            env.REDISPORT === "29508" || 
            (urlOptions?.port === 29508)
        )) ? { rejectUnauthorized: false } : undefined,
        maxRetriesPerRequest: null,
        connectTimeout: 20000,
        family: 4, // Forçar IPv4 para consistência
        retryStrategy: (times) => {
            const delay = Math.min(times * 200, 5000);
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
    const isUrlMode = !redisHost;
    const hostInfo = redisHost || urlOptions?.host || "desconhecido";
    const portInfo = env.REDISPORT || urlOptions?.port || "desconhecido";
    
    console.log(`🔌 [Redis] Estratégia: ${isUrlMode ? "URL Parsing" : "Variáveis Diretas"}`);
    console.log(`🔌 [Redis] Host Alvo: ${hostInfo}:${portInfo}`);
    
    if (isUrlMode && redisUrl?.includes("crossover.proxy.rlwy.net")) {
        console.log("💡 [Dica] Usando proxy público do Railway. Recomenda-se usar a rede interna para maior estabilidade.");
    }

    redis.on("connect", () => {
        console.log("✅ [Redis] Evento: Connect");
        redis.ping()
            .then(pong => console.log("🏓 [Redis] Ping result:", pong))
            .catch(e => {
                if (e.message.includes("WRONGPASS")) {
                    const passToTest = connectionOptions.password;
                    console.error(`❌ [Redis] ERRO DE SENHA (WRONGPASS). Tamanho da senha configurada: ${passToTest?.length || 0} caracteres.`);
                    console.error("💡 [Redis] Verifique se esta variável está em Shared Vars ou se o serviço Redis está iniciado.");
                } else {
                    console.error("❌ [Redis] Falha no teste de conexão:", e.message);
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
