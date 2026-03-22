import { createDb } from "../../../../../packages/db/src/client";
import { env } from "../env";

export const db = createDb(env.DATABASE_URL);
