
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log("🚀 [Instrumentation] Iniciando registro de serviços de background...");
    
    try {
        const { WhatsappService } = await import('@/lib/services/whatsapp');
        
        // Pequeno delay para garantir que o pooler do banco está estável no boot do Render
        setTimeout(async () => {
            console.log("📡 [Instrumentation] Disparando retomada de sessões WhatsApp...");
            try {
                await WhatsappService.resumeSessions();
            } catch (err) {
                console.error("❌ [Instrumentation] Falha crítica ao resumir sessões:", err);
            }

            // Iniciar o processamento de prospecção a cada 1 minuto
            console.log("📨 [Instrumentation] Iniciando cron de prospecção...");
            setInterval(async () => {
                const { OutreachService } = await import('@/lib/services/outreach');
                await OutreachService.processQueue();
            }, 60 * 1000); // 1 minuto
        }, 3000);
        
    } catch (error) {
        console.error("❌ [Instrumentation] Erro ao carregar WhatsappService:", error);
    }
  }
}
