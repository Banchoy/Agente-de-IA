
const postgres = require('postgres');

const sql = postgres('postgresql://postgres:eRRjaoRVsarpOPXFgkVdHzUdRqtvPlDD@crossover.proxy.rlwy.net:30771/railway');

async function getAgents() {
  try {
    const agents = await sql`SELECT id, name, config FROM agents`;
    console.log(JSON.stringify(agents, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

getAgents();
