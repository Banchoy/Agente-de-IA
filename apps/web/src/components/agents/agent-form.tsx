"use client";

import { useState } from "react";
import { Bot, ArrowLeft, Sparkles, Phone, Loader2, Wand2 } from "lucide-react";
import Link from "next/link";
import { createAgent } from "@/app/dashboard/agents/actions";
import { toast } from "sonner";

interface AgentFormProps {
    availableSessions: string[];
    freeModels: string[];
    defaultInstanceName?: string;
}

const OUTBOUND_TEMPLATE = `## 1️⃣ FASE 1 (ABERTURA DESARMADA)
(Se for de manhã): "Olá, bom dia, tudo bem?"
(Se for de tarde): "Olá, boa tarde, tudo bem?"
(Se for à noite): "Olá, boa noite, tudo bem?"
(REGRA: Não use o nome do cliente aqui)

## 2️⃣ FASE 2 (PEDIDO DE ORIENTAÇÃO - BYPASS)
"Opa, prazer, meu nome é Bruno... vi que você trabalha com [NICHO] e preciso de uma ajuda sua... não sei se é com você mesmo que consigo essa orientação... posso te explicar rapidinho?"

## 3️⃣ FASE 3 (ANÁLISE E GANCHO DE VALOR)
"Tava vendo a empresa de vocês... vi que fazem coisas legais para captar clientes para [NICHO], mas notei pontos onde estão perdendo faturamento... preparei um material com esses pontos e gostaria de apresentar para o responsável"

## 4️⃣ FASE 4 (PERGUNTA DIAGNÓSTICA)
"Hoje vocês têm um time comercial ou é você mesmo(a) que faz os fechamentos na empresa?"

## 5️⃣ FASE 5 (VALIDAÇÃO E FIT)
"Bacana. E qual a média de faturamento mensal de vocês hoje? Só pra eu ver se o que pensei tem fit com o momento de vocês."

## 6️⃣ FASE 6 (POSICIONAMENTO E OPORTUNIDADE)
"O que a gente faz exatamente é montar uma máquina de vendas pelo WhatsApp. Nós conseguimos automatizar a qualificação. O robô atende o cliente na hora, tira as dúvidas, e só passa pra você a pessoa que realmente quer comprar."

## 7️⃣ FASE 7 (CHAMADA PARA AÇÃO - CTA)
"Como vi que vocês têm bastante potencial, queria te apresentar como isso funcionaria pro negócio de vocês. Você tem 10 minutinhos nos próximos dias para eu te mostrar a ferramenta na prática?"

## 8️⃣ FASE 8 (CONCLUSÃO DA REUNIÃO)
"Eu posso te mandar um link pro meu calendário pra gente agendar um bate-papo sem compromisso, ou fica melhor você me falar um dia que você está de boa?"`;


const INBOUND_TEMPLATE = `## 1️⃣ ABERTURA
"Opa, tudo bem? Aqui é o Bruno."
"[NOME], pra eu te direcionar pro melhor especialista aqui do nosso time, me fala rapidinho: qual o seu ramo de atuação (nicho) hoje?"

## 2️⃣ PERCEPÇÃO DE VALOR
"Show! Nós temos bastante experiência ajudando empresas desse setor."

## 3️⃣ PROMESSA
"A gente monta operações de vendas automáticas via WhatsApp. Basicamente, ajudamos [NICHO] a triplicar as vendas atendendo os clientes em segundos, 24h por dia."

## 4️⃣ DIAGNÓSTICO CURTO (PERGUNTE UMA POR VEZ)
Pergunta 1: "Hoje você tem uma equipe atendendo o WhatsApp ou é você mesmo(a) que faz as vendas?"
Pergunta 2: "Bacana. E em qual faixa de faturamento mensal a sua empresa está hoje? (Ex: até 10k, 10k a 50k, 50k+)"

## 5️⃣ GERAÇÃO DE CONEXÃO
"Legal entender isso. Como nossa ferramenta precisa de um investimento pra rodar, eu pergunto isso pra garantir que nossa solução cabe no seu fluxo e realmente vai te dar retorno rápido."

## 6️⃣ CALL TO ACTION (CTA)
"Pra eu te mostrar como nosso robô funcionaria exatamente pro seu negócio no dia a dia, você teria uns 15 minutinhos hoje ou amanhã pra uma rápida chamada de vídeo?"

## 7️⃣ LIDANDO COM OBJEÇÕES
Se o cliente achar caro / Sem tempo:
"Entendo totalmente, [nome]. Mas me fala uma coisa, quanto de dinheiro você acha que deixou na mesa esse mês por clientes que desistiram porque demorou pra ter uma resposta? Nosso foco é tapar esse vazamento."

## 8️⃣ FINALIZAÇÃO E AGENDAMENTO
"Maravilha. Pega o link da minha agenda aqui embaixo e escolhe o horário que ficar melhor pra você. Chegando lá, a gente bate esse papo rápido. Fechado?"`;

