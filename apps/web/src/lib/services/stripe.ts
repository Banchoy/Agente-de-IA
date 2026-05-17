import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("⚠️ STRIPE_SECRET_KEY não encontrada no .env");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-12-18.acacia", // ou a versão atual preferida
  appInfo: {
    name: "LeadDirector AI",
    version: "0.1.0",
  },
});
