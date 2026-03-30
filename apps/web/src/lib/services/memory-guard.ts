/**
 * MemoryGuard — Gerenciamento Proativo de Memória
 * 
 * Monitora o uso de memória do processo Node.js e executa ações 
 * de limpeza quando a memória ultrapassa thresholds configuráveis.
 * Ideal para ambientes com memória limitada como Railway (512MB).
 */

const MEMORY_THRESHOLD_WARNING = 0.70;  // 70% do heap — começa a limpar
const MEMORY_THRESHOLD_CRITICAL = 0.85; // 85% do heap — limpeza agressiva

export const MemoryGuard = {
    /**
     * Verifica o uso de memória e retorna estatísticas.
     */
    getStats() {
        const mem = process.memoryUsage();
        const heapUsedMB = Math.round(mem.heapUsed / 1024 / 1024);
        const heapTotalMB = Math.round(mem.heapTotal / 1024 / 1024);
        const rssMB = Math.round(mem.rss / 1024 / 1024);
        const heapRatio = mem.heapUsed / mem.heapTotal;

        return {
            heapUsedMB,
            heapTotalMB,
            rssMB,
            heapRatio,
            isWarning: heapRatio >= MEMORY_THRESHOLD_WARNING,
            isCritical: heapRatio >= MEMORY_THRESHOLD_CRITICAL,
        };
    },

    /**
     * Executa a limpeza de memória baseado no nível de pressão.
     * - WARNING (70%): Limpa caches internos e referências fracas.
     * - CRITICAL (85%): Limpeza agressiva + força garbage collection.
     */
    async cleanup() {
        const stats = this.getStats();

        if (!stats.isWarning) {
            return { action: "none", ...stats };
        }

        console.log(`⚠️ [MemoryGuard] Uso de memória: ${stats.heapUsedMB}MB / ${stats.heapTotalMB}MB (${Math.round(stats.heapRatio * 100)}%)`);

        // 1. Limpar cache de mensagens processadas (WhatsApp dedup)
        try {
            if (globalThis.__processed_messages) {
                const sizeBefore = globalThis.__processed_messages.size;
                globalThis.__processed_messages.clear();
                console.log(`🧹 [MemoryGuard] Cache de mensagens limpo: ${sizeBefore} entradas removidas.`);
            }
        } catch (e) {
            console.warn("⚠️ [MemoryGuard] Erro ao limpar cache de mensagens:", e);
        }

        // 2. Limpar locks de leads órfãos
        try {
            if (globalThis.__lead_locks) {
                const sizeBefore = globalThis.__lead_locks.size;
                globalThis.__lead_locks.clear();
                console.log(`🧹 [MemoryGuard] Lead locks limpos: ${sizeBefore} locks removidos.`);
            }
        } catch (e) {
            console.warn("⚠️ [MemoryGuard] Erro ao limpar lead locks:", e);
        }

        // 3. Limpar connection promises expiradas
        try {
            if (globalThis.__baileys_promises) {
                const sizeBefore = globalThis.__baileys_promises.size;
                globalThis.__baileys_promises.clear();
                console.log(`🧹 [MemoryGuard] Connection promises limpas: ${sizeBefore} entradas removidas.`);
            }
        } catch (e) {
            console.warn("⚠️ [MemoryGuard] Erro ao limpar connection promises:", e);
        }

        // 4. Se CRÍTICO: Forçar garbage collection (requer --expose-gc)
        if (stats.isCritical) {
            console.log("🚨 [MemoryGuard] MODO CRÍTICO ATIVADO — Forçando garbage collection...");
            
            if (global.gc) {
                global.gc();
                console.log("✅ [MemoryGuard] Garbage collection forçado executado.");
            } else {
                console.log("ℹ️ [MemoryGuard] global.gc não disponível. Considere --expose-gc no NODE_OPTIONS.");
            }
        }

        const afterStats = this.getStats();
        const freedMB = stats.heapUsedMB - afterStats.heapUsedMB;
        console.log(`✅ [MemoryGuard] Limpeza concluída. Liberado ~${freedMB}MB. Uso atual: ${afterStats.heapUsedMB}MB / ${afterStats.heapTotalMB}MB`);

        return { 
            action: stats.isCritical ? "critical_cleanup" : "warning_cleanup",
            freedMB,
            before: stats,
            after: afterStats 
        };
    },

    /**
     * Inicia o monitoramento automático com intervalo configurável.
     */
    startMonitoring(intervalMs: number = 5 * 60 * 1000) {
        console.log(`👁️ [MemoryGuard] Monitoramento de memória iniciado (intervalo: ${intervalMs / 1000}s)`);
        
        // Check inicial
        const stats = this.getStats();
        console.log(`📊 [MemoryGuard] Memória inicial: ${stats.heapUsedMB}MB / ${stats.heapTotalMB}MB (RSS: ${stats.rssMB}MB)`);

        setInterval(async () => {
            try {
                await this.cleanup();
            } catch (err) {
                console.error("❌ [MemoryGuard] Erro no monitoramento:", err);
            }
        }, intervalMs);
    }
};
