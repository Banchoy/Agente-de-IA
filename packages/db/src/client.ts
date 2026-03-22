import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export function createDb(connectionString: string) {
    const client = postgres(connectionString, { 
        prepare: false,
        connect_timeout: 10,
        max: 10,
        idle_timeout: 20,
        ssl: "require",
    });
    return drizzle(client, { schema });
}