export function AgentForm({ availableSessions, freeModels, defaultInstanceName }: AgentFormProps) {
    const [isPending, setIsPending] = useState(false);

    async function handleSubmit(formData: FormData) {
        setIsPending(true);
        try {
            await createAgent(formData);
            toast.success("Agente criado com sucesso!");
        } catch (error: any) {
            console.error("Erro ao criar agente:", error);
            toast.error(error.message || "Erro ao criar agente. Tente novamente.");
            setIsPending(false);
        }
    }

    return (
        <form action={handleSubmit} className="space-y-8 rounded-[2rem] border border-border bg-card p-10 shadow-2xl relative overflow-hidden ring-1 ring-white/10 transition-all hover:shadow-primary/5">
            <div className={`space-y-8 relative z-10 ${isPending ? "opacity-50 pointer-events-none" : ""}`}>
                {/* Basic Info */}
                <div className="grid gap-6">
                    <div className="space-y-3">
                        <label htmlFor="name" className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">Nome do Agente</label>
                        <input
                            type="text"
                            name="name"
                            id="name"
                            placeholder="ex: atendente de vendas"
                            required
                            className="w-full rounded-2xl border border-border bg-background px-5 py-4 text-sm font-bold text-foreground focus:border-primary focus:outline-none transition-all shadow-inner placeholder:text-muted-foreground/40 placeholder:font-normal"
                        />
                    </div>
                    <div className="space-y-3">
                        <label htmlFor="description" className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">Descrição Curta</label>
                        <input
                            type="text"
                            name="description"
                            id="description"
                            placeholder="breve resumo da função do robô"
                            className="w-full rounded-2xl border border-border bg-background px-5 py-4 text-sm font-bold text-foreground focus:border-primary focus:outline-none transition-all shadow-inner placeholder:text-muted-foreground/40 placeholder:font-normal"
                        />
                    </div>
                </div>

                {/* WhatsApp Config */}
                <div className="p-1.5 bg-muted/30 rounded-3xl border border-border">
                    <div className="space-y-6 p-6 bg-card rounded-[1.5rem] border border-border shadow-sm">
                        <label className="flex items-start gap-4 group cursor-pointer">
                            <div className="relative inline-flex items-center mt-1">
                                <input
                                    type="checkbox"
                                    name="whatsappResponse"
                                    defaultChecked={true}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-sm font-black text-foreground uppercase tracking-tight">Ativar Respostas do Agente</span>
                                <p className="text-[10px] text-muted-foreground font-medium lowercase leading-relaxed italic">
                                    se marcado, o robô responderá automaticamente no whatsapp.
                                </p>
                            </div>
                        </label>

                        <div className="space-y-3 pt-4 border-t border-border/50">
                            <label htmlFor="whatsappInstanceName" className="flex items-center gap-2 text-xs font-black text-muted-foreground uppercase tracking-widest">
                                <Phone size={14} className="text-primary" />
                                Instância do WhatsApp
                            </label>
                            <select
                                name="whatsappInstanceName"
                                id="whatsappInstanceName"
                                defaultValue={defaultInstanceName || ""}
                                className="w-full rounded-xl border border-border bg-background px-5 py-3.5 text-sm font-bold text-foreground focus:border-primary focus:outline-none transition-all shadow-inner appearance-none cursor-pointer"
                            >
                                <option value="">Selecione uma sessão...</option>
                                {availableSessions.map(session => (
                                    <option key={session} value={session}>{session}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* AI Config */}
                <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-3">
                        <label htmlFor="provider" className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">Provedor de IA</label>
                        <select
                            name="provider"
                            id="provider"
                            required
                            className="w-full rounded-2xl border border-border bg-background px-5 py-4 text-sm font-bold text-foreground focus:border-primary focus:outline-none transition-all shadow-inner appearance-none cursor-pointer"
                        >
                            <option value="google">Google Gemini</option>
                            <option value="openrouter">OpenRouter (Grátis Dinâmico)</option>
                            <option value="groq">Groq (Llama)</option>
                        </select>
                    </div>
                    <div className="space-y-3">
                        <label htmlFor="model" className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">Modelo Selecionado</label>
                        <select
                            name="model"
                            id="model"
                            required
                            className="w-full rounded-2xl border border-border bg-background px-5 py-4 text-sm font-bold text-foreground focus:border-primary focus:outline-none transition-all shadow-inner appearance-none cursor-pointer"
                        >
                            <optgroup label="Google / Locais">
                                <option value="gemini-1.5-flash">Gemini 1.5 Flash (Rápido)</option>
                                <option value="gemini-1.5-pro">Gemini 1.5 Pro (Inteligente)</option>
                                <option value="llama-3.3-70b-versatile">Llama 3.3 70B (Groq)</option>
                            </optgroup>
                            <optgroup label="OpenRouter (Gratuitos)">
                                {freeModels.map(m => (
                                    <option key={m} value={m}>{m.split('/').pop() || m}</option>
                                ))}
                            </optgroup>
                        </select>
                    </div>
                </div>

                {/* Outbound Script */}
                <div className="space-y-4 p-6 bg-primary/5 rounded-[2rem] border border-primary/20 relative group transition-all hover:bg-primary/[0.08]">
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                            <label htmlFor="systemPrompt" className="text-xs font-black text-primary uppercase tracking-widest">Roteiro de Prospecção (Outbound)</label>
                            <span className="bg-primary/20 text-primary text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase">Ativo nas Listas</span>
                        </div>
                        <button 
                            type="button" 
                            onClick={(e) => {
                                e.preventDefault();
                                const el = document.getElementById('systemPrompt') as HTMLTextAreaElement;
                                if(el) el.value = OUTBOUND_TEMPLATE;
                            }}
                            className="text-[10px] font-bold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-xl cursor-pointer transition-colors flex items-center gap-2 border border-primary/20"
                        >
                            <Wand2 size={12} />
                            Carregar Template Bruno
                        </button>
                    </div>
                    <textarea
                        name="systemPrompt"
                        id="systemPrompt"
                        placeholder="Ex: ## 1️⃣ ABERTURA..."
                        rows={10}
                        defaultValue={OUTBOUND_TEMPLATE}
                        required
                        className="w-full rounded-2xl border border-primary/10 bg-background/50 px-6 py-5 text-sm font-bold text-foreground focus:border-primary focus:outline-none transition-all resize-none shadow-inner placeholder:text-muted-foreground/30 font-mono leading-relaxed"
                    ></textarea>
                    <div className="flex items-center gap-2 px-1">
                        <Sparkles size={12} className="text-primary" />
                        <p className="text-[10px] text-muted-foreground font-medium lowercase italic leading-relaxed">
                            Este script será usado quando você iniciar a conversa com o cliente através de uma lista.
                        </p>
                    </div>
                </div>

                {/* Inbound Script */}
                <div className="space-y-4 p-6 bg-muted/20 rounded-[2rem] border border-border relative group transition-all hover:bg-muted/30">
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                            <label htmlFor="inboundPrompt" className="text-xs font-black text-muted-foreground uppercase tracking-widest">Roteiro de Receptivo (Inbound)</label>
                            <span className="bg-muted text-muted-foreground text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase">Cliente te chamou</span>
                        </div>
                        <div className="flex gap-2">
                            <button 
                                type="button" 
                                onClick={(e) => {
                                    e.preventDefault();
                                    const out = document.getElementById('systemPrompt') as HTMLTextAreaElement;
                                    const inb = document.getElementById('inboundPrompt') as HTMLTextAreaElement;
                                    if(out && inb) inb.value = out.value;
                                    toast.info("Roteiro de prospecção copiado para o receptivo!");
                                }}
                                className="text-[10px] font-bold text-muted-foreground bg-muted hover:bg-muted-foreground/10 px-3 py-1.5 rounded-xl cursor-pointer transition-colors flex items-center gap-2 border border-border"
                            >
                                <Bot size={12} />
                                Copiar do Outbound
                            </button>
                            <button 
                                type="button" 
                                onClick={(e) => {
                                    e.preventDefault();
                                    const el = document.getElementById('inboundPrompt') as HTMLTextAreaElement;
                                    if(el) el.value = INBOUND_TEMPLATE;
                                }}
                                className="text-[10px] font-bold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-xl cursor-pointer transition-colors flex items-center gap-2 border border-primary/20"
                            >
                                <Wand2 size={12} />
                                Template Bruno
                            </button>
                        </div>
                    </div>
                    <textarea
                        name="inboundPrompt"
                        id="inboundPrompt"
                        placeholder="Deixe vazio para usar o mesmo script de prospecção..."
                        rows={8}
                        className="w-full rounded-2xl border border-border bg-background/50 px-6 py-5 text-sm font-bold text-foreground focus:border-primary focus:outline-none transition-all resize-none shadow-inner placeholder:text-muted-foreground/30 font-mono leading-relaxed"
                    ></textarea>
                    <div className="flex items-center gap-2 px-1">
                        <Sparkles size={12} className="text-muted-foreground" />
                        <p className="text-[10px] text-muted-foreground font-medium lowercase italic leading-relaxed">
                            Este script será usado quando o cliente entrar em contato primeiro. Use se o fluxo de atendimento for diferente.
                        </p>
                    </div>
                </div>
            </div>

            <div className="pt-2">
                <button
                    type="submit"
                    disabled={isPending}
                    className="group relative flex w-full items-center justify-center gap-3 rounded-[1.5rem] bg-foreground py-5 text-xs font-black uppercase tracking-widest text-background hover:bg-foreground/90 transition-all active:scale-[0.98] shadow-lg overflow-hidden disabled:opacity-70"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-primary/20 opacity-0 group-hover:opacity-100 transition-opacity animate-pulse" />
                    {isPending ? (
                        <Loader2 size={18} className="relative z-10 animate-spin" />
                    ) : (
                        <Sparkles size={18} className="relative z-10 transition-transform group-hover:rotate-12" />
                    )}
                    <span className="relative z-10">
                        {isPending ? "Criando Agente..." : "Gerar Agente de IA"}
                    </span>
                </button>
            </div>
        </form>
    );
}
