import { auth } from "@clerk/nextjs/server";
export const revalidate = 0;
import { redirect } from "next/navigation";
import { MessageRepository } from "@/lib/repositories/message";
import { LeadRepository } from "@/lib/repositories/lead";
import { Search, MessageSquare, User, Send, Bot, Clock } from "lucide-react";
import { OrganizationRepository } from "@/lib/repositories/organization";
import { ChatPolling } from "./ChatPolling";
import { AIToggle } from "@/components/chat/AIToggle";
import Link from "next/link";
import ChatSidebarClient from "./ChatSidebarClient";

export default async function ChatsPage({
    searchParams,
}: {
    searchParams: Promise<{ leadId?: string }>;
}) {
    const { userId, orgId: clerkOrgId } = await auth();

    if (!userId) redirect("/sign-in");
    if (!clerkOrgId) redirect("/org-selection");

    const org = await OrganizationRepository.getByClerkId(clerkOrgId);
    if (!org) redirect("/org-selection");

    // Fetch conversation list (latest messages by lead)
    const conversations = await MessageRepository.listLatestByOrg();
    
    // Fetch active conversation if leadId is provided
    const activeLeadId = (await searchParams).leadId;
    const activeMessages = activeLeadId 
        ? await MessageRepository.listByLead(activeLeadId)
        : [];
    
    const activeLead = activeLeadId 
        ? await LeadRepository.getById(activeLeadId)
        : null;

    // MARCAR COMO LIDA ao abrir a conversa
    if (activeLeadId) {
        await LeadRepository.update(activeLeadId, { lastReadAt: new Date() });
    }

    return (
        <div className="flex h-[calc(100vh-140px)] gap-0 border border-border bg-card rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/10">
            {/* Sidebar: Contact List */}
            <div className="w-80 border-r border-border flex flex-col bg-muted/20">
                <div className="p-6 border-b border-border bg-card/50 backdrop-blur-xl">
                    <h2 className="text-xl font-black text-foreground uppercase tracking-tight mb-4">Conversas</h2>
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-muted-foreground" size={16} />
                        <input 
                            placeholder="Buscar contato..." 
                            className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-primary transition-all shadow-inner"
                        />
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                <ChatSidebarClient conversations={conversations} activeLeadId={activeLeadId} />
                </div>
            </div>

            {/* Chat Window */}
            <div className="flex-1 flex flex-col bg-background/30 backdrop-blur-sm relative overflow-hidden">
                {!activeLeadId ? (
                    <div className="flex-1 flex flex-col items-center justify-center space-y-6 text-center p-20 select-none opacity-20 transform translate-y-[-2rem]">
                        <div className="h-40 w-40 rounded-full bg-muted flex items-center justify-center border-4 border-dashed border-border animate-pulse">
                            <MessageSquare size={80} />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black uppercase tracking-tighter">Selecione uma conversa</h3>
                            <p className="text-xs font-medium lowercase">conecte-se com seus leads em tempo real através da nossa IA inteligente.</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Chat Header */}
                        <div className="p-6 border-b border-border bg-card/60 backdrop-blur-xl flex items-center justify-between shadow-sm z-10">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-[1rem] bg-foreground text-background flex items-center justify-center font-black shadow-lg">
                                    {activeLead?.name?.charAt(0) || "?"}
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-foreground uppercase tracking-wider">{activeLead?.name}</h3>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        {activeLead?.isTyping === 'true' ? (
                                            <div className="flex items-center gap-1">
                                                <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                                                <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                                                <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" />
                                                <span className="text-[9px] font-black text-primary uppercase ml-1">IA digitando...</span>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                                                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none">Online</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <AIToggle 
                                    leadId={activeLead?.id || activeLeadId!} 
                                    initialStatus={activeLead?.aiActive ?? "false"} 
                                />
                                <div className="h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground cursor-pointer hover:bg-muted transition-colors">
                                    <Search size={14} />
                                </div>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-10 space-y-6 custom-scrollbar flex flex-col-reverse relative z-0">
                            {/* Typing Animation placeholder within message area if needed */}
                            {activeLead?.isTyping === 'true' && (
                                <div className="flex justify-end animate-in slide-in-from-bottom-2 duration-300">
                                    <div className="max-w-[70%] bg-primary/10 px-5 py-4 rounded-3xl rounded-br-none border border-primary/20">
                                         <div className="flex items-center gap-1">
                                            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                                            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                                            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Message bubbles with reversed order */}
                            {[...activeMessages].reverse().map((msg: any) => (
                                <div 
                                    key={msg.id} 
                                    className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'} animate-in slide-in-from-bottom-2 duration-300 transition-all`}
                                >
                                    <div className={`max-w-[70%] group relative ${msg.role === 'user' ? 'order-1' : 'order-1'}`}>
                                        <div className={`
                                            px-5 py-4 rounded-3xl text-xs font-semibold leading-relaxed shadow-sm
                                            ${msg.role === 'user' 
                                                ? 'bg-card text-foreground border border-border rounded-bl-none' 
                                                : 'bg-primary text-primary-foreground rounded-br-none shadow-primary/20'}
                                        `}>
                                            <div className="flex items-center gap-2 mb-1.5 opacity-60">
                                                {msg.role === 'assistant' ? <Bot size={12} className="animate-bounce" /> : <User size={12} />}
                                                <span className="text-[8px] font-black uppercase tracking-widest">{msg.role === 'user' ? (activeLead?.name || 'Lead') : 'Você / IA'}</span>
                                            </div>
                                            {msg.content}
                                        </div>
                                        <div className={`mt-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                                            <Clock size={10} className="text-muted-foreground" />
                                            <span className="text-[8px] font-black text-muted-foreground uppercase">
                                                {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Input Area */}
                        <div className="p-8 border-t border-border bg-card/50 backdrop-blur-xl relative z-10">
                            <form className="flex gap-4 relative">
                                <input 
                                    placeholder="Digite sua mensagem aqui..." 
                                    className="flex-1 bg-background border-2 border-border/50 rounded-2xl px-6 py-4 text-xs font-bold focus:outline-none focus:border-primary transition-all shadow-inner placeholder:font-normal placeholder:opacity-30 pr-16"
                                />
                                <button 
                                    type="submit"
                                    className="absolute right-2 top-2 h-12 w-12 bg-foreground text-background rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg group"
                                >
                                    <Send size={18} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                </button>
                            </form>
                            <div className="mt-4 flex justify-center">
                                <p className="text-[9px] text-muted-foreground font-black uppercase tracking-[0.2em] opacity-30">Criptografia de ponta a ponta ativa</p>
                            </div>
                        </div>
                    </>
                )}
                
                {/* Background Decorations */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-primary/5 rounded-full blur-[80px] pointer-events-none translate-y-1/2 -translate-x-1/2" />
            </div>
            
            <style dangerouslySetInnerHTML={{ __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); }
            `}} />
            <ChatPolling interval={3000} />
        </div>
    );
}
