import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight, Bot, Zap, Shield, Sparkles, CheckCircle2,
  Facebook, MessageSquare, BarChart3, Users, Workflow,
  ChevronDown, Star, TrendingUp, Clock, Target
} from "lucide-react";

export const dynamic = "force-dynamic";

const features = [
  { icon: Zap, title: "Captura Automática de Leads", desc: "Conecte seus formulários do Meta Ads e receba leads instantaneamente no CRM, sem copiar e colar." },
  { icon: Bot, title: "Qualificação por IA", desc: "Nossa IA analisa cada lead, define um score e sugere o próximo passo, economizando horas por dia." },
  { icon: MessageSquare, title: "Disparo Automático no WhatsApp", desc: "Assim que o lead entra, um agente de IA envia a mensagem certa no momento ideal." },
  { icon: BarChart3, title: "Analytics em Tempo Real", desc: "Acompanhe taxa de conversão, origem de leads e desempenho do funil com dashboards dinâmicos." },
  { icon: Workflow, title: "Funil Visual Kanban", desc: "Mova leads entre etapas com drag-and-drop. Veja o pipeline completo de vendas em segundos." },
  { icon: Shield, title: "Segurança Enterprise", desc: "Multi-tenancy com RLS, dados criptografados e isolamento total por organização." },
];

const steps = [
  { num: "01", title: "Conecte sua conta Meta", desc: "Com um clique, vincule sua conta do Facebook Business e selecione os formulários de Lead que deseja monitorar." },
  { num: "02", title: "Leads entram automaticamente", desc: "Cada novo lead do seu formulário de anúncio aparece instantaneamente no seu Kanban de Vendas." },
  { num: "03", title: "A IA qualifica e agenda", desc: "Nossos agentes de IA analisam o perfil, enviam uma mensagem de WhatsApp e já preparam o lead para venda." },
  { num: "04", title: "Você só fecha negócio", desc: "Foque apenas nos leads quentes. Todo o trabalho operacional fica com a nossa plataforma." },
];

const industries = [
  { emoji: "🏠", title: "Consórcios & Financeiras", desc: "Qualifique automaticamente clientes com interesse em crédito imobiliário, auto ou livre." },
  { emoji: "🏥", title: "Clínicas & Saúde", desc: "Capture leads de campanhas de implante, ortodontia ou consultas e agende com IA." },
  { emoji: "🏗️", title: "Imobiliárias & Construtoras", desc: "Gerencie centenas de leads de lançamentos sem perder nenhum contato no caos." },
  { emoji: "🎓", title: "Educação", desc: "Inscrições de vestibulares e cursos com follow-up automático por WhatsApp." },
  { emoji: "🚗", title: "Concessionárias", desc: "Rastreie leads de test drive e converta interesse em vendas com jornadas automatizadas." },
  { emoji: "⚡", title: "Qualquer Negócio Local", desc: "Se você anuncia no Meta, nosso CRM cuida do restante, independente do seu nicho." },
];

const faqs = [
  { q: "Preciso de conhecimento técnico?", a: "Não. O LeadDirector AI foi criado para ser usado por qualquer gestor ou dono de negócio, sem precisar de TI." },
  { q: "Como funciona a integração com o Meta?", a: "Você conecta sua conta Meta com um clique, seleciona seus formulários de lead e todos os novos contatos entram automaticamente no CRM." },
  { q: "O sistema funciona com WhatsApp?", a: "Sim. Integramos com o WhatsApp via Evolution API. O agente de IA envia mensagens personalizadas automaticamente." },
  { q: "Meus dados estão seguros?", a: "Absolutamente. Usamos isolamento multi-tenant com Row Level Security no banco de dados Supabase, e nenhuma organização acessa dados de outra." },
];

