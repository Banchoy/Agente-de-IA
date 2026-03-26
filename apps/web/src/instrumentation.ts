
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { db } = await import("@/lib/db");
    const { sql } = await import("drizzle-orm");
    
    console.log("🚀 [Instrumentation] Iniciando registro de serviços de background...");
    
    try {
        const { WhatsappService } = await import('@/lib/services/whatsapp');
        
        // Postgres Advisory Lock para garantir que apenas UMA instância execute background jobs
        // Isso resolve a duplicidade de mensagens durante deploys
        setTimeout(async () => {
            try {
                // Tentando obter trava 12345 (valor arbitrário para background_jobs)
                const [{ isMaster }] = await (db as any).execute(sql`SELECT pg_try_advisory_lock(12345) as "isMaster"`);
                
                if (!isMaster) {
                    console.log("⏩ [Instrumentation] Outra instância já é a MASTER. Ignorando crons nesta réplica.");
                    return;
                }

                console.log("👑 [Instrumentation] Esta instância foi eleita MASTER. Iniciando serviços.");
                
                console.log("📡 [Instrumentation] Disparando retomada de sessões WhatsApp...");
                await WhatsappService.resumeSessions();

                // Iniciar o processamento de prospecção a cada 1 minuto
                console.log("📨 [Instrumentation] Iniciando cron de prospecção...");
                setInterval(async () => {
                    const { OutreachService } = await import('@/lib/services/outreach');
                    await OutreachService.processQueue();
                }, 60 * 1000); // 1 minuto
            } catch (err) {
                console.error("❌ [Instrumentation] Erro ao tentar obter trava de MASTER:", err);
            }
        }, 5000);
        
    } catch (error) {
        console.error("❌ [Instrumentation] Erro ao carregar WhatsappService:", error);
    }
  }
}
