
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)", "/api/protected(.*)"]);

export default clerkMiddleware(async (auth, req) => {
    if (isProtectedRoute(req)) {
        await auth.protect();

        const { orgId } = await auth();
        const url = new URL(req.url);

        // Se estiver em uma rota protegida e não tiver organização selecionada
        if (!orgId && url.pathname.startsWith("/dashboard") && url.pathname !== "/org-selection") {
            return NextResponse.redirect(new URL("/org-selection", req.url));
        }

        // Se já tem organização e está na tela de seleção, manda para o dashboard
        if (orgId && url.pathname === "/org-selection") {
            return NextResponse.redirect(new URL("/dashboard", req.url));
        }
    }
});

export const config = {
    matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
