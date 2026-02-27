import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { metaIntegrations, organizations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";

const META_APP_ID = process.env.META_APP_ID!;
const META_APP_SECRET = process.env.META_APP_SECRET!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const REDIRECT_URI = `${APP_URL}/api/auth/meta/callback`;
const GRAPH_VERSION = "v21.0";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    // Usuário negou permissão no Facebook
    if (error || !code) {
        return NextResponse.redirect(
            `${APP_URL}/dashboard/integrations?meta_error=denied`
        );
    }

    try {
        // 1. Trocar o code por um short-lived access token
        const tokenRes = await fetch(
            `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token?` +
            new URLSearchParams({
                client_id: META_APP_ID,
                client_secret: META_APP_SECRET,
                redirect_uri: REDIRECT_URI,
                code,
            })
        );

        if (!tokenRes.ok) {
            const err = await tokenRes.json();
            console.error("Erro ao trocar code por token:", err);
            return NextResponse.redirect(`${APP_URL}/dashboard/integrations?meta_error=token_exchange`);
        }

        const { access_token: shortToken } = await tokenRes.json();

        // 2. Trocar short-lived token por long-lived token (60 dias)
        const longTokenRes = await fetch(
            `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token?` +
            new URLSearchParams({
                grant_type: "fb_exchange_token",
                client_id: META_APP_ID,
                client_secret: META_APP_SECRET,
                fb_exchange_token: shortToken,
            })
        );

        const { access_token: longToken } = await longTokenRes.json();

        // 3. Buscar as páginas reais do usuário
        const pagesRes = await fetch(
            `https://graph.facebook.com/${GRAPH_VERSION}/me/accounts?` +
            new URLSearchParams({
                access_token: longToken,
                fields: "id,name,category,picture,access_token",
            })
        );

        const pagesData = await pagesRes.json();
        const pages = (pagesData.data || []).map((p: any) => ({
            id: p.id,
            name: p.name,
            category: p.category || "Página",
            image: p.picture?.data?.url || `https://api.dicebear.com/7.x/initials/svg?seed=${p.name}`,
            pageAccessToken: p.access_token, // Token específico da página
        }));

        // 4. Identificar a organização do Clerk e salvar o token
        const { orgId } = await auth();
        if (orgId) {
            const org = await db.query.organizations.findFirst({
                where: eq(organizations.clerkOrgId, orgId),
            });

            if (org) {
                await db
                    .insert(metaIntegrations)
                    .values({
                        organizationId: org.id,
                        accessToken: longToken,
                        webhookVerifyToken: Math.random().toString(36).substring(7),
                    })
                    .onConflictDoUpdate({
                        target: metaIntegrations.organizationId,
                        set: { accessToken: longToken, updatedAt: new Date() },
                    });
            }
        }

        // 5. Redirecionar de volta com as páginas codificadas na URL
        const pagesEncoded = encodeURIComponent(JSON.stringify(pages));
        const response = NextResponse.redirect(
            `${APP_URL}/dashboard/integrations?meta_success=1&pages=${pagesEncoded}`
        );

        return response;
    } catch (err: any) {
        console.error("Erro no callback Meta OAuth:", err);
        return NextResponse.redirect(`${APP_URL}/dashboard/integrations?meta_error=server`);
    }
}