export default async function Home() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-col bg-white text-zinc-950 font-sans">
      {/* Navigation */}
      <nav className="fixed top-0 w-full border-b border-zinc-100 bg-white/90 backdrop-blur-md z-50">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5 font-black text-lg tracking-tight">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-200">
              <Sparkles size={16} />
            </div>
            LeadDirector<span className="text-emerald-600"> AI</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-bold text-zinc-500">
            <a href="#como-funciona" className="hover:text-zinc-900 transition-colors">Como Funciona</a>
            <a href="#recursos" className="hover:text-zinc-900 transition-colors">Recursos</a>
            <a href="#segmentos" className="hover:text-zinc-900 transition-colors">Segmentos</a>
            <a href="#faq" className="hover:text-zinc-900 transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/sign-in" className="text-sm font-bold text-zinc-600 hover:text-zinc-900 transition-colors px-4 py-2">
              Entrar
            </Link>
            <Link
              href="/sign-up"
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white hover:bg-emerald-700 transition-all active:scale-95 shadow-lg shadow-emerald-200"
            >
              Começar Grátis
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="pt-32 pb-24 px-6 text-center overflow-hidden relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(16,185,129,0.10),transparent)] pointer-events-none" />
          <div className="mx-auto max-w-5xl relative">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-4 py-1.5 text-[11px] font-black uppercase tracking-widest text-emerald-700">
              <Sparkles size={12} />
              CRM Inteligente com IA para Meta Ads
            </div>
            <h1 className="mb-6 text-6xl font-black tracking-tighter sm:text-7xl lg:text-8xl text-zinc-900 leading-[0.95]">
              Transforme seus [TESTE]<br />
              <span className="relative inline-block">
                <span className="text-emerald-600">Leads em Lucro</span>
                <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 400 12" fill="none"><path d="M2 10C60 4 180 1 398 6" stroke="#10b981" strokeWidth="3" strokeLinecap="round" /></svg>
              </span>
            </h1>
            <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-zinc-500 font-medium">
              Captura automática de leads do Meta Ads, qualificação por IA e disparo de WhatsApp.
              Seu time de vendas fecha mais negócios — sem esforço manual.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/sign-up"
                className="group flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-8 text-base font-black text-white transition-all hover:bg-zinc-800 sm:w-auto shadow-xl shadow-zinc-200"
              >
                Criar minha conta grátis
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <a
                href="#como-funciona"
                className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-zinc-200 px-8 text-base font-semibold transition-all hover:bg-zinc-50 sm:w-auto"
              >
                Ver como funciona <ChevronDown size={16} />
              </a>
            </div>

            {/* Social Proof Strip */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-zinc-400">
              <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-500" /> Sem cartão de crédito</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-500" /> Setup em menos de 5 minutos</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-500" /> Suporte em português</span>
            </div>

            {/* Stats */}
            <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto">
              {[
                { value: "+340%", label: "Mais conversões" },
                { value: "< 5min", label: "Setup inicial" },
                { value: "24/7", label: "IA trabalhando" },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <div className="text-3xl font-black text-zinc-900">{s.value}</div>
                  <div className="text-xs font-bold uppercase tracking-widest text-zinc-400 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="como-funciona" className="py-24 px-6 bg-zinc-950 text-white">
          <div className="mx-auto max-w-7xl">
            <div className="text-center mb-16">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 px-4 py-1.5 text-[11px] font-black uppercase tracking-widest text-zinc-400">
                <Target size={12} />
                Processo Simples
              </div>
              <h2 className="text-4xl font-black tracking-tight">Como o LeadDirector AI funciona</h2>
              <p className="text-zinc-400 mt-3 max-w-lg mx-auto font-medium">Do anúncio no Facebook ao fechamento da venda em 4 passos simples.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {steps.map((step) => (
                <div key={step.num} className="relative p-8 rounded-3xl bg-zinc-900 border border-zinc-800 hover:border-emerald-500/30 transition-all group">
                  <div className="text-5xl font-black text-zinc-800 group-hover:text-emerald-900/50 transition-colors mb-4">{step.num}</div>
                  <h3 className="text-base font-black text-white mb-2">{step.title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed font-medium">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="recursos" className="py-24 px-6 bg-zinc-50">
          <div className="mx-auto max-w-7xl">
            <div className="text-center mb-16">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-[11px] font-black uppercase tracking-widest text-zinc-600">
                <Zap size={12} className="text-emerald-600" />
                Recursos Poderosos
              </div>
              <h2 className="text-4xl font-black tracking-tight text-zinc-900">Tudo que você precisa em um único lugar</h2>
              <p className="text-zinc-500 mt-3 max-w-lg mx-auto font-medium">Do CRM ao WhatsApp, da IA ao Analytics. Sua operação de vendas completa.</p>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <div key={f.title} className="rounded-3xl border border-zinc-200 bg-white p-8 transition-all hover:shadow-xl hover:-translate-y-1 group">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                    <f.icon size={22} />
                  </div>
                  <h3 className="mb-2 text-base font-black text-zinc-900">{f.title}</h3>
                  <p className="text-zinc-500 leading-relaxed text-sm font-medium">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Meta Integration Highlight */}
        <section className="py-24 px-6 bg-white">
          <div className="mx-auto max-w-7xl">
            <div className="rounded-3xl bg-[#1877F2]/5 border border-[#1877F2]/10 p-12 lg:p-16 flex flex-col lg:flex-row items-center gap-12">
              <div className="flex-1 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-[#1877F2] flex items-center justify-center text-white">
                    <Facebook size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#1877F2]">Integração Nativa</p>
                    <h3 className="text-xl font-black text-zinc-900">Meta Ads Lead Forms</h3>
                  </div>
                </div>
                <p className="text-zinc-600 leading-relaxed max-w-md font-medium">
                  Conecte seus formulários de lead do Facebook e Instagram em segundos. Cada novo lead entra automaticamente no seu funil de vendas — sem planilhas, sem copiar e colar.
                </p>
                <ul className="space-y-3">
                  {["Sincronização de todos os leads históricos (Backfill)", "Novos leads em tempo real via Webhooks", "Mapeamento automático de campos", "Suporte a múltiplas páginas e formulários"].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm font-medium text-zinc-700">
                      <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/sign-up" className="inline-flex items-center gap-2 bg-[#1877F2] text-white px-6 py-3 rounded-xl font-black text-sm hover:bg-[#166fe5] transition-all">
                  Conectar Meta Ads <ArrowRight size={16} />
                </Link>
              </div>
              <div className="flex-1 flex items-center justify-center">
                <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm border border-zinc-100">
                  <div className="space-y-3">
                    {[
                      { name: "Ricardo Almeida", status: "Qualificado", time: "Agora" },
                      { name: "Juliana Costa", status: "Em Negociação", time: "2min" },
                      { name: "Marcos Oliveira", status: "Novo Lead", time: "8min" },
                    ].map((lead) => (
                      <div key={lead.name} className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-50">
                        <div className="h-9 w-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-black text-sm">
                          {lead.name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-zinc-900 truncate">{lead.name}</p>
                          <p className="text-[11px] font-bold text-zinc-400">{lead.status}</p>
                        </div>
                        <span className="text-[10px] text-zinc-400 font-bold">{lead.time}</span>
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      </div>
                    ))}
                    <div className="text-center pt-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#1877F2]">⚡ 14 leads novos hoje</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Industries */}
        <section id="segmentos" className="py-24 px-6 bg-zinc-950 text-white">
          <div className="mx-auto max-w-7xl">
            <div className="text-center mb-16">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 px-4 py-1.5 text-[11px] font-black uppercase tracking-widest text-zinc-400">
                <TrendingUp size={12} />
                Segmentos Atendidos
              </div>
              <h2 className="text-4xl font-black tracking-tight">Funciona para o seu negócio</h2>
              <p className="text-zinc-400 mt-3 font-medium">Se você capta leads via Meta Ads, o LeadDirector AI é para você.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {industries.map((ind) => (
                <div key={ind.title} className="p-8 rounded-3xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 transition-all group">
                  <div className="text-4xl mb-4">{ind.emoji}</div>
                  <h3 className="text-base font-black text-white mb-2">{ind.title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed font-medium">{ind.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonial / CTA Strip */}
        <section className="py-16 px-6 bg-emerald-600 text-white">
          <div className="mx-auto max-w-5xl flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="space-y-2 text-center lg:text-left">
              <div className="flex items-center gap-1 justify-center lg:justify-start mb-1">
                {[1, 2, 3, 4, 5].map(i => <Star key={i} size={16} className="fill-yellow-400 text-yellow-400" />)}
              </div>
              <p className="text-2xl font-black leading-tight max-w-xl">
                "Em 30 dias, saímos de 8% para 27% de conversão de leads.<br className="hidden lg:block" /> A IA qualificou tudo que o time não tinha tempo."
              </p>
              <p className="text-emerald-100 font-bold text-sm">— Carlos M., Gestor Comercial · Consórcio Nacional</p>
            </div>
            <Link
              href="/sign-up"
              className="shrink-0 bg-white text-emerald-700 rounded-2xl px-8 py-4 font-black text-sm hover:bg-emerald-50 transition-all shadow-xl whitespace-nowrap flex items-center gap-2"
            >
              Começar Agora <ArrowRight size={16} />
            </Link>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="py-24 px-6 bg-white">
          <div className="mx-auto max-w-3xl">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-black tracking-tight text-zinc-900">Perguntas Frequentes</h2>
            </div>
            <div className="space-y-4">
              {faqs.map((faq) => (
                <div key={faq.q} className="rounded-2xl border border-zinc-100 bg-zinc-50 p-6 hover:border-zinc-200 transition-all">
                  <h3 className="text-base font-black text-zinc-900 mb-2">{faq.q}</h3>
                  <p className="text-sm text-zinc-500 leading-relaxed font-medium">{faq.a}</p>
                </div>
              ))}
            </div>
            <div className="mt-12 text-center p-10 rounded-3xl bg-zinc-950 text-white space-y-4">
              <h3 className="text-2xl font-black">Pronto para automatizar seu funil?</h3>
              <p className="text-zinc-400 font-medium">Crie sua conta gratuitamente e comece em 5 minutos.</p>
              <Link href="/sign-up" className="inline-flex items-center gap-2 bg-emerald-500 text-white rounded-xl px-8 py-3 font-black text-sm hover:bg-emerald-400 transition-all">
                Criar conta grátis <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-100 py-12 px-6 bg-white">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2.5 font-black text-sm uppercase tracking-widest">
            <div className="h-7 w-7 rounded-lg bg-emerald-600 flex items-center justify-center">
              <Sparkles size={14} className="text-white" />
            </div>
            <span className="text-zinc-900">LeadDirector AI</span>
          </div>
          <div className="flex items-center gap-6 text-xs font-bold text-zinc-400 uppercase tracking-widest">
            <a href="#recursos" className="hover:text-zinc-700 transition-colors">Recursos</a>
            <a href="#segmentos" className="hover:text-zinc-700 transition-colors">Segmentos</a>
            <a href="#faq" className="hover:text-zinc-700 transition-colors">FAQ</a>
          </div>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
            © {new Date().getFullYear()} LeadDirector AI. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
