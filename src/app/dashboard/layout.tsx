import { UserButton, OrganizationSwitcher } from "@clerk/nextjs";
import { LayoutDashboard, Users, Settings, History, Bot, Menu, MessageSquare, Activity } from "lucide-react";
import Link from "next/link";
import { UserService } from "@/lib/services/user";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarNav } from "@/components/sidebar-nav";

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
                <SidebarNav />
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
                <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6 relative">
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
