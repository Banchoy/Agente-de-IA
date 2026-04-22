import { db } from "./src/lib/db";
import { agents } from "./src/lib/db/schema";
async function run() {
    const allAgents = await db.select().from(agents);
    console.log("Agents prompts:", allAgents.map(a => a.prompt));
    process.exit(0);
}
run();
