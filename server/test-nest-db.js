// test-different.js
const { Client } = require('pg');

const tests = [
  { host: 'localhost', port: 5432 },
  { host: '127.0.0.1', port: 5432 },
  { host: '0.0.0.0', port: 5432 }
];

async function testConnection(config) {
  const client = new Client({
    ...config,
    user: 'admin_lab8',
    password: '1234lab8',
    database: 'wslab8'
  });

  try {
    await client.connect();
    console.log(`✅ ${config.host}:${config.port} - Успех!`);
    await client.end();
    return true;
  } catch (err) {
    console.log(`❌ ${config.host}:${config.port} - ${err.message}`);
    return false;
  }
}

async function runAllTests() {
  console.log('Тестирование разных хостов...');
  for (const config of tests) {
    await testConnection(config);
  }
}

runAllTests();