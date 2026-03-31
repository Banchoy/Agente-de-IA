"use client";

import { useState, useRef, useTransition } from "react";
import { Send, Loader2 } from "lucide-react";
import { sendMessageManual } from "./actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface ChatInputClientProps {
    leadId: string;
}

export default function ChatInputClient({ leadId }: ChatInputClientProps) {
    const [message, setMessage] = useState("");
    const [isPending, startTransition] = useTransition();
    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const content = message.trim();
        if (!content || isPending) return;

        startTransition(async () => {
            const result = await sendMessageManual(leadId, content);
            if (result?.success) {
                setMessage("");
                router.refresh();
                toast.success("Mensagem enviada! IA desativada para modo humano.", { duration: 3000 });
            } else {
                toast.error(result?.error || "Erro ao enviar mensagem.");
            }
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e as any);
        }
    };

    return (
        <div className="p-8 border-t border-border bg-card/50 backdrop-blur-xl relative z-10">
            <form className="flex gap-4 relative" onSubmit={handleSubmit}>
                <input
                    ref={inputRef}
                    placeholder="Digite sua mensagem aqui..."
                    className="flex-1 bg-background border-2 border-border/50 rounded-2xl px-6 py-4 text-xs font-bold focus:outline-none focus:border-primary transition-all shadow-inner placeholder:font-normal placeholder:opacity-30 pr-16 disabled:opacity-50"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isPending}
                    autoComplete="off"
                />
                <button
                    type="submit"
                    disabled={isPending || !message.trim()}
                    className="absolute right-2 top-2 h-12 w-12 bg-foreground text-background rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg group disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
                >
                    {isPending ? (
                        <Loader2 size={18} className="animate-spin" />
                    ) : (
                        <Send size={18} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    )}
                </button>
            </form>
            <div className="mt-4 flex justify-center">
                <p className="text-[9px] text-muted-foreground font-black uppercase tracking-[0.2em] opacity-30">
                    Criptografia de ponta a ponta ativa
                </p>
            </div>
        </div>
    );
}
