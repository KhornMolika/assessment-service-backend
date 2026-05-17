const baseUrl = 'http://localhost:3000/api/v1';
const clientId = 'f0f1cb24-c031-4097-a186-0f23995ac62a';
const headers = { 'Content-Type': 'application/json', 'x-client-id': clientId };

async function post(path, body) {
  const res = await fetch(`${baseUrl}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  const data = await res.json();
  const ok = res.status >= 200 && res.status < 300;
  console.log(`[${res.status}] ${ok ? '✅' : '❌'} POST ${path}`);
  if (!ok) console.error('   ', JSON.stringify(data.error || data, null, 2));
  return { ok, data: data.data, raw: data };
}

const questions = [
  {
    type: 'SINGLE_CHOICE',
    text: 'What is the capital of Cambodia?',
    difficulty: 'EASY',
    options: [
      { label: 'A', text: 'Phnom Penh' },
      { label: 'B', text: 'Siem Reap' },
      { label: 'C', text: 'Battambang' },
      { label: 'D', text: 'Sihanoukville' }
    ],
    correct_answer: 'A'
  },
  {
    type: 'MULTIPLE_CHOICE',
    text: 'Which of the following are JavaScript frameworks?',
    difficulty: 'MEDIUM',
    options: [
      { label: 'A', text: 'React' },
      { label: 'B', text: 'Angular' },
      { label: 'C', text: 'Python' },
      { label: 'D', text: 'Vue' }
    ],
    correct_answer: ['A', 'B', 'D']
  },
  {
    type: 'TRUE_FALSE',
    text: 'TypeScript is a superset of JavaScript.',
    difficulty: 'EASY',
    options: [
      { label: 'True', text: 'True' },
      { label: 'False', text: 'False' }
    ],
    correct_answer: 'True'
  },
  {
    type: 'ORDERING',
    text: 'Arrange the following steps of a NestJS request lifecycle in order.',
    difficulty: 'HARD',
    options: [
      { label: '1', text: 'Middleware' },
      { label: '2', text: 'Guard' },
      { label: '3', text: 'Interceptor (before)' },
      { label: '4', text: 'Pipe' },
      { label: '5', text: 'Controller' },
      { label: '6', text: 'Interceptor (after)' }
    ],
    correct_answer: ['1', '2', '3', '4', '5', '6']
  },
  {
    type: 'FILL_IN_THE_BLANK',
    text: 'In NestJS, the @___() decorator is used to mark a class as a ___.',
    difficulty: 'EASY',
    options: [],
    correct_answer: ['Controller', 'controller']
  },
  {
    type: 'MATCHING',
    text: 'Match the NestJS decorator with its purpose.',
    difficulty: 'MEDIUM',
    options: [
      { left: '@Injectable()', right: 'Mark class as provider' },
      { left: '@Controller()', right: 'Mark class as controller' },
      { left: '@Module()', right: 'Define a module' },
      { left: '@Get()', right: 'Handle GET request' }
    ],
    correct_answer: [
      { left: '@Injectable()', right: 'Mark class as provider' },
      { left: '@Controller()', right: 'Mark class as controller' },
      { left: '@Module()', right: 'Define a module' },
      { left: '@Get()', right: 'Handle GET request' }
    ]
  },
  {
    type: 'RATING',
    text: 'On a scale of 1-5, how confident are you with dependency injection?',
    difficulty: 'EASY',
    options: [
      { label: '1', text: 'Not confident' },
      { label: '2', text: 'Slightly confident' },
      { label: '3', text: 'Neutral' },
      { label: '4', text: 'Confident' },
      { label: '5', text: 'Very confident' }
    ],
    correct_answer: null
  },
  {
    type: 'SHORT_ANSWER',
    text: 'What command is used to create a new NestJS project?',
    difficulty: 'EASY',
    options: [],
    correct_answer: 'nest new'
  },
  {
    type: 'ESSAY',
    text: 'Explain the benefits of using NestJS over plain Express.js for enterprise applications.',
    difficulty: 'HARD',
    options: [],
    correct_answer: null
  }
];

async function run() {
  // First create a topic for these questions
  const topicRes = await post('/topics', {
    name: 'All Question Types Demo ' + Date.now(),
    description: 'Topic containing one question of each type for verification',
    visibility: 'PRIVATE'
  });

  if (!topicRes.ok) { console.error('Failed to create topic'); return; }
  const topicId = topicRes.data.id;
  console.log(`\nTopic created: ${topicId}\n`);
  console.log('--- Creating 9 question types ---\n');

  const results = [];
  for (const q of questions) {
    const res = await post(`/topics/${topicId}/questions`, q);
    results.push({ type: q.type, ok: res.ok, id: res.data?.id });
    if (res.ok) {
      console.log(`   ID: ${res.data.id}`);
      console.log(`   Type: ${res.data.type}`);
      console.log(`   Text: ${res.data.text}`);
      console.log(`   Options: ${JSON.stringify(res.data.options)}`);
      console.log(`   Correct Answer: ${JSON.stringify(res.data.correct_answer)}`);
      console.log('');
    }
  }

  console.log('\n--- SUMMARY ---');
  console.log(`Topic ID: ${topicId}`);
  console.log(`Total: ${results.length}`);
  console.log(`Passed: ${results.filter(r => r.ok).length}`);
  console.log(`Failed: ${results.filter(r => !r.ok).length}`);
  results.forEach(r => {
    console.log(`  ${r.ok ? '✅' : '❌'} ${r.type} -> ${r.id || 'FAILED'}`);
  });
}

run().catch(console.error);
