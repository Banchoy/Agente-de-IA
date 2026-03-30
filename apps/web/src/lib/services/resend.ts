import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const ResendService = {
    /**
     * Envia um e-mail individual.
     */
    sendEmail: async (to: string, subject: string, html: string, from?: string) => {
        try {
            const { data, error } = await resend.emails.send({
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
     * Envia e-mails em lote (Beta do Resend suporta até 100 por chamada).
     */
    sendBatch: async (emails: { to: string, subject: string, html: string, from?: string }[]) => {
        try {
            const batch = emails.map(e => ({
                from: e.from || "Onboarding <onboarding@resend.dev>",
                to: [e.to],
                subject: e.subject,
                html: e.html,
            }));

            const { data, error } = await resend.batch.send(batch);

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
