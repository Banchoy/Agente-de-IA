import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "fallback_key");

export const ResendService = {
    /**
     * Envia um e-mail individual.
     */
    sendEmail: async (to: string, subject: string, html: string, from?: string, apiKey?: string | null) => {
        try {
            const client = apiKey ? new Resend(apiKey) : resend;
            const { data, error } = await client.emails.send({
                from: from || "Onboarding <onboarding@resend.dev>",
                to: [to],
                subject: subject,
                html: html,
            });

            if (error) {
                console.error("❌ [Resend] Erro ao enviar e-mail:", error);
                return { success: false, error };
            }

            return { success: true, data };
        } catch (err: any) {
            console.error("❌ [Resend] Erro técnico:", err.message);
            return { success: false, error: err.message };
        }
    },

    /**
     * Envia e-mails em lote.
     */
    sendBatch: async (emails: { to: string, subject: string, html: string, from?: string }[], apiKey?: string | null) => {
        try {
            const client = apiKey ? new Resend(apiKey) : resend;
            const batch = emails.map(e => ({
                from: e.from || "Onboarding <onboarding@resend.dev>",
                to: [e.to],
                subject: e.subject,
                html: e.html,
            }));

            const { data, error } = await client.batch.send(batch);

            if (error) {
                console.error("❌ [Resend] Erro no envio em lote:", error);
                return { success: false, error };
            }

            return { success: true, data };
        } catch (err: any) {
            console.error("❌ [Resend] Erro técnico no lote:", err.message);
            return { success: false, error: err.message };
        }
    }
};
