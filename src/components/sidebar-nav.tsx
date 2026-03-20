"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Settings, History, Bot, MessageSquare, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
    {
        name: "CRM de Vendas",
        href: "/dashboard",
        icon: LayoutDashboard,
        exact: true,
    },
    {
        name: "Dashboard Analítico",
        href: "/dashboard/analytics",
        icon: Activity,
    },
    {
        name: "WhatsApp",
        href: "/dashboard/whatsapp",
        icon: MessageSquare,
    },
    {
        name: "Agentes",
        href: "/dashboard/agents",
        icon: Bot,
    },
    {
        name: "Integrações",
        href: "/dashboard/integrations",
        icon: Activity,
    },
    {
        name: "Usuários",
        href: "/dashboard/users",
        icon: Users,
    },
    {
        name: "Logs de Auditoria",
        href: "/dashboard/logs",
        icon: History,
    },
    {
        name: "Configurações",
        href: "/dashboard/settings",
        icon: Settings,
    },
];

export function SidebarNav() {
    const pathname = usePathname();

    return (
        <nav className="flex-1 space-y-1 p-4">
            {navItems.map((item) => {
                const isActive = item.exact 
                    ? pathname === item.href 
                    : pathname.startsWith(item.href);

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2 transition-all",
                            isActive
                                ? "bg-primary text-primary-foreground font-bold shadow-md"
                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground font-medium"
                        )}
                    >
                        <item.icon size={20} />
                        {item.name}
                    </Link>
                );
            })}
        </nav>
    );
}
