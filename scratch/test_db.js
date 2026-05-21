const postgres = require('postgres');

// Try without SSL
const url = 'postgresql://postgres:txoXugqeAxUjwdwkuVURhOWQKRQPRAcc@shortline.proxy.rlwy.net:25302/railway';

console.log('Tentando conectar sem SSL...');
const sql1 = postgres(url, { ssl: false, connect_timeout: 10 });

async function test() {
  // Test 1: no SSL
  try {
    const result = await sql1`SELECT 1 as test`;
    console.log('✅ Sem SSL: OK!', result);
  } catch (err) {
    console.error('❌ Sem SSL:', err.message);
  } finally {
    await sql1.end();
  }

  // Test 2: with ssl: true  
  console.log('\nTentando conectar com ssl: true...');
  const sql2 = postgres(url, { ssl: true, connect_timeout: 10 });
  try {
    const result = await sql2`SELECT 1 as test`;
    console.log('✅ Com SSL true: OK!', result);
  } catch (err) {
    console.error('❌ Com SSL true:', err.message);
  } finally {
    await sql2.end();
  }

  // Test 3: with ssl: 'require'
  console.log('\nTentando com ssl: require...');
  const sql3 = postgres(url, { ssl: 'require', connect_timeout: 10 });
  try {
    const result = await sql3`SELECT 1 as test`;
    console.log('✅ Com SSL require: OK!', result);
  } catch (err) {
    console.error('❌ Com SSL require:', err.message);
  } finally {
    await sql3.end();
  }
}

test();
