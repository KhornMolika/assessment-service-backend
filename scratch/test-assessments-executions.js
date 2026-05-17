const baseUrl = 'http://localhost:3000/api/v1';
const clientId = 'f0f1cb24-c031-4097-a186-0f23995ac62a';

const headers = {
  'Content-Type': 'application/json',
  'x-client-id': clientId
};

async function logReq(method, path, body = null) {
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(`${baseUrl}${path}`, options);
  const data = await res.json();
  console.log(`[${method}] ${path} -> ${res.status} ${res.status >= 200 && res.status < 300 ? 'SUCCESS' : 'FAILED'}`);
  if (res.status >= 400) console.error(JSON.stringify(data, null, 2));
  return { status: res.status, data: data.data };
}

async function runTests() {
  console.log('--- STARTING ASSESSMENTS & EXECUTIONS TEST RUN ---');

  // 1. Create Topic
  const topicRes = await logReq('POST', '/topics', { name: 'Assessment Test Topic ' + Date.now(), visibility: 'PRIVATE' });
  const topicId = topicRes.data.id;

  // 2. Create Assessment
  const assRes = await logReq('POST', `/topics/${topicId}/assessments`, { name: 'NestJS Master Quiz', type: 'quiz', description: 'Test quiz' });
  const assId = assRes.data.id;

  // 3. Get & Update Assessment
  await logReq('GET', `/assessments/${assId}`);
  await logReq('PATCH', `/assessments/${assId}`, { description: 'Updated description' });

  // 4. Create Question
  const qRes = await logReq('POST', `/topics/${topicId}/questions`, {
    text: 'What is NestJS?',
    type: 'SINGLE_CHOICE',
    difficulty: 'EASY',
    options: [{ label: 'A', text: 'Framework' }, { label: 'B', text: 'Library' }],
    correct_answer: 'A'
  });
  const qId = qRes.data.id;

  // 5. Add Question to Assessment
  const aqRes = await logReq('POST', `/assessments/${assId}/questions`, { questionId: qId });
  await logReq('GET', `/assessments/${assId}/questions`);

  // 6. Update Settings
  await logReq('PATCH', `/assessments/${assId}/settings`, { timeLimit: 45, passMark: 75 });
  await logReq('GET', `/assessments/${assId}/settings`);

  // 7. Add Participant
  const pRes = await logReq('POST', `/assessments/${assId}/participants`, { name: 'John Test', email: 'john@test.com' });
  const participantId = pRes.data.id;
  await logReq('GET', `/assessments/${assId}/participants`);

  // 8. Publish Assessment
  await logReq('POST', `/assessments/${assId}/publish`);

  // 9. Start Session (Runtime API)
  const startRes = await logReq('POST', '/assessment-sessions/start', { assessmentId: assId, participantId });
  const sessionId = startRes.data.sessionId;

  // 10. Save Answer
  await logReq('POST', `/assessment-sessions/${sessionId}/answers`, { questionId: qId, answer: 'A' });

  // 11. Submit Session
  await logReq('POST', `/assessment-sessions/${sessionId}/submit`);

  // 12. Get Result
  await logReq('GET', `/assessment-sessions/${sessionId}/result`);

  // 13. Clean up
  await logReq('DELETE', `/assessments/${assId}`);
  await logReq('DELETE', `/topics/${topicId}`);

  console.log('--- TEST RUN COMPLETE ---');
}

runTests().catch(console.error);
