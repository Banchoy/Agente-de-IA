import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { stripe } from "@/lib/services/stripe";
import { OrganizationRepository } from "@/lib/repositories/organization";

export async function POST(req: Request) {
    try {
        const { userId, orgId: clerkOrgId } = await auth();
        if (!userId || !clerkOrgId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const org = await OrganizationRepository.getByClerkId(clerkOrgId);
        if (!org) {
            return new NextResponse("Organization not found", { status: 404 });
        }

        const body = await req.json();
        const { planType } = body; // 'mensal', 'semestral', 'anual'

        let unitAmount = 0;
        let interval: "month" | "year" = "month";
        let intervalCount = 1;
        let productName = "";

        if (planType === "mensal") {
            unitAmount = 6000; // R$ 60,00
            interval = "month";
            intervalCount = 1;
            productName = "LeadDirector AI - Plano Mensal";
        } else if (planType === "semestral") {
            unitAmount = 24000; // R$ 240,00
            interval = "month";
            intervalCount = 6;
            productName = "LeadDirector AI - Plano Semestral";
        } else if (planType === "anual") {
            unitAmount = 42000; // R$ 420,00
            interval = "year";
            intervalCount = 1;
            productName = "LeadDirector AI - Plano Anual";
        } else {
            return new NextResponse("Invalid plan type", { status: 400 });
        }

        // Criar a sessão de Checkout no Stripe
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card", "boleto"], // PIX can be added if enabled in Stripe dashboard
            mode: "subscription",
            billing_address_collection: "required",
            customer_email: undefined, // Poderia passar o e-mail do clerk
            line_items: [
                {
                    price_data: {
                        currency: "BRL",
                        product_data: {
                            name: productName,
                        },
                        unit_amount: unitAmount,
                        recurring: {
                            interval: interval,
                            interval_count: intervalCount,
                        },
                    },
                    quantity: 1,
                },
            ],
            metadata: {
                organizationId: org.id,
                clerkOrgId: clerkOrgId,
                userId: userId,
                planType: planType
            },
            success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard?checkout=success`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/billing?checkout=cancelled`,
        });

        return NextResponse.json({ url: session.url });
    } catch (error: any) {
        console.error("[STRIPE_CHECKOUT_ERROR]", error);
        return new NextResponse(error.message, { status: 500 });
    }
}
