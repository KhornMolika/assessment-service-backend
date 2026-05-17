const baseUrl = 'http://localhost:3000/api/v1';
const clientId = 'f0f1cb24-c031-4097-a186-0f23995ac62a';
const headers = { 'Content-Type': 'application/json', 'x-client-id': clientId };

async function test() {
  // Create topic
  const topicRes = await fetch(`${baseUrl}/topics`, {
    method: 'POST', headers,
    body: JSON.stringify({ name: 'Debug Topic ' + Date.now(), visibility: 'PRIVATE' })
  });
  const topicData = await topicRes.json();
  const topicId = topicData.data?.id;
  console.log('topicId:', topicId);

  // Create question with FULL detailed output
  const qRes = await fetch(`${baseUrl}/topics/${topicId}/questions`, {
    method: 'POST', headers,
    body: JSON.stringify({
      text: 'Debug Q?',
      type: 'SINGLE_CHOICE',
      difficulty: 'EASY',
      options: [{ label: 'A', text: 'Yes' }, { label: 'B', text: 'No' }],
      correct_answer: 'A'
    })
  });
  const raw = await qRes.text();
  console.log('Status:', qRes.status);
  console.log('Raw response:', raw);
}

test().catch(console.error);
