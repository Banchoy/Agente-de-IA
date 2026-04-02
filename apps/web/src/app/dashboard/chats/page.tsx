import { auth } from "@clerk/nextjs/server";
export const revalidate = 0;
import { redirect } from "next/navigation";
import { MessageRepository } from "@/lib/repositories/message";
import { LeadRepository } from "@/lib/repositories/lead";
import { Search, MessageSquare, User, Bot, Clock, ShieldCheck, MoreVertical, Phone, Video } from "lucide-react";
import { OrganizationRepository } from "@/lib/repositories/organization";
import { ChatPolling } from "./ChatPolling";
import ChatInputClient from "./ChatInputClient";
import ChatSidebarClient from "./ChatSidebarClient";
import ChatContainerClient from "./ChatContainerClient";

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

    const conversations = await MessageRepository.listLatestByOrg();
    const params = await searchParams;
    const activeLeadId = params.leadId;
    
    const activeMessages = activeLeadId 
        ? await MessageRepository.listByLead(activeLeadId)
        : [];
    
    const activeLead = activeLeadId 
        ? await LeadRepository.getById(activeLeadId)
        : null;

    if (activeLeadId) {
        await LeadRepository.update(activeLeadId, { lastReadAt: new Date() });
    }

    return (
        <div className="h-[calc(100vh-120px)] bg-[#111b21] rounded-2xl overflow-hidden shadow-2xl flex flex-col border border-white/5">
            <ChatContainerClient>
                {/* Sidebar */}
                <div className="w-[30%] min-w-[320px] max-w-[450px] border-r border-[#222d34] flex flex-col bg-[#111b21]">
                    <div className="p-4 bg-[#202c33] flex items-center justify-between">
                        <div className="h-10 w-10 rounded-full bg-[#6a7175] flex items-center justify-center text-white font-bold">
                            {org.name.charAt(0)}
                        </div>
                        <div className="flex gap-5 text-[#aebac1]">
                            <MessageSquare size={20} className="cursor-pointer" />
                            <MoreVertical size={20} className="cursor-pointer" />
                        </div>
                    </div>
                    
                    <div className="p-2 bg-[#111b21]">
                        <div className="relative group">
                            <Search className="absolute left-4 top-2.5 text-[#8696a0]" size={16} />
                            <input 
                                placeholder="Pesquisar ou começar uma nova conversa" 
                                className="w-full bg-[#202c33] border-none rounded-lg pl-12 pr-4 py-2 text-sm text-[#d1d7db] placeholder-[#8696a0] focus:outline-none transition-all"
                            />
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto no-scrollbar">
                        <ChatSidebarClient conversations={conversations} activeLeadId={activeLeadId} />
                    </div>
                </div>

                {/* Main Chat Area */}
                <div className="flex-1 flex flex-col bg-[#0b141a] relative">
                    {!activeLeadId ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-20 select-none bg-[#222e35]">
                            <div className="relative mb-8">
                                <div className="h-64 w-64 rounded-full bg-[#2a3942] flex items-center justify-center border border-white/5">
                                    <Bot size={120} className="text-[#6a7175]" />
                                </div>
                                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-[#00a884] text-white px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-xl">
                                    Bruno 2.0 Ativo
                                </div>
                            </div>
                            <h3 className="text-2xl font-light text-[#e9edef] mb-3">WhatsApp Web / Bruno AI</h3>
                            <p className="text-sm text-[#8696a0] max-w-sm leading-relaxed">
                                Envie e receba mensagens sem precisar manter seu celular conectado. <br/>
                                Bruno 2.0 cuida da prospecção enquanto você escala.
                            </p>
                            <div className="mt-auto flex items-center gap-2 text-[#8696a0] text-xs">
                                <ShieldCheck size={14} />
                                Criptografado de ponta a ponta
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Chat Header */}
                            <div className="px-4 py-2 bg-[#202c33] flex items-center justify-between z-20 shadow-md">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-[#6a7175] flex items-center justify-center text-white font-bold text-lg shadow-inner">
                                        {activeLead?.name?.charAt(0) || "?"}
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-medium text-[#e9edef]">{activeLead?.name}</h3>
                                        <span className="text-[10px] text-[#8696a0]">
                                            {activeLead?.isTyping === 'true' ? 'ia digitando...' : 'online'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6 text-[#aebac1]">
                                    <Video size={20} className="cursor-not-allowed opacity-30" />
                                    <Phone size={18} className="cursor-not-allowed opacity-30" />
                                    <div className="h-6 w-[1px] bg-white/10 mx-2" />
                                    <Search size={20} className="cursor-pointer hover:text-white transition-colors" />
                                    <MoreVertical size={20} className="cursor-pointer hover:text-white transition-colors" />
                                </div>
                            </div>

                            {/* Messages with Doodle Background */}
                            <div 
                                className="flex-1 overflow-y-auto p-10 space-y-2 no-scrollbar flex flex-col-reverse relative z-0 bg-[#0b141a]"
                                style={{
                                    backgroundImage: 'url("https://wweb.dev/static/90f05928834d8c034685.png")',
                                    backgroundBlendMode: 'overlay',
                                    backgroundColor: '#0b141a',
                                    backgroundSize: '400px'
                                }}
                            >
                                {[...activeMessages].reverse().map((msg: any) => {
                                    const isMe = msg.role === 'assistant';
                                    return (
                                        <div 
                                            key={msg.id} 
                                            className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1.5`}
                                        >
                                            <div className={`
                                                relative px-3 py-1.5 rounded-lg text-[13px] leading-[19px] shadow-sm max-w-[65%]
                                                ${isMe 
                                                    ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-none' 
                                                    : 'bg-[#202c33] text-[#e9edef] rounded-tl-none'}
                                            `}>
                                                {/* Tail */}
                                                <div className={`absolute top-0 w-3 h-3 ${isMe ? '-right-2 bg-[#005c4b]' : '-left-2 bg-[#202c33]'}`} 
                                                     style={{ clipPath: isMe ? 'polygon(0 0, 0 100%, 100% 0)' : 'polygon(100% 0, 100% 100%, 0 0)' }} />
                                                
                                                <div className="whitespace-pre-wrap">{msg.content}</div>
                                                <div className="flex items-center justify-end gap-1 mt-1">
                                                    <span className="text-[9px] text-[#8696a0] uppercase">
                                                        {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                    </span>
                                                    {isMe && <ShieldCheck size={10} className="text-[#53bdeb]" />}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                
                                <div className="flex justify-center my-4">
                                    <div className="bg-[#182229] border border-white/5 text-[#8696a0] text-[11px] px-3 py-1 rounded-lg uppercase tracking-wider shadow-sm">
                                        Hoje
                                    </div>
                                </div>
                            </div>

                            {/* Input Area */}
                            <div className="bg-[#202c33] px-4 py-3 flex items-center gap-4">
                                <ChatInputClient leadId={activeLeadId} />
                            </div>
                        </>
                    )}
                </div>
            </ChatContainerClient>
            
            <style dangerouslySetInnerHTML={{ __html: `
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}} />
            <ChatPolling interval={3000} />
        </div>
    );
}
