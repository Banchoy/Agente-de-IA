/**
 * Normaliza um número de telefone para o formato internacional E.164 (+DDI...)
 * Prioriza a preservação de DDIs internacionais.
 */
export function normalizePhone(rawPhone: string | null | undefined): string | null {
    if (!rawPhone) return null;

    let phone = rawPhone.trim();
    
    // Se já começa com +, removemos apenas caracteres não numéricos após o +
    if (phone.startsWith("+")) {
        const digits = phone.replace(/\D/g, "");
        return digits ? `+${digits}` : null;
    }

    // Remover todos os caracteres não numéricos
    const digits = phone.replace(/\D/g, "");
    if (!digits) return null;

    // HEURÍSTICA:
    // 1. Se tem 12 ou 13 dígitos, provavelmente já tem o DDI (ex: 55119...)
    if (digits.length >= 12) {
        return `+${digits}`;
    }

    // 2. Se tem 10 ou 11 dígitos, pode ser Brasil (sem 55) ou EUA (sem 1)
    // Por padrão, se não houver contexto, para o mercado brasileiro assumimos +55.
    // Mas para evitar quebrar EUA, verificamos se o primeiro dígito é compatível com o 1 dos EUA.
    // Como é difícil garantir sem GeoIP, vamos assumir que se tiver 11 dígitos e começar com 9, é Brasil.
    if (digits.length === 11 && digits[0] === "9") {
        return `+55${digits}`;
    }
    
    // Se tiver 10 dígitos (fixo Brasil ou EUA), vamos manter o comportamento atual mas
    // o ideal é que o scraper já envie o formato internacional.
    if (digits.length === 10 || digits.length === 11) {
        // Fallback para Brasil se não houver sinal de DDI
        return `+55${digits}`;
    }

    return `+${digits}`;
}
