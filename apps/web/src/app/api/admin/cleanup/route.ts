
import { NextResponse } from "next/server";
import { CleanupService } from "@/lib/services/cleanup";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");
    const days = parseInt(searchParams.get("days") || "3");

    // Proteção simples por chave secreta (usando CLERK_SECRET_KEY como fallback ou algo no env)
    if (!key || key !== process.env.CLERK_SECRET_KEY) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(`🚀 [Cleanup API] Disparo manual de limpeza iniciado via API.`);
    
    // Executa em "background" (não espera terminar para responder o HTTP)
    CleanupService.processInactiveLeads(days).catch(err => {
        console.error("❌ [Cleanup API] Erro no processamento:", err);
    });

    return NextResponse.json({ 
        message: "Processo de limpeza iniciado em background.",
        targetDays: days
    });
}
