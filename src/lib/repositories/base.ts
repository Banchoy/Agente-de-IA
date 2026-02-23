
import { db } from "@/lib/db";
import { users, organizations } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";

// Helper to enforce RLS via session variable "app.current_org_id"
// This function should be used when you want to execute a query within the context of the current request's organization.
// However, since we are server-side, we can often just filter by `where` clause.
// But the user engaged RLS in Supabase, so we should set the config if we want RLS to work for the connection session.
// Note: "postgres.js" with "drizzle" often shares the connection, so setting session variables
// requires a transaction or a dedicated session. 

// A better pattern for this specific request:
// "Utilizar current_setting('app.current_org_id') para isolamento"
// We can achieve this by wrapping our DB calls in a transaction that first sets the local config.

export async function withOrgContext<T>(
    callback: (tx: any) => Promise<T>
): Promise<T> {
    const { orgId } = await auth();

    if (!orgId) {
        throw new Error("No Organization Context Found");
    }

    return await db.transaction(async (tx) => {
        // Set the configuration parameter for the current transaction
        await tx.execute(sql`SELECT set_config('app.current_org_id', ${orgId}, true)`);

        // Execute the callback with the transaction object
        return await callback(tx);
    });
}

// Example usage in User Repository
export const UserRepository = {
    getCurrentUser: async () => {
        const { userId, orgId } = await auth();
        if (!userId) return null;

        // Use withOrgContext to ensure RLS policies (if any) are respected 
        // and to align with the requirement.
        return await withOrgContext(async (tx) => {
            return await tx.query.users.findFirst({
                where: eq(users.clerkUserId, userId)
            });
        });
    },

    create: async (data: typeof users.$inferInsert) => {
        // Logic
    }
};
