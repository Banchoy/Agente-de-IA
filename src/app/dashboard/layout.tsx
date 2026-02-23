import { UserButton, OrganizationSwitcher } from "@clerk/nextjs";
import { LayoutDashboard, Users, Settings, History, Bot, Menu, MessageSquare } from "lucide-react";
import Link from "next/link";
import { UserService } from "@/lib/services/user";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Sync user and organization with our DB on every dashboard load
    await UserService.syncUser();
    return (
        <div className="flex min-h-screen bg-zinc-50 font-sans">
            {/* Sidebar Desktop */}
            <aside className="hidden w-64 border-r border-zinc-200 bg-white md:flex md:flex-col">
                <div className="flex h-16 items-center border-b border-zinc-200 px-6 font-bold text-xl gap-2">
                    <Bot size={24} className="text-zinc-900" />
                    Agente AI
                </div>
                <nav className="flex-1 space-y-1 p-4">
                    <Link href="/dashboard" className="flex items-center gap-3 rounded-lg px-3 py-2 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors">
                        <LayoutDashboard size={20} />
                        Dashboard
                    </Link>
                    <Link href="/dashboard/agents" className="flex items-center gap-3 rounded-lg px-3 py-2 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors">
                        <Bot size={20} />
                        Agentes
                    </Link>
                    <Link href="/dashboard/whatsapp" className="flex items-center gap-3 rounded-lg px-3 py-2 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors">
                        <MessageSquare size={20} />
                        WhatsApp
                    </Link>
                    <Link href="/dashboard/users" className="flex items-center gap-3 rounded-lg px-3 py-2 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors">
                        <Users size={20} />
                        Usuários
                    </Link>
                    <Link href="/dashboard/logs" className="flex items-center gap-3 rounded-lg px-3 py-2 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors">
                        <History size={20} />
                        Logs de Auditoria
                    </Link>
                    <Link href="/dashboard/settings" className="flex items-center gap-3 rounded-lg px-3 py-2 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors">
                        <Settings size={20} />
                        Configurações
                    </Link>
                </nav>
                <div className="p-4 border-t border-zinc-200">
                    <OrganizationSwitcher
                        hidePersonal
                        appearance={{
                            elements: {
                                rootBox: "w-full",
                                organizationSwitcherTrigger: "w-full flex justify-between px-3 py-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
                            }
                        }}
                    />
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
                <header className="flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-6">
                    <button className="md:hidden text-zinc-600">
                        <Menu size={24} />
                    </button>
                    <div className="ml-auto flex items-center gap-4">
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
