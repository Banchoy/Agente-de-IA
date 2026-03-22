
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)", "/api/protected(.*)"]);

export default clerkMiddleware(async (auth, req) => {
    if (isProtectedRoute(req)) {
        await auth.protect();

        const { orgId } = await auth();

        // Multi-tenancy enforcement
        // If user is logged in but has no active organization, and is trying to access dashboard
        // they might need to be redirected to an org selection or creation page.
        // For now, we just ensure they are authenticated.

        if (!orgId && req.nextUrl.pathname !== "/org-selection") {
            return NextResponse.redirect(new URL("/org-selection", req.url));
        }
    }
});

export const config = {
    matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
