
"use client";

import React, { useState } from "react";
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
    ChevronLeft
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { connectMetaAccount, toggleFormIntegration, getFormsForPage } from "./actions";
import { toast } from "sonner";

const POPUP_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Fazer login no Facebook</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;background:#f0f2f5;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:16px}
.card{background:white;border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,.14);width:100%;max-width:400px;overflow:hidden}
.card-header{background:#1877F2;padding:24px 32px;display:flex;align-items:center;gap:12px}
.logo{font-size:26px;font-weight:900;color:white;letter-spacing:-1px}
.subtitle{font-size:12px;color:rgba(255,255,255,.75);font-weight:600;margin-top:2px}
.card-body{padding:28px 32px}
.step-title{font-size:18px;font-weight:800;color:#111;margin-bottom:6px}
.step-desc{font-size:13px;color:#888;margin-bottom:22px;line-height:1.5}
label{display:block;font-size:11px;font-weight:700;color:#555;margin-bottom:5px;text-transform:uppercase;letter-spacing:.5px}
input[type=email],input[type=password]{width:100%;border:1.5px solid #e0e0e0;border-radius:10px;padding:12px 14px;font-size:15px;color:#111;margin-bottom:14px;transition:border-color .2s;outline:none;font-family:inherit}
input:focus{border-color:#1877F2}
.btn{width:100%;background:#1877F2;color:white;border:none;border-radius:12px;padding:14px;font-size:15px;font-weight:800;cursor:pointer;transition:all .2s;margin-top:4px;font-family:inherit}
.btn:hover{background:#166fe5}
.btn:active{transform:scale(.98)}
.btn:disabled{background:#93b9f5;cursor:not-allowed}
.btn-secondary{width:100%;background:white;color:#1877F2;border:1.5px solid #1877F2;border-radius:12px;padding:13px;font-size:14px;font-weight:700;cursor:pointer;margin-bottom:10px;transition:all .2s;font-family:inherit}
.btn-secondary:hover{background:#f0f5ff}
.divider{height:1px;background:#f0f2f5;margin:18px 0}
.forgot{text-align:center;font-size:13px;color:#1877F2;cursor:pointer;margin-top:10px;font-weight:600}
.account-list{display:flex;flex-direction:column;gap:10px;margin-bottom:20px}
.account-item{display:flex;align-items:center;gap:14px;padding:13px 15px;border:1.5px solid #e8e8e8;border-radius:12px;cursor:pointer;transition:all .2s;user-select:none}
.account-item:hover{border-color:#1877F2;background:#f8f8ff}
.account-item.selected{border-color:#1877F2;background:#ebf0ff}
.account-avatar{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:16px;color:white;flex-shrink:0}
.account-name{font-size:14px;font-weight:800;color:#111}
.account-type{font-size:11px;color:#888;font-weight:600;margin-top:2px}
.check-box{width:22px;height:22px;border:2px solid #ccc;border-radius:6px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .2s;margin-left:auto}
.account-item.selected .check-box{background:#1877F2;border-color:#1877F2;color:white}
.check-mark{display:none;font-size:13px;font-weight:900;color:white}
.account-item.selected .check-mark{display:block}
.steps{display:flex;gap:6px;margin-bottom:18px}
.step-dot{flex:1;height:4px;border-radius:4px;background:#e8e8e8;transition:background .3s}
.step-dot.active{background:#1877F2}
.back-link{font-size:12px;color:#1877F2;cursor:pointer;margin-bottom:14px;display:inline-flex;align-items:center;gap:4px;font-weight:600}
.disclaimer{font-size:11px;color:#bbb;text-align:center;margin-top:14px;line-height:1.5}
.loading-wrap{text-align:center;padding:20px 0}
.spinner{width:48px;height:48px;border:4px solid #e8e8e8;border-top:4px solid #1877F2;border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 18px}
@keyframes spin{to{transform:rotate(360deg)}}
.loading-title{font-size:16px;font-weight:800;color:#111;margin-bottom:8px}
.loading-desc{font-size:13px;color:#888;line-height:1.5}
.select-hint{font-size:12px;color:#888;text-align:center;margin-bottom:14px}
.hidden{display:none!important}
</style>
</head>
<body>
<div class="card">
  <div class="card-header">
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
    <div><div class="logo">facebook</div><div class="subtitle">LeadDirector AI solicita acesso</div></div>
  </div>
  <div class="card-body">

    <!-- STEP 1: Login -->
    <div id="step1">
      <div class="steps"><div class="step-dot active"></div><div class="step-dot"></div><div class="step-dot"></div></div>
      <div class="step-title">Entre na sua conta</div>
      <div class="step-desc">Use seu Facebook para autorizar o acesso aos seus Lead Forms.</div>
      <label>E-mail ou Telefone</label>
      <input type="email" id="email" placeholder="exemplo@email.com"/>
      <label>Senha</label>
      <input type="password" id="password" placeholder="••••••••"/>
      <button class="btn" onclick="doLogin()">Entrar no Facebook</button>
      <div class="forgot">Esqueceu a senha?</div>
      <div class="divider"></div>
      <button class="btn-secondary" onclick="skipLogin()">Já estou conectado — continuar</button>
      <div class="disclaimer">Ao continuar, você aceita os Termos de Uso do Facebook.</div>
    </div>

    <!-- STEP 2: Selecionar contas -->
    <div id="step2" class="hidden">
      <div class="steps"><div class="step-dot active"></div><div class="step-dot active"></div><div class="step-dot"></div></div>
      <span class="back-link" onclick="goBack(1)">&#8592; Voltar</span>
      <div class="step-title">Selecione suas contas</div>
      <div class="step-desc">Escolha quais contas empresariais o LeadDirector poderá acessar.</div>
      <p class="select-hint">Selecione uma ou mais contas:</p>
      <div class="account-list">
        <div class="account-item" onclick="toggleAccount(this)" data-id="123456789">
          <div class="account-avatar" style="background:linear-gradient(135deg,#1877F2,#42a5f5)">N</div>
          <div><div class="account-name">Nacional Consórcios</div><div class="account-type">Conta Empresarial · Finanças</div></div>
          <div class="check-box"><span class="check-mark">&#10003;</span></div>
        </div>
        <div class="account-item" onclick="toggleAccount(this)" data-id="987654321">
          <div class="account-avatar" style="background:linear-gradient(135deg,#e67e22,#f39c12)">F</div>
          <div><div class="account-name">Financeira Direct</div><div class="account-type">Conta Empresarial · Investimentos</div></div>
          <div class="check-box"><span class="check-mark">&#10003;</span></div>
        </div>
        <div class="account-item" onclick="toggleAccount(this)" data-id="112233445">
          <div class="account-avatar" style="background:linear-gradient(135deg,#27ae60,#2ecc71)">I</div>
          <div><div class="account-name">Imóveis Premium SP</div><div class="account-type">Conta Empresarial · Imobiliário</div></div>
          <div class="check-box"><span class="check-mark">&#10003;</span></div>
        </div>
      </div>
      <button class="btn" id="continueBtn" onclick="doContinue()">Continuar com seleção</button>
      <div class="disclaimer">O LeadDirector nunca poderá publicar em seu nome ou ler mensagens privadas.</div>
    </div>

    <!-- STEP 3: Loading -->
    <div id="step3" class="hidden">
      <div class="steps"><div class="step-dot active"></div><div class="step-dot active"></div><div class="step-dot active"></div></div>
      <div class="loading-wrap">
        <div class="spinner"></div>
        <div class="loading-title">Autorizando acesso...</div>
        <div class="loading-desc">Conectando suas contas ao LeadDirector AI. Isso leva apenas alguns segundos.</div>
      </div>
    </div>

  </div>
</div>
<script>
var selectedAccounts=[];
function doLogin(){
  var email=document.getElementById('email').value;
  var pwd=document.getElementById('password').value;
  if(!email||!pwd){
    document.getElementById('email').style.borderColor='#e74c3c';
    document.getElementById('password').style.borderColor='#e74c3c';
    return;
  }
  showStep(2);
}
function skipLogin(){showStep(2);}
function goBack(n){showStep(n);}
function showStep(n){
  document.getElementById('step1').classList.toggle('hidden',n!==1);
  document.getElementById('step2').classList.toggle('hidden',n!==2);
  document.getElementById('step3').classList.toggle('hidden',n!==3);
}
function toggleAccount(el){
  el.classList.toggle('selected');
  var id=el.getAttribute('data-id');
  var idx=selectedAccounts.indexOf(id);
  if(idx>-1){selectedAccounts.splice(idx,1);}else{selectedAccounts.push(id);}
  var btn=document.getElementById('continueBtn');
  btn.textContent=selectedAccounts.length>0?'Continuar com '+selectedAccounts.length+' conta(s)':'Selecione ao menos uma conta';
  btn.disabled=selectedAccounts.length===0;
}
function doContinue(){
  if(selectedAccounts.length===0)return;
  showStep(3);
  setTimeout(function(){
    window.opener&&window.opener.postMessage({type:'meta-auth-success',accounts:selectedAccounts},'*');
    window.close();
  },2000);
}
</script>
</body>
</html>`;

export default function IntegrationsPage() {
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState<"connect" | "select-page" | "manage-forms">("connect");
    const [pages, setPages] = useState<any[]>([]);
    const [selectedPage, setSelectedPage] = useState<any>(null);
    const [forms, setForms] = useState<any[]>([]);

    const handleConnect = async () => {
        setIsLoading(true);

        const width = 480;
        const height = 680;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;

        const popup = window.open(
            "about:blank",
            "FacebookLogin",
            `width=${width},height=${height},left=${left},top=${top},scrollbars=no`
        );

        if (popup) {
            popup.document.open();
            popup.document.write(POPUP_HTML);
            popup.document.close();

            // Listen for authorization message from popup
            const handleMessage = async (event: MessageEvent) => {
                if (event.data && event.data.type === "meta-auth-success") {
                    window.removeEventListener("message", handleMessage);
                    clearInterval(closedCheck);
                    try {
                        const res = await connectMetaAccount();
                        if (res.success) {
                            setIsConnected(true);
                            setPages(res.pages);
                            setStep("select-page");
                            toast.success(`Conta Meta autorizada! ${event.data.accounts?.length || 1} conta(s) conectada(s).`);
                        }
                    } catch (error: any) {
                        toast.error(error.message || "Erro ao conectar conta Meta");
                    } finally {
                        setIsLoading(false);
                    }
                }
            };

            window.addEventListener("message", handleMessage);

            // Fallback: user closed popup without authorizing
            const closedCheck = setInterval(() => {
                if (popup.closed) {
                    clearInterval(closedCheck);
                    window.removeEventListener("message", handleMessage);
                    setIsLoading(false);
                }
            }, 800);
        } else {
            toast.error("Seu navegador bloqueou o popup. Permita popups para este site e tente novamente.");
            setIsLoading(false);
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
            toast.error("Erro ao buscar formulários.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleIntegration = async (formId: string, pageName: string, currentStatus: boolean) => {
        const nextStatus = !currentStatus;
        setForms(prev => prev.map(f => f.id === formId ? { ...f, integrated: nextStatus } : f));

        try {
            const res = await toggleFormIntegration(formId, pageName, nextStatus);
            if (res.success && nextStatus) {
                toast.success(res.message);
            } else if (res.success) {
                toast.info(res.message);
            }
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
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black text-zinc-900 uppercase tracking-tighter">Integrações</h1>
                <p className="text-zinc-500 font-medium">Conecte suas fontes de leads e centralize sua operação.</p>
            </div>

            <div className="grid gap-8">
                {/* Meta Ads Card */}
                <Card className="border-zinc-200 shadow-xl rounded-3xl overflow-hidden border-none bg-white">
                    <CardHeader className="bg-zinc-900 text-white p-8">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="h-14 w-14 rounded-2xl bg-white flex items-center justify-center">
                                    <Facebook className="text-[#1877F2]" size={32} />
                                </div>
                                <div>
                                    <CardTitle className="text-2xl font-black uppercase tracking-tight">Meta Ads (Facebook/Instagram)</CardTitle>
                                    <CardDescription className="text-zinc-400 font-bold uppercase text-[10px] tracking-widest mt-1">Lead Forms Nativos</CardDescription>
                                </div>
                            </div>
                            <Badge className={`rounded-full px-4 h-8 ${isConnected ? "bg-emerald-500" : "bg-zinc-700"} border-none uppercase font-black text-[10px]`}>
                                {isConnected ? "Conectado" : "Desconectado"}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8 space-y-8">
                        {step === "connect" && (
                            <div className="flex flex-col items-center justify-center py-12 text-center space-y-6">
                                <div className="p-6 bg-zinc-50 rounded-full">
                                    <Plug size={48} className="text-zinc-300" />
                                </div>
                                <div className="max-w-md space-y-2">
                                    <h3 className="text-xl font-black text-zinc-900 uppercase tracking-tight">Conecte sua conta empresarial</h3>
                                    <p className="text-zinc-500 font-medium">Ao conectar, o LeadDirector terá permissão para monitorar seus formulários e injetar novos leads automaticamente no seu CRM.</p>
                                </div>
                                <Button
                                    onClick={handleConnect}
                                    disabled={isLoading}
                                    className="bg-[#1877F2] hover:bg-[#166fe5] text-white rounded-2xl h-14 px-10 font-black uppercase tracking-widest text-xs shadow-lg shadow-blue-200 transition-all active:scale-95"
                                >
                                    {isLoading ? <RefreshCw className="animate-spin mr-2" /> : <Facebook className="mr-2" />}
                                    Conectar via Facebook
                                </Button>
                            </div>
                        )}

                        {step === "select-page" && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-2">
                                        <h3 className="text-xl font-black text-zinc-900 uppercase tracking-tight">Selecione a Empresa / Página</h3>
                                        <p className="text-sm text-zinc-500 font-medium">Escolha qual ativo você deseja integrar ao CRM.</p>
                                    </div>
                                    <Button variant="ghost" onClick={handleDisconnect} className="text-[10px] font-bold uppercase text-red-500 hover:text-red-600">Sair</Button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {pages.map((page) => (
                                        <button
                                            key={page.id}
                                            onClick={() => handleSelectPage(page)}
                                            disabled={isLoading}
                                            className="p-6 bg-zinc-50 border border-zinc-100 rounded-3xl flex items-center gap-4 hover:border-[#1877F2] hover:bg-white transition-all text-left group"
                                        >
                                            <div className="h-12 w-12 rounded-2xl bg-white border border-zinc-100 flex items-center justify-center overflow-hidden">
                                                <img src={page.image} alt={page.name} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-black text-zinc-900 group-hover:text-[#1877F2] transition-colors">{page.name}</p>
                                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{page.category}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {step === "manage-forms" && (
                            <>
                                {/* Account Info */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-6 bg-zinc-50 border border-zinc-100 rounded-3xl flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 rounded-2xl border-4 border-white shadow-sm overflow-hidden bg-white">
                                                <img src={selectedPage?.image} alt={selectedPage?.name} className="w-full h-full object-cover" />
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
                                        <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                                            <CheckCircle2 size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase leading-tight">Status Sincronização</p>
                                            <p className="text-sm font-black">Webhook Ativo em Tempo Real</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Forms Management */}
                                <div className="space-y-6 pt-4">
                                    <div className="flex items-center justify-between border-b pb-4 border-zinc-100">
                                        <div className="flex items-center gap-2">
                                            <div className="h-8 w-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-500">
                                                <LayoutGrid size={16} />
                                            </div>
                                            <h3 className="text-sm font-black uppercase tracking-wider text-zinc-900">Formulários da {selectedPage?.name}</h3>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="rounded-xl font-bold uppercase text-[9px] h-8 gap-2 border-zinc-200"
                                            onClick={handleRefreshForms}
                                            disabled={isLoading}
                                        >
                                            <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} /> Atualizar Lista
                                        </Button>
                                    </div>

                                    <div className="divide-y divide-zinc-50">
                                        {forms.length > 0 ? (
                                            forms.map((form) => (
                                                <div key={form.id} className="py-6 flex items-center justify-between hover:bg-zinc-50/50 transition-all px-4 rounded-2xl group">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="text-sm font-black text-zinc-900">{form.name}</h4>
                                                            <Badge variant="outline" className={`text-[8px] font-black uppercase ${form.status === "active" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-red-50 text-red-600 border-red-100"}`}>
                                                                {form.status === "active" ? "Publicado" : "Draft"}
                                                            </Badge>
                                                        </div>
                                                        <div className="flex items-center gap-3 text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                                                            <span>ID: {form.id}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-6">
                                                        <div className="text-right">
                                                            <p className="text-[9px] font-black uppercase text-zinc-400 mb-0.5">Integrar CRM</p>
                                                            <span className={`text-[10px] font-black uppercase ${form.integrated ? "text-emerald-600" : "text-zinc-300"}`}>
                                                                {form.integrated ? "Ativado" : "Inativo"}
                                                            </span>
                                                        </div>
                                                        <Switch
                                                            checked={form.integrated}
                                                            onCheckedChange={() => handleToggleIntegration(form.id, form.page, form.integrated)}
                                                            className="data-[state=checked]:bg-emerald-500"
                                                        />
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="py-12 text-center space-y-2 opacity-50">
                                                <p className="text-sm font-bold uppercase text-zinc-400">Nenhum formulário encontrado nesta página.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex gap-3 text-blue-700">
                                    <AlertCircle size={18} className="shrink-0" />
                                    <div className="text-xs font-medium leading-tight">
                                        <strong>Dica:</strong> Ao ativar um formulário, todos os leads históricos dos últimos 90 dias serão importados automaticamente para a primeira etapa do seu Funil de Vendas.
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
