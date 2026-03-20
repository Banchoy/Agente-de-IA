
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
        }, 3000);
        
    } catch (error) {
        console.error("❌ [Instrumentation] Erro ao carregar WhatsappService:", error);
    }
  }
}
