
"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell
} from "recharts";
import { Users, Target, CheckCircle, TrendingUp, ArrowUpRight, Activity, Loader2 } from "lucide-react";
import { getDashboardAnalytics } from "../leads/actions";

const COLORS = ["#3b82f6", "#6366f1", "#f59e0b", "#10b981", "#ef4444"];

export default function AnalyticsPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            const res = await getDashboardAnalytics();
            if (res.success) {
                setData(res.stats);
            }
            setLoading(false);
        }
        loadData();
    }, []);

    if (loading) {
        return (
            <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-muted-foreground font-medium animate-pulse">Carregando métricas reais...</p>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="p-8 rounded-2xl border border-red-200 bg-red-50 text-red-900">
                <h1 className="text-2xl font-bold mb-2">Erro ao carregar Analytics</h1>
                <p>Não foi possível recuperar os dados reais do seu CRM.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8 pb-10">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-foreground uppercase tracking-tight">Dashboard Analítico</h1>
                    <p className="text-muted-foreground">Monitore a performance do seu funil e conversão de leads em tempo real.</p>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center text-foreground">
                    <Activity size={24} />
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-border rounded-3xl shadow-sm overflow-hidden bg-card transition-all hover:shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 text-muted-foreground">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest">Total de Leads</CardTitle>
                        <Users className="h-4 w-4" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-foreground">{data.totalLeads}</div>
                        <p className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 mt-1">
                            <ArrowUpRight className="h-3 w-3" /> Atualizado agora
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-border rounded-3xl shadow-sm overflow-hidden bg-card transition-all hover:shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 text-muted-foreground">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest">Leads Hoje</CardTitle>
                        <Target className="h-4 w-4" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-foreground">{data.leadsToday}</div>
                        <p className="text-[10px] font-bold text-blue-500 mt-1 uppercase tracking-widest">
                            Novos contatos
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-border rounded-3xl shadow-sm overflow-hidden bg-card transition-all hover:shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 text-muted-foreground">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest">Taxa de Conversão</CardTitle>
                        <CheckCircle className="h-4 w-4" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-foreground">{data.conversionRate}</div>
                        <p className="text-[10px] font-bold text-emerald-600 mt-1 uppercase tracking-widest">
                            Eficácia de Vendas
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-none rounded-3xl shadow-xl overflow-hidden bg-primary text-primary-foreground transition-all hover:scale-[1.02]">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 text-primary-foreground/70">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest">Status Geral</CardTitle>
                        <TrendingUp className="h-4 w-4" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black">Ativo</div>
                        <p className="text-[10px] font-bold mt-1 opacity-80 uppercase tracking-widest">
                            Prospecção em execução
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Leads over time */}
                <Card className="border-border rounded-3xl shadow-sm overflow-hidden bg-card">
                    <CardHeader>
                        <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Entrada de Leads (Últimos 7 dias)</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data.leadsOverTime}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#80808020" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fontWeight: 700, fill: "hsl(var(--muted-foreground))" }}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fontWeight: 700, fill: "hsl(var(--muted-foreground))" }}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: "16px", border: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--card))", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
                                    labelStyle={{ fontWeight: 900, textTransform: "uppercase", fontSize: "10px", color: "hsl(var(--foreground))" }}
                                    itemStyle={{ color: "hsl(var(--primary))", fontSize: "12px", fontWeight: "bold" }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="leads"
                                    stroke="hsl(var(--primary))"
                                    strokeWidth={4}
                                    dot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 2, stroke: "#fff" }}
                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Conversion Funnel */}
                <Card className="border-border rounded-3xl shadow-sm overflow-hidden bg-card">
                    <CardHeader>
                        <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Distribuição por Etapa</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.funnelData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#80808020" />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fontWeight: 700, fill: "hsl(var(--muted-foreground))" }}
                                    width={100}
                                />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{ borderRadius: "16px", border: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--card))" }}
                                />
                                <Bar
                                    dataKey="value"
                                    radius={[0, 10, 10, 0]}
                                    barSize={24}
                                >
                                    {data.funnelData.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Performance Highlights */}
                <Card className="border-border rounded-3xl shadow-sm overflow-hidden bg-card lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Progressão do Funil e Conversão</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="flex flex-col items-center text-center p-6 bg-muted/20 rounded-3xl border border-border/50">
                            <span className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-2">Total de Leads</span>
                            <span className="text-4xl font-black text-foreground">{data.totalLeads}</span>
                            <div className="w-full h-1.5 bg-muted rounded-full mt-4 overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: "100%" }} />
                            </div>
                        </div>

                        <div className="flex flex-col items-center text-center p-6 bg-muted/20 rounded-3xl border border-border/50">
                            <span className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-2">Novos Hoje</span>
                            <span className="text-4xl font-black text-foreground">{data.leadsToday}</span>
                            <div className="w-full h-1.5 bg-muted rounded-full mt-4 overflow-hidden">
                                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min((data.leadsToday / 50) * 100, 100)}%` }} />
                            </div>
                        </div>

                        <div className="flex flex-col items-center text-center p-6 bg-zinc-900 border-none rounded-3xl shadow-xl transform scale-[1.05]">
                            <span className="text-xs font-black text-zinc-400 uppercase tracking-wider mb-2">Conversão Real</span>
                            <span className="text-4xl font-black text-white">{data.conversionRate}</span>
                            <div className="w-full h-1.5 bg-zinc-800 rounded-full mt-4 overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: data.conversionRate }} />
                            </div>
                            <span className="text-[10px] font-black text-emerald-400 mt-2 uppercase tracking-widest">Alta Performance</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

