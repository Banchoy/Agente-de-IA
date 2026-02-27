"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-white text-zinc-900 py-20 px-6 sm:px-12">
            <div className="max-w-3xl mx-auto space-y-8">
                <Link href="/" className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 font-bold text-sm transition-colors uppercase tracking-widest">
                    <ChevronLeft size={16} /> Voltar para Home
                </Link>

                <h1 className="text-4xl font-black tracking-tighter uppercase">Política de Privacidade</h1>
                <p className="text-zinc-500 font-medium italic">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>

                <div className="space-y-6 text-zinc-700 leading-relaxed font-medium">
                    <section className="space-y-3">
                        <h2 className="text-xl font-black uppercase text-zinc-900">1. Introdução</h2>
                        <p>O LeadDirector AI está comprometido em proteger sua privacidade. Esta Política de Privacidade explica como coletamos, usamos e protegemos as informações quando você utiliza nossa plataforma de CRM e integrações com o Meta (Facebook/Instagram).</p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-black uppercase text-zinc-900">2. Coleta de Dados via Meta Lead Ads</h2>
                        <p>Ao integrar sua conta do Meta com o LeadDirector AI, nossa aplicação coleta dados fornecidos voluntariamente por usuários em seus formulários de anúncios (Lead Ads). Esses dados podem incluir nome, e-mail, telefone e outras informações personalizadas configuradas em seus formulários.</p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-black uppercase text-zinc-900">3. Uso das Informações</h2>
                        <p>As informações coletadas são usadas exclusivamente para:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Centralizar a gestão de leads no seu funil de vendas;</li>
                            <li>Permitir que nossa IA realize a qualificação automática dos leads;</li>
                            <li>Facilitar o contato comercial via WhatsApp ou e-mail.</li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-black uppercase text-zinc-900">4. Compartilhamento e Retenção</h2>
                        <p>Não compartilhamos, vendemos ou alugamos seus dados para terceiros. Os dados são mantidos em nossa infraestrutura segura enquanto sua conta estiver ativa ou conforme necessário para os fins descritos nesta política.</p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-black uppercase text-zinc-900">5. Segurança</h2>
                        <p>Implementamos medidas técnicas e organizacionais para proteger seus dados, incluindo criptografia e isolamento de dados por organização (multi-tenancy).</p>
                    </section>
                </div>
            </div>
        </div>
    );
}
