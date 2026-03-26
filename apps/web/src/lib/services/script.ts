import { LeadRepository } from "../repositories/lead";

function getGreeting(): string {
  const hour = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: 'numeric',
    hour12: false
  }).format(new Date());
  
  const h = parseInt(hour);
  if (h >= 5 && h < 12) return "bom dia";
  if (h >= 12 && h < 18) return "boa tarde";
  return "boa noite";
}

export const ScriptService = {
  getInitialMessage: () => {
    const greeting = getGreeting();
    const openings = [
      `Olá, ${greeting}, tudo bem?`,
      `Fala, ${greeting}! Tudo certo por aí?`,
      `Oi, tudo bem? ${greeting.charAt(0).toUpperCase() + greeting.slice(1)}!`,
      `${greeting.charAt(0).toUpperCase() + greeting.slice(1)}! Tudo certo?`
    ];
    return openings[Math.floor(Math.random() * openings.length)];
  },

  /**
   * Retorna a "Instrução de Comportamento" para a IA baseado no estado atual.
   */
  getInstruction: (state: string) => {
    switch (state) {
      case "WAITING_REPLY":
        return "Fase de Introdução: Apresente-se como Tayná, diga que viu que trabalham com este nicho e que precisa de ajuda/orientação. Pergunte se pode explicar rapidinho.";
      case "INTRO":
        return "Fase de Contexto: Diga que estava olhando a empresa deles e viu coisas legais, mas identificou pontos de melhoria que trariam mais resultados. Foque na oportunidade.";
      case "CONTEXT":
        return "Fase de Direcionamento: Diga que organizou esses pontos em uma apresentação direta e quer apresentar para o responsável comercial. Pergunte se fala com a pessoa atual ou outra.";
      case "DECISION":
        return "Fase de Agendamento: Reforce que viu oportunidades de melhoria e quer mostrar em 10-15 min. Pergunte se faz sentido para o cliente.";
      default:
        return "Converse naturalmente para qualificar o lead e agendar uma reunião.";
    }
  },

  /**
   * Determina o próximo estado da conversa.
   */
  advanceState: (currentState: string) => {
    switch (currentState) {
      case "WAITING_REPLY": return "INTRO";
      case "INTRO": return "CONTEXT";
      case "CONTEXT": return "DECISION";
      case "DECISION": return "MEETING";
      default: return currentState;
    }
  }
};
