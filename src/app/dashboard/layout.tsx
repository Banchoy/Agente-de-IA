import { UserButton, OrganizationSwitcher } from "@clerk/nextjs";
import { LayoutDashboard, Users, Settings, History, Bot, Menu, MessageSquare, Activity } from "lucide-react";
import Link from "next/link";
import { UserService } from "@/lib/services/user";
import { ThemeToggle } from "@/components/theme-toggle";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Sync user and organization with our DB on every dashboard load
    await UserService.syncUser();
    return (
        <div className="flex min-h-screen bg-background font-sans text-foreground">
            {/* Sidebar Desktop */}
            <aside className="hidden w-64 border-r border-border bg-card md:flex md:flex-col">
                <div className="flex h-16 items-center border-b border-border px-6 font-bold text-xl gap-2">
                    <Bot size={24} className="text-foreground" />
                    Agente AI
                </div>
                <nav className="flex-1 space-y-1 p-4">
                    <Link href="/dashboard" className="flex items-center gap-3 rounded-lg px-3 py-2 bg-primary text-primary-foreground font-bold transition-all shadow-md">
                        <LayoutDashboard size={20} />
                        CRM de Vendas
                    </Link>
                    <Link href="/dashboard/analytics" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
                        <Activity size={20} />
                        Dashboard Analítico
                    </Link>
                    <Link href="/dashboard/whatsapp" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
                        <MessageSquare size={20} />
                        WhatsApp
                    </Link>
                    <Link href="/dashboard/agents" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
                        <Bot size={20} />
                        Agentes
                    </Link>
                    <Link href="/dashboard/integrations" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
                        <Activity size={20} />
                        Integrações
                    </Link>
                    <Link href="/dashboard/users" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
                        <Users size={20} />
                        Usuários
                    </Link>
                    <Link href="/dashboard/logs" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
                        <History size={20} />
                        Logs de Auditoria
                    </Link>
                    <Link href="/dashboard/settings" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
                        <Settings size={20} />
                        Configurações
                    </Link>
                </nav>
                <div className="p-4 border-t border-border">
                    <OrganizationSwitcher
                        hidePersonal
                        appearance={{
                            elements: {
                                rootBox: "w-full",
                                organizationSwitcherTrigger: "w-full flex justify-between px-3 py-2 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                            }
                        }}
                    />
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
                <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
                    <button className="md:hidden text-muted-foreground">
                        <Menu size={24} />
                    </button>
                    <div className="ml-auto flex items-center gap-4">
                        <ThemeToggle />
                        <UserButton afterSignOutUrl="/" />
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
