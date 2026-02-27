
"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
    Facebook,
    CheckCircle2,
    AlertCircle,
    LayoutGrid,
    RefreshCw,
    Plug,
    ChevronLeft,
    Info,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { connectMetaAccount, toggleFormIntegration, getFormsForPage } from "./actions";
import { toast } from "sonner";

const META_APP_ID = process.env.NEXT_PUBLIC_META_APP_ID;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== "undefined" ? window.location.origin : "");
const CALLBACK_URI = `${APP_URL}/api/auth/meta/callback`;
const OAUTH_SCOPES = "leads_retrieval,pages_show_list,pages_read_engagement,ads_read";

function IntegrationsInner() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState<"connect" | "select-page" | "manage-forms">("connect");
    const [pages, setPages] = useState<any[]>([]);
    const [selectedPage, setSelectedPage] = useState<any>(null);
    const [forms, setForms] = useState<any[]>([]);
    const [isDemoMode, setIsDemoMode] = useState(!META_APP_ID);

    // Processar retorno do OAuth callback
    useEffect(() => {
        const metaSuccess = searchParams.get("meta_success");
        const metaError = searchParams.get("meta_error");
        const pagesParam = searchParams.get("pages");

        if (metaSuccess === "1" && pagesParam) {
            try {
                const pagesFromCallback = JSON.parse(decodeURIComponent(pagesParam));
                setIsConnected(true);
                setPages(pagesFromCallback);
                setStep("select-page");
                toast.success("✅ Conta Meta conectada! Selecione a página que deseja integrar.");
                // Limpar query params da URL
                router.replace("/dashboard/integrations");
            } catch {
                toast.error("Erro ao processar dados do Facebook.");
            }
        }

        if (metaError) {
            const msgs: Record<string, string> = {
                denied: "Você cancelou a autorização no Facebook.",
                token_exchange: "Erro ao trocar o código de autorização. Tente novamente.",
                server: "Erro interno ao conectar com o Meta. Tente novamente.",
            };
            toast.error(msgs[metaError] || "Erro ao conectar com o Meta.");
            router.replace("/dashboard/integrations");
        }
    }, [searchParams, router]);

    const handleConnect = async () => {
        setIsLoading(true);

        if (META_APP_ID) {
            // MODO REAL: abrir popup com URL oficial do Facebook
            const width = 500;
            const height = 700;
            const left = window.screenX + (window.outerWidth - width) / 2;
            const top = window.screenY + (window.outerHeight - height) / 2;

            const oauthUrl = `https://www.facebook.com/v21.0/dialog/oauth?` +
                new URLSearchParams({
                    client_id: META_APP_ID,
                    redirect_uri: CALLBACK_URI,
                    scope: OAUTH_SCOPES,
                    response_type: "code",
                    auth_type: "rerequest",
                }).toString();

            const popup = window.open(
                oauthUrl,
                "FacebookOAuth",
                `width=${width},height=${height},left=${left},top=${top}`
            );

            if (!popup) {
                toast.error("Seu navegador bloqueou o popup. Permita popups para este site.");
                setIsLoading(false);
                return;
            }

            // O callback irá redirecionar para /dashboard/integrations?meta_success=1&pages=...
            // O useEffect acima processará o resultado
            // Monitoramos apenas se o popup foi fechado sem completar
            const closedCheck = setInterval(() => {
                if (popup.closed) {
                    clearInterval(closedCheck);
                    setIsLoading(false);
                }
            }, 800);

        } else {
            // MODO DEMO: popup simulado com HTML próprio
            const width = 480;
            const height = 680;
            const left = window.screenX + (window.outerWidth - width) / 2;
            const top = window.screenY + (window.outerHeight - height) / 2;

            const popup = window.open("about:blank", "MetaDemo", `width=${width},height=${height},left=${left},top=${top},scrollbars=no`);

            if (!popup) {
                toast.error("Popup bloqueado. Permita popups para este site.");
                setIsLoading(false);
                return;
            }

            popup.document.open();
            popup.document.write(DEMO_POPUP_HTML);
            popup.document.close();

            const handleMsg = async (event: MessageEvent) => {
                if (event.data && event.data.type === "meta-auth-success") {
                    window.removeEventListener("message", handleMsg);
                    clearInterval(closedCheck);
                    try {
                        const res = await connectMetaAccount();
                        if (res.success) {
                            setIsConnected(true);
                            setPages(res.pages);
                            setStep("select-page");
                            toast.success("⚠️ Modo Demo: usando dados fictícios. Configure META_APP_ID para login real.");
                        }
                    } catch (err: any) {
                        toast.error(err.message || "Erro ao conectar");
                    } finally {
                        setIsLoading(false);
                    }
                }
            };

            window.addEventListener("message", handleMsg);
            const closedCheck = setInterval(() => {
                if (popup.closed) {
                    clearInterval(closedCheck);
                    window.removeEventListener("message", handleMsg);
                    setIsLoading(false);
                }
            }, 800);
        }
    };

    const handleSelectPage = async (page: any) => {
        setIsLoading(true);
        setSelectedPage(page);
        try {
            const res = await getFormsForPage(page.id);
            if (res.success) {
                setForms(res.forms.map((f: any) => ({ ...f, integrated: false, page: page.name })));
                setStep("manage-forms");
            }
        } catch (error: any) {
            toast.error("Erro ao buscar formulários: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleIntegration = async (formId: string, pageName: string, currentStatus: boolean) => {
        const nextStatus = !currentStatus;
        setForms(prev => prev.map(f => f.id === formId ? { ...f, integrated: nextStatus } : f));
        try {
            const res = await toggleFormIntegration(formId, pageName, nextStatus);
            if (res.success && nextStatus) toast.success(res.message);
            else if (res.success) toast.info(res.message);
        } catch (error: any) {
            setForms(prev => prev.map(f => f.id === formId ? { ...f, integrated: currentStatus } : f));
            toast.error("Erro ao alterar integração");
        }
    };

    const handleDisconnect = () => {
        setIsConnected(false);
        setStep("connect");
        setPages([]);
        setSelectedPage(null);
        setForms([]);
        toast.info("Conta Meta desconectada.");
    };

    const handleRefreshForms = async () => {
        if (!selectedPage) return;
        setIsLoading(true);
        try {
            const res = await getFormsForPage(selectedPage.id);
            if (res.success) {
                setForms(res.forms.map((f: any) => ({ ...f, integrated: false, page: selectedPage.name })));
                toast.success("Lista de formulários atualizada!");
            }
        } catch (error: any) {
            toast.error("Erro ao atualizar formulários.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-black text-zinc-900 uppercase tracking-tighter">Integrações</h1>
                <p className="text-zinc-500 font-medium">Conecte suas fontes de leads e centralize sua operação.</p>
            </div>

            {/* Banner de modo demo */}
            {isDemoMode && (
                <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800">
                    <Info size={18} className="shrink-0 mt-0.5" />
                    <div className="text-xs font-medium leading-relaxed">
                        <strong>Modo Demonstração ativo.</strong> Para usar sua conta real do Facebook, configure as variáveis de ambiente <code className="bg-amber-100 px-1 rounded">META_APP_ID</code>, <code className="bg-amber-100 px-1 rounded">META_APP_SECRET</code> e <code className="bg-amber-100 px-1 rounded">NEXT_PUBLIC_META_APP_ID</code> no Railway e crie um App no <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="underline">Meta for Developers</a>.
                    </div>
                </div>
            )}

            <div className="grid gap-8">
                <Card className="border-zinc-200 shadow-xl rounded-3xl overflow-hidden border-none bg-white">
                    <CardHeader className="bg-zinc-900 text-white p-8">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="h-14 w-14 rounded-2xl bg-white flex items-center justify-center">
                                    <Facebook className="text-[#1877F2]" size={32} />
                                </div>
                                <div>
                                    <CardTitle className="text-2xl font-black uppercase tracking-tight">Meta Ads (Facebook/Instagram)</CardTitle>
                                    <CardDescription className="text-zinc-400 font-bold uppercase text-[10px] tracking-widest mt-1">Lead Forms Nativos · {isDemoMode ? "Modo Demo" : "Integração Real"}</CardDescription>
                                </div>
                            </div>
                            <Badge className={`rounded-full px-4 h-8 ${isConnected ? "bg-emerald-500" : "bg-zinc-700"} border-none uppercase font-black text-[10px]`}>
                                {isConnected ? "Conectado" : "Desconectado"}
                            </Badge>
                        </div>
                    </CardHeader>

                    <CardContent className="p-8 space-y-8">
                        {/* Etapa 1: Botão de conexão */}
                        {step === "connect" && (
                            <div className="flex flex-col items-center justify-center py-12 text-center space-y-6">
                                <div className="p-6 bg-zinc-50 rounded-full">
                                    <Plug size={48} className="text-zinc-300" />
                                </div>
                                <div className="max-w-md space-y-2">
                                    <h3 className="text-xl font-black text-zinc-900 uppercase tracking-tight">
                                        {isDemoMode ? "Conecte (Modo Demo)" : "Conecte sua conta empresarial"}
                                    </h3>
                                    <p className="text-zinc-500 font-medium">
                                        {isDemoMode
                                            ? "Clique para simular a conexão com dados de demonstração."
                                            : "Autorize o LeadDirector AI a acessar seus formulários e anúncios do Meta."
                                        }
                                    </p>
                                </div>
                                <Button
                                    onClick={handleConnect}
                                    disabled={isLoading}
                                    className="bg-[#1877F2] hover:bg-[#166fe5] text-white rounded-2xl h-14 px-10 font-black uppercase tracking-widest text-xs shadow-lg shadow-blue-200 transition-all active:scale-95"
                                >
                                    {isLoading ? <RefreshCw className="animate-spin mr-2" size={16} /> : <Facebook className="mr-2" size={16} />}
                                    {isDemoMode ? "Simular Conexão Meta" : "Entrar com Facebook"}
                                </Button>
                            </div>
                        )}

                        {/* Etapa 2: Seleção de página */}
                        {step === "select-page" && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <h3 className="text-xl font-black text-zinc-900 uppercase tracking-tight">Selecione a Empresa / Página</h3>
                                        <p className="text-sm text-zinc-500 font-medium">Escolha qual página você deseja integrar ao CRM.</p>
                                    </div>
                                    <Button variant="ghost" onClick={handleDisconnect} className="text-[10px] font-bold uppercase text-red-500 hover:text-red-600">
                                        Desconectar
                                    </Button>
                                </div>
                                {pages.length === 0 ? (
                                    <div className="py-8 text-center text-zinc-400 text-sm font-medium">
                                        Nenhuma página encontrada nesta conta. Certifique-se de ser administrador de pelo menos uma Página do Facebook.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {pages.map((page) => (
                                            <button
                                                key={page.id}
                                                onClick={() => handleSelectPage(page)}
                                                disabled={isLoading}
                                                className="p-6 bg-zinc-50 border border-zinc-100 rounded-3xl flex items-center gap-4 hover:border-[#1877F2] hover:bg-white transition-all text-left group disabled:opacity-50"
                                            >
                                                <div className="h-12 w-12 rounded-2xl bg-white border border-zinc-100 flex items-center justify-center overflow-hidden shrink-0">
                                                    <img src={page.image} alt={page.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${page.name}`; }} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-black text-zinc-900 group-hover:text-[#1877F2] transition-colors truncate">{page.name}</p>
                                                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{page.category}</p>
                                                </div>
                                                {isLoading && <RefreshCw size={14} className="animate-spin text-zinc-300" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Etapa 3: Gestão de formulários */}
                        {step === "manage-forms" && (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-6 bg-zinc-50 border border-zinc-100 rounded-3xl flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 rounded-2xl border-4 border-white shadow-sm overflow-hidden bg-white shrink-0">
                                                <img src={selectedPage?.image} alt={selectedPage?.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${selectedPage?.name}`; }} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase text-zinc-400 leading-tight">Empresa Selecionada</p>
                                                <p className="text-sm font-black text-zinc-900">{selectedPage?.name}</p>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase text-zinc-500 hover:text-zinc-900 gap-1" onClick={() => setStep("select-page")}>
                                            <ChevronLeft size={12} /> Alterar
                                        </Button>
                                    </div>
                                    <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-3xl flex items-center gap-4 text-emerald-700">
                                        <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                                            <CheckCircle2 size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase leading-tight">Status</p>
                                            <p className="text-sm font-black">Webhook Ativo em Tempo Real</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6 pt-4">
                                    <div className="flex items-center justify-between border-b pb-4 border-zinc-100">
                                        <div className="flex items-center gap-2">
                                            <div className="h-8 w-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-500">
                                                <LayoutGrid size={16} />
                                            </div>
                                            <h3 className="text-sm font-black uppercase tracking-wider text-zinc-900">Formulários · {selectedPage?.name}</h3>
                                        </div>
                                        <Button variant="outline" size="sm" className="rounded-xl font-bold uppercase text-[9px] h-8 gap-2 border-zinc-200" onClick={handleRefreshForms} disabled={isLoading}>
                                            <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} /> Atualizar
                                        </Button>
                                    </div>

                                    <div className="divide-y divide-zinc-50">
                                        {forms.length > 0 ? forms.map((form) => (
                                            <div key={form.id} className="py-5 flex items-center justify-between hover:bg-zinc-50/50 transition-all px-4 rounded-2xl">
                                                <div className="space-y-1 min-w-0 flex-1 mr-4">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h4 className="text-sm font-black text-zinc-900 truncate">{form.name}</h4>
                                                        <Badge variant="outline" className={`text-[8px] font-black uppercase shrink-0 ${form.status === "active" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-red-50 text-red-600 border-red-100"}`}>
                                                            {form.status === "active" ? "Publicado" : "Draft"}
                                                        </Badge>
                                                    </div>
                                                    <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                                                        ID: {form.id}
                                                        {form.leadsCount !== undefined && ` · ${form.leadsCount} leads`}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4 shrink-0">
                                                    <div className="text-right">
                                                        <p className="text-[9px] font-black uppercase text-zinc-400 mb-0.5">CRM</p>
                                                        <span className={`text-[10px] font-black uppercase ${form.integrated ? "text-emerald-600" : "text-zinc-300"}`}>
                                                            {form.integrated ? "ON" : "OFF"}
                                                        </span>
                                                    </div>
                                                    <Switch
                                                        checked={form.integrated}
                                                        onCheckedChange={() => handleToggleIntegration(form.id, form.page, form.integrated)}
                                                        className="data-[state=checked]:bg-emerald-500"
                                                    />
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="py-12 text-center opacity-50">
                                                <p className="text-sm font-bold uppercase text-zinc-400">Nenhum formulário de lead encontrado nesta página.</p>
                                                <p className="text-xs text-zinc-400 mt-1">Crie um Lead Ad no Gerenciador de Anúncios do Facebook primeiro.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex gap-3 text-blue-700">
                                    <AlertCircle size={18} className="shrink-0" />
                                    <div className="text-xs font-medium leading-tight">
                                        <strong>Dica:</strong> Ao ativar um formulário, todos os leads históricos disponíveis serão importados automaticamente para a primeira etapa do seu Funil de Vendas.
                                    </div>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

// Popup HTML para o modo demo (sem META_APP_ID configurado)
const DEMO_POPUP_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Demo: Fazer login no Facebook</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;background:#f0f2f5;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:16px}
.card{background:white;border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,.14);width:100%;max-width:400px;overflow:hidden}
.card-header{background:#1877F2;padding:20px 28px;display:flex;align-items:center;gap:12px}
.logo{font-size:24px;font-weight:900;color:white;letter-spacing:-1px}
.subtitle{font-size:11px;color:rgba(255,255,255,.75);font-weight:600;margin-top:2px}
.card-body{padding:24px 28px}
.demo-tag{background:#fff3cd;border:1px solid #ffc107;color:#856404;font-size:11px;font-weight:700;padding:6px 12px;border-radius:8px;margin-bottom:18px;text-align:center}
.step-title{font-size:17px;font-weight:800;color:#111;margin-bottom:5px}
.step-desc{font-size:13px;color:#888;margin-bottom:20px;line-height:1.5}
label{display:block;font-size:11px;font-weight:700;color:#555;margin-bottom:5px;text-transform:uppercase;letter-spacing:.5px}
input{width:100%;border:1.5px solid #e0e0e0;border-radius:10px;padding:12px 14px;font-size:15px;color:#111;margin-bottom:14px;outline:none;font-family:inherit;transition:border-color .2s}
input:focus{border-color:#1877F2}
.btn{width:100%;background:#1877F2;color:white;border:none;border-radius:12px;padding:13px;font-size:15px;font-weight:800;cursor:pointer;margin-top:4px;font-family:inherit;transition:all .2s}
.btn:hover{background:#166fe5}
.divider{height:1px;background:#f0f2f5;margin:16px 0}
.btn-secondary{width:100%;background:white;color:#1877F2;border:1.5px solid #1877F2;border-radius:12px;padding:12px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .2s}
.btn-secondary:hover{background:#f0f5ff}
.loading-wrap{text-align:center;padding:20px 0}
.spinner{width:44px;height:44px;border:4px solid #e8e8e8;border-top:4px solid #1877F2;border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 16px}
@keyframes spin{to{transform:rotate(360deg)}}
.hidden{display:none!important}
.disclaimer{font-size:11px;color:#bbb;text-align:center;margin-top:12px;line-height:1.5}
.steps{display:flex;gap:6px;margin-bottom:16px}
.step-dot{flex:1;height:4px;border-radius:4px;background:#e8e8e8;transition:background .3s}
.step-dot.active{background:#1877F2}
</style>
</head>
<body>
<div class="card">
  <div class="card-header">
    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
    <div><div class="logo">facebook</div><div class="subtitle">LeadDirector AI · Modo Demo</div></div>
  </div>
  <div class="card-body">
    <div id="step1">
      <div class="demo-tag">⚠️ MODO DEMONSTRAÇÃO — dados fictícios</div>
      <div class="steps"><div class="step-dot active"></div><div class="step-dot"></div></div>
      <div class="step-title">Simular login do Facebook</div>
      <div class="step-desc">Configure META_APP_ID para usar sua conta real.</div>
      <label>E-mail (qualquer valor)</label>
      <input type="email" id="email" placeholder="exemplo@email.com">
      <label>Senha (qualquer valor)</label>
      <input type="password" id="password" placeholder="••••••••">
      <button class="btn" onclick="next()">Continuar Demo</button>
      <div class="divider"></div>
      <button class="btn-secondary" onclick="finish()">Pular para o resultado</button>
    </div>
    <div id="step2" class="hidden">
      <div class="steps"><div class="step-dot active"></div><div class="step-dot active"></div></div>
      <div class="loading-wrap">
        <div class="spinner"></div>
        <div style="font-size:15px;font-weight:800;color:#111;margin-bottom:8px">Conectando...</div>
        <div style="font-size:13px;color:#888">Simulando autenticação com o Meta.</div>
      </div>
    </div>
  </div>
</div>
<script>
function next(){
  document.getElementById('step1').classList.add('hidden');
  document.getElementById('step2').classList.remove('hidden');
  setTimeout(function(){
    window.opener&&window.opener.postMessage({type:'meta-auth-success'},'*');
    window.close();
  },1800);
}
function finish(){
  window.opener&&window.opener.postMessage({type:'meta-auth-success'},'*');
  window.close();
}
</script>
</body>
</html>`;

export default function IntegrationsPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-zinc-400 font-medium">Carregando...</div>}>
            <IntegrationsInner />
        </Suspense>
    );
}
