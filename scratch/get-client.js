const { Client } = require('pg');

const client = new Client({
  user: 'postgres',
  host: 'localhost',
  database: 'assessment_dev',
  password: 'postgres',
  port: 5432,
});

async function run() {
  await client.connect();
  let res = await client.query('SELECT id FROM client LIMIT 1');
  if (res.rows.length > 0) {
    console.log(res.rows[0].id);
  } else {
    // Insert one
    res = await client.query(`INSERT INTO client(name, slug, "clientId", "clientSecretHash") VALUES('Test', 'test-slug', '123e4567-e89b-12d3-a456-426614174000', 'hash') RETURNING id`);
    console.log(res.rows[0].id);
  }
  await client.end();
}

run().catch(console.error);
