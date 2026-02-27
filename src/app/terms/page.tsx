"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-white text-zinc-900 py-20 px-6 sm:px-12">
            <div className="max-w-3xl mx-auto space-y-8">
                <Link href="/" className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 font-bold text-sm transition-colors uppercase tracking-widest">
                    <ChevronLeft size={16} /> Voltar para Home
                </Link>

                <h1 className="text-4xl font-black tracking-tighter uppercase">Termos de Serviço</h1>
                <p className="text-zinc-500 font-medium italic">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>

                <div className="space-y-6 text-zinc-700 leading-relaxed font-medium">
                    <section className="space-y-3">
                        <h2 className="text-xl font-black uppercase text-zinc-900">1. Aceitação dos Termos</h2>
                        <p>Ao utilizar o LeadDirector AI, você concorda com estes termos. Se você estiver usando a ferramenta em nome de uma empresa, você declara que tem autoridade para vincular tal entidade aos termos.</p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-black uppercase text-zinc-900">2. Descrição do Serviço</h2>
                        <p>O LeadDirector AI é uma plataforma de CRM focada na captura e qualificação de leads provenientes de plataformas de anúncios do Meta. O serviço inclui integração OAuth, captura via Webhooks e automação de mensagens.</p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-black uppercase text-zinc-900">3. Responsabilidades do Usuário</h2>
                        <p>Você é responsável por:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Garantir que a coleta de dados de seus formulários do Meta esteja em conformidade com as leis locais (como LGPD);</li>
                            <li>Manter a segurança de suas credenciais de acesso;</li>
                            <li>Não utilizar a ferramenta para práticas de spam ou atividades ilegais.</li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-black uppercase text-zinc-900">4. Limitação de Responsabilidade</h2>
                        <p>O LeadDirector AI não se responsabiliza por perdas de leads ou falhas decorrentes de mudanças repentinas nas APIs de terceiros (como Facebook Graph API) ou instabilidades nas redes sociais integradas.</p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-black uppercase text-zinc-900">5. Encerramento</h2>
                        <p>Reservamo-nos o direito de suspender ou encerrar contas que violem estes termos ou por solicitação do usuário a qualquer momento.</p>
                    </section>
                </div>
            </div>
        </div>
    );
}
