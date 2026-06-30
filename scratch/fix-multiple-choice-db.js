const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'assessment_dev',
});

async function fix() {
  await client.connect();
  const res = await client.query(`
    UPDATE question
    SET "correctAnswer" = '{"optionIds": ["opt-1", "opt-3"]}'::jsonb
    WHERE type = 'MULTIPLE_CHOICE';
    
    UPDATE assessment_question
    SET "questionSnapshot" = jsonb_set(
      "questionSnapshot",
      '{correctAnswer}',
      '{"optionIds": ["opt-1", "opt-3"]}'::jsonb,
      true
    )
    WHERE "questionType" = 'MULTIPLE_CHOICE';
  `);
  console.log('Fixed DB');
  process.exit(0);
}
fix();
