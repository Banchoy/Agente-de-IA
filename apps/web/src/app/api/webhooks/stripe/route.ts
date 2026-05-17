import { NextResponse } from "next/server";
import { stripe } from "@/lib/services/stripe";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

export async function POST(req: Request) {
    const body = await req.text();
    const signature = headers().get("Stripe-Signature") as string;

    let event;

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET || ""
        );
    } catch (error: any) {
        console.error(`[STRIPE_WEBHOOK_ERROR]`, error.message);
        return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 });
    }

    const session = event.data.object as any;

    if (event.type === "checkout.session.completed") {
        // Recuperar metadados passados na criação do checkout
        const metadata = session.metadata;

        if (metadata?.organizationId) {
            await db.update(organizations)
                .set({
                    subscriptionStatus: "active",
                    stripeCustomerId: session.customer,
                    stripeSubscriptionId: session.subscription,
                    planId: metadata.planType
                })
                .where(eq(organizations.id, metadata.organizationId));
            
            console.log(`✅ [STRIPE] Pagamento aprovado para org: ${metadata.organizationId}`);
        }
    }

    if (event.type === "customer.subscription.deleted") {
        // Encontrar a org pelo subscription ID e cancelar
        await db.update(organizations)
            .set({ subscriptionStatus: "canceled" })
            .where(eq(organizations.stripeSubscriptionId, session.id));
        
        console.log(`❌ [STRIPE] Assinatura cancelada: ${session.id}`);
    }

    if (event.type === "customer.subscription.updated") {
        // Se a assinatura ficou inadimplente etc
        if (session.status !== "active" && session.status !== "trialing") {
            await db.update(organizations)
                .set({ subscriptionStatus: session.status }) // past_due, unpaid, etc
                .where(eq(organizations.stripeSubscriptionId, session.id));
            
            console.log(`⚠️ [STRIPE] Status da assinatura alterado: ${session.status} para ${session.id}`);
        } else if (session.status === "active") {
            await db.update(organizations)
                .set({ subscriptionStatus: "active" })
                .where(eq(organizations.stripeSubscriptionId, session.id));
        }
    }

    return new NextResponse(null, { status: 200 });
}
