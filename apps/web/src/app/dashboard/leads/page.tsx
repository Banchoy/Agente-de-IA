
import CRMKanban from "../CRMKanban";
import { getKanbanData } from "./actions";
import { stopOutreach } from "./outreach-actions";
import { OutreachBanner } from "./OutreachBanner";
import { PowerOff } from "lucide-react";

export default async function LeadsPage() {
    const { leads, stages } = await getKanbanData();

    return (
        <div className="h-[calc(100vh-6rem)] flex flex-col gap-6 p-6 overflow-hidden">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black tracking-tight uppercase">Gestão de Leads</h1>
                    <p className="text-muted-foreground font-medium lowercase">Monitore e gerencie seu funil de vendas com IA.</p>
                </div>
                <div className="flex gap-3">
                    <form action={stopOutreach}>
                        <button 
                            type="submit"
                            className="flex items-center gap-2 rounded-2xl bg-red-600/10 px-6 py-3 text-xs font-black uppercase tracking-widest text-red-600 hover:bg-red-600 hover:text-white transition-all active:scale-95 border border-red-600/20"
                        >
                            <PowerOff size={16} />
                            Parar Todos os Disparos
                        </button>
                    </form>
                </div>
            </div>

            <OutreachBanner />

            <CRMKanban initialLeads={leads} initialStages={stages} />
        </div>
    );
}
