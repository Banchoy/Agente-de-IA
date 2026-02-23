import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Bot, Zap, Shield, Sparkles } from "lucide-react";

export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col bg-white text-zinc-950 font-sans selection:bg-zinc-900 selection:text-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full border-b border-zinc-100 bg-white/80 backdrop-blur-md z-50">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white">
              <Bot size={20} />
            </div>
            Agente AI
          </div>
          <div className="flex items-center gap-4">
            <Link href="/sign-in" className="text-sm font-medium hover:text-zinc-600 transition-colors">
              Entrar
            </Link>
            <Link
              href="/sign-up"
              className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-all active:scale-95"
            >
              Começar Grátis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 pt-32 pb-20">
        <section className="px-6 text-center">
          <div className="mx-auto max-w-4xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-600">
              <Sparkles size={14} className="text-zinc-900" />
              A nova era da automação inteligente
            </div>
            <h1 className="mb-6 text-5xl font-extrabold tracking-tight sm:text-7xl">
              Construa o futuro com <span className="bg-gradient-to-r from-zinc-900 to-zinc-500 bg-clip-text text-transparent">Agentes de IA</span>
            </h1>
            <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-zinc-600 sm:text-xl">
              A plataforma SaaS definitiva para gerenciar múltiplos agentes inteligentes,
              integrados ao seu fluxo de trabalho e focados em resultados reais.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/sign-up"
                className="group flex h-14 w-full items-center justify-center gap-2 rounded-full bg-zinc-900 px-8 text-base font-semibold text-white transition-all hover:bg-zinc-800 sm:w-auto"
              >
                Criar minha conta
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="#features"
                className="flex h-14 w-full items-center justify-center rounded-full border border-zinc-200 px-8 text-base font-semibold transition-all hover:bg-zinc-50 sm:w-auto"
              >
                Ver recursos
              </Link>
            </div>
          </div>
        </section>

        {/* Features Preview */}
        <section id="features" className="mt-32 border-t border-zinc-100 bg-zinc-50 py-24 px-6">
          <div className="mx-auto max-w-7xl">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              <div className="rounded-3xl border border-zinc-200 bg-white p-8 transition-all hover:shadow-xl hover:-translate-y-1">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-white">
                  <Zap size={24} />
                </div>
                <h3 className="mb-2 text-xl font-bold">Velocidade Extrema</h3>
                <p className="text-zinc-600 leading-relaxed">Resposta instantânea e processamento paralelo para escala global.</p>
              </div>
              <div className="rounded-3xl border border-zinc-200 bg-white p-8 transition-all hover:shadow-xl hover:-translate-y-1">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-white">
                  <Shield size={24} />
                </div>
                <h3 className="mb-2 text-xl font-bold">Segurança Enterprise</h3>
                <p className="text-zinc-600 leading-relaxed">Seus dados protegidos com criptografia de ponta a ponta e RLS.</p>
              </div>
              <div className="rounded-3xl border border-zinc-200 bg-white p-8 transition-all hover:shadow-xl hover:-translate-y-1">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-white">
                  <Bot size={24} />
                </div>
                <h3 className="mb-2 text-xl font-bold">Multi-Agentes</h3>
                <p className="text-zinc-600 leading-relaxed">Gerencie equipes inteiras de IA colaborando entre si.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-100 py-12 px-6">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 font-bold text-lg opacity-50">
            <Bot size={18} />
            Agente AI
          </div>
          <p className="text-sm text-zinc-500">
            © 2024 Agente AI. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}

