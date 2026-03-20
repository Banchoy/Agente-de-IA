
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { env } from "../env";

const connectionString = env.DATABASE_URL;

// Disable prefetch as it is not supported for "Transaction" pool mode
const client = postgres(connectionString, { 
    prepare: false,
    connect_timeout: 10, // 10 segundos para lidar com cold start
    max: 10, // Limite para plano free/transaction do Supabase
    idle_timeout: 20, // Fecha conexões inativas rapidamente
    ssl: "require", // Força SSL para Supabase
});
export const db = drizzle(client, { schema });
