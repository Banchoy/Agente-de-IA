
"use client";

import React from "react";
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
import { Users, Target, CheckCircle, TrendingUp, ArrowUpRight, Activity } from "lucide-react";

const LEADS_DATA = [
    { name: "Seg", leads: 12 },
    { name: "Ter", leads: 19 },
    { name: "Qua", leads: 15 },
    { name: "Qui", leads: 22 },
    { name: "Sex", leads: 30 },
    { name: "Sáb", leads: 10 },
    { name: "Dom", leads: 8 },
];

const FUNNEL_DATA = [
    { name: "Prospecção", value: 120, fill: "#3b82f6" },
    { name: "Qualificação", value: 85, fill: "#6366f1" },
    { name: "Negociação", value: 45, fill: "#f59e0b" },
    { name: "Vendido", value: 22, fill: "#10b981" },
];

const COLORS = ["#3b82f6", "#6366f1", "#f59e0b", "#10b981", "#ef4444"];

export default function AnalyticsPage() {
    return (
        <div className="flex flex-col gap-8 pb-10">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-zinc-900 uppercase tracking-tight">Dashboard Analítico</h1>
                    <p className="text-muted-foreground">Monitore a performance do seu funil e conversão de leads.</p>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-900">
                    <Activity size={24} />
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-zinc-200 rounded-3xl shadow-sm overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 text-zinc-400">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest">Total de Leads</CardTitle>
                        <Users className="h-4 w-4" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-zinc-900">126</div>
                        <p className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 mt-1">
                            <ArrowUpRight className="h-3 w-3" /> +12% vs mês anterior
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-zinc-200 rounded-3xl shadow-sm overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 text-zinc-400">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest">Qualificados</CardTitle>
                        <Target className="h-4 w-4" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-zinc-900">85</div>
                        <p className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 mt-1">
                            <ArrowUpRight className="h-3 w-3" /> 67% de taxa de conversão
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-zinc-200 rounded-3xl shadow-sm overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 text-zinc-400">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest">Vendas (Mês)</CardTitle>
                        <CheckCircle className="h-4 w-4" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-zinc-900">22</div>
                        <p className="text-[10px] font-bold text-zinc-500 mt-1">
                            Meta: 30 (73%)
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-zinc-200 rounded-3xl shadow-sm overflow-hidden bg-zinc-900 text-white border-none shadow-xl">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 text-zinc-400">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest">ROI Estimado</CardTitle>
                        <TrendingUp className="h-4 w-4 text-emerald-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black">4.8x</div>
                        <p className="text-[10px] font-bold text-emerald-400 mt-1">
                            Performance Excelente
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Leads over time */}
                <Card className="border-zinc-200 rounded-3xl shadow-sm overflow-hidden">
                    <CardHeader>
                        <CardTitle className="text-xs font-black uppercase tracking-widest text-zinc-400">Entrada de Leads (Semana)</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={LEADS_DATA}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fontWeight: 700, fill: "#a1a1aa" }}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fontWeight: 700, fill: "#a1a1aa" }}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
                                    labelStyle={{ fontWeight: 900, textTransform: "uppercase", fontSize: "10px" }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="leads"
                                    stroke="#09090b"
                                    strokeWidth={4}
                                    dot={{ r: 4, fill: "#09090b", strokeWidth: 2, stroke: "#fff" }}
                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Conversion Funnel */}
                <Card className="border-zinc-200 rounded-3xl shadow-sm overflow-hidden">
                    <CardHeader>
                        <CardTitle className="text-xs font-black uppercase tracking-widest text-zinc-400">Funil de Conversão</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={FUNNEL_DATA} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fontWeight: 700, fill: "#a1a1aa" }}
                                    width={100}
                                />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
                                />
                                <Bar
                                    dataKey="value"
                                    radius={[0, 10, 10, 0]}
                                    barSize={40}
                                >
                                    {FUNNEL_DATA.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Leads by Source */}
                <Card className="border-zinc-200 rounded-3xl shadow-sm overflow-hidden">
                    <CardHeader>
                        <CardTitle className="text-xs font-black uppercase tracking-widest text-zinc-400">Distribuição por Origem</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px] flex items-center justify-center relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={[
                                        { name: 'Meta Ads', value: 65 },
                                        { name: 'Google Ads', value: 20 },
                                        { name: 'Orgânico', value: 15 },
                                    ]}
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {COLORS.map((color, index) => (
                                        <Cell key={`cell-${index}`} fill={color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-2xl font-black text-zinc-900 mt-4">65%</span>
                            <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest text-center">Meta Ads</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Performance by Stage */}
                <Card className="border-zinc-200 rounded-3xl shadow-sm overflow-hidden">
                    <CardHeader>
                        <CardTitle className="text-xs font-black uppercase tracking-widest text-zinc-400">Progressão do Funil</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        <div className="space-y-2">
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                <span className="text-zinc-400">Prospecção → Qualificação</span>
                                <span className="text-emerald-600">70.8%</span>
                            </div>
                            <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: "70.8%" }} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                <span className="text-zinc-400">Qualificação → Negociação</span>
                                <span className="text-emerald-600">52.9%</span>
                            </div>
                            <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500 rounded-full" style={{ width: "52.9%" }} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                <span className="text-zinc-400">Negociação → Vendido</span>
                                <span className="text-emerald-600">48.8%</span>
                            </div>
                            <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: "48.8%" }} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

