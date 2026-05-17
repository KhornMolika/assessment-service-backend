const { Client } = require('pg');
const client = new Client({ host: 'localhost', port: 5432, user: 'postgres', password: 'postgres', database: 'assessment_dev' });
client.connect().then(async () => {
  const res = await client.query(`SELECT column_name, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'question' AND column_name = 'tags'`);
  console.log(res.rows);
  await client.end();
}).catch(e => console.error(e.message));
