const baseUrl = 'http://localhost:3000/api/v1';
const clientId = 'f0f1cb24-c031-4097-a186-0f23995ac62a';

const headers = {
  'Content-Type': 'application/json',
  'x-client-id': clientId
};

async function logReq(method, path, body) {
  const options = { method, headers };
  if(body) options.body = JSON.stringify(body);
  const res = await fetch(`${baseUrl}${path}`, options);
  const data = await res.json();
  console.log(`[${method}] ${path} ->`, data.statusCode || 200, data.error ? data.error.message : 'SUCCESS');
  return data;
}

async function testAll() {
  console.log('--- TEST RUN START ---');

  // 1. TOPICS
  const createTopicRes = await logReq('POST', '/topics', { name: 'Test Topic ' + Date.now(), description: 'desc', visibility: 'PUBLIC' });
  const topicId = createTopicRes.data.id;
  await logReq('GET', '/topics'); // list topics
  await logReq('GET', `/topics/${topicId}`);
  await logReq('PATCH', `/topics/${topicId}`, { description: 'patched' });

  // 2. BANKS
  const createBankRes = await logReq('POST', `/topics/${topicId}/banks`, { name: 'Test Bank' });
  const bankId = createBankRes.data.id;
  await logReq('GET', `/topics/${topicId}/banks`); // list banks
  await logReq('GET', `/banks/${bankId}`);
  await logReq('PATCH', `/banks/${bankId}`, { name: 'patched bank' });

  // 3. QUESTIONS
  const createQ1Res = await logReq('POST', `/topics/${topicId}/questions`, { 
    text: 'Q1', type: 'SINGLE_CHOICE', difficulty: 'EASY', options: [{ label: 'A', text: '1', isCorrect: true }] 
  });
  const q1Id = createQ1Res.data.id;
  
  const createQ2Res = await logReq('POST', `/topics/${topicId}/questions`, { 
    text: 'Q2', type: 'TRUE_FALSE', difficulty: 'MEDIUM' 
  });
  const q2Id = createQ2Res.data.id;

  await logReq('GET', `/topics/${topicId}/questions`); // list questions
  await logReq('GET', `/questions/${q1Id}`);
  await logReq('PATCH', `/questions/${q1Id}`, { difficulty: 'HARD' });

  // 4. BANK ASSIGNMENTS
  await logReq('POST', `/banks/${bankId}/questions`, { questionId: q1Id });
  await logReq('GET', `/banks/${bankId}/questions`); // list bank questions
  await logReq('DELETE', `/banks/${bankId}/questions/${q1Id}`); // remove from bank

  // 5. DELETE & ARCHIVE OPERATIONS
  await logReq('DELETE', `/questions/${q1Id}`);
  await logReq('DELETE', `/banks/${bankId}`);
  await logReq('DELETE', `/topics/${topicId}`);
  
  console.log('--- TEST RUN COMPLETE ---');
}

testAll().catch(console.error);
