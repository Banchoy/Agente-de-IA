import { db } from "./apps/web/src/lib/db";
import { agents } from "./packages/db/src/schema";

async function run() {
  const allAgents = await db.query.agents.findMany();
  console.log(JSON.stringify(allAgents, null, 2));
  process.exit(0);
}
run();
