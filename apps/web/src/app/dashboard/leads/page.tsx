
import CRMKanban from "../CRMKanban";
import { getKanbanData } from "./actions";
import { OutreachBanner } from "./OutreachBanner";

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
                    {/* Botões de ação rápida se necessário */}
                </div>
            </div>

            <OutreachBanner />

            <CRMKanban initialLeads={leads} initialStages={stages} />
        </div>
    );
}
