import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export interface RoutingQueue {
    users: string[]; // UUIDs dos usuários na roleta
    lastAssignedIndex: number;
}

export interface RoutingConfig {
    enabled: boolean;
    queues: Record<string, RoutingQueue>;
}

export const RoutingService = {
    /**
     * Define the assigned user for a new lead based on the organization's routing config (Roleta)
     * @param organizationId Organization UUID
     * @param tags Array of tags or a string identifying the lead type (e.g. "imóvel", "automóvel")
     * @returns UUID of the assigned user, or null if routing is disabled/empty
     */
    assignNextUser: async (organizationId: string, leadType?: string): Promise<string | null> => {
        try {
            const org = await db.query.organizations.findFirst({
                where: eq(organizations.id, organizationId),
                columns: { routingConfig: true }
            });

            if (!org || !org.routingConfig) return null;

            const config = org.routingConfig as unknown as RoutingConfig;
            if (!config.enabled || !config.queues) return null;

            // Determinar a fila (Queue) correta a ser usada
            // Se o leadType foi fornecido e existe uma fila específica para ele, usamos ela.
            // Caso contrário, tentamos usar a fila "default"
            let targetQueueName = "default";
            if (leadType && config.queues[leadType]) {
                targetQueueName = leadType;
            } else if (!config.queues["default"]) {
                // Se não tem queue específica e nem default, tenta usar a primeira fila disponível (fallback)
                const queueKeys = Object.keys(config.queues);
                if (queueKeys.length > 0) {
                    targetQueueName = queueKeys[0];
                } else {
                    return null;
                }
            }

            const queue = config.queues[targetQueueName];
            if (!queue || !Array.isArray(queue.users) || queue.users.length === 0) {
                return null;
            }

            // Round Robin logic
            const nextIndex = (queue.lastAssignedIndex + 1) % queue.users.length;
            const assignedUserId = queue.users[nextIndex];

            // Update queue state in memory
            queue.lastAssignedIndex = nextIndex;
            
            // Rebuild the config object to save to DB
            const updatedConfig = { ...config, queues: { ...config.queues, [targetQueueName]: queue } };

            // Persist the updated index
            await db.update(organizations)
                .set({ routingConfig: updatedConfig })
                .where(eq(organizations.id, organizationId));

            console.log(`🎰 [RoutingService] Lead assigned to User: ${assignedUserId} via Queue: ${targetQueueName}`);
            return assignedUserId;

        } catch (error) {
            console.error("⚠️ [RoutingService] Erro ao designar lead na roleta:", error);
            return null; // Fail gracefully
        }
    }
};
