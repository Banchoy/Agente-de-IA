
const { db } = require('./packages/db/dist/index');
const { agents } = require('./packages/db/dist/schema');
const { eq } = require('drizzle-orm');

async function checkAgents() {
  try {
    const allAgents = await db.query.agents.findMany();
    console.log(JSON.stringify(allAgents, null, 2));
  } catch (error) {
    console.error('Error fetching agents:', error);
  }
}

checkAgents();
