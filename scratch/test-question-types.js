const baseUrl = 'http://localhost:3000/api/v1';
const clientId = 'f0f1cb24-c031-4097-a186-0f23995ac62a';

const headers = {
  'Content-Type': 'application/json',
  'x-client-id': clientId
};

const questionTypes = [
  'SINGLE_CHOICE',
  'MULTIPLE_CHOICE',
  'TRUE_FALSE',
  'ORDERING',
  'FILL_IN_THE_BLANK',
  'MATCHING',
  'RATING',
  'SHORT_ANSWER',
  'ESSAY'
];

async function testTypes() {
  console.log('--- TESTING ALL QUESTION TYPES ---');

  // 1. Create a Topic to hold the questions
  const createTopicRes = await fetch(`${baseUrl}/topics`, { 
    method: 'POST', 
    headers, 
    body: JSON.stringify({ name: 'Type Testing Topic ' + Date.now(), visibility: 'PRIVATE' }) 
  });
  const topicData = await createTopicRes.json();
  const topicId = topicData.data.id;
  console.log(`Created Topic ID: ${topicId}`);

  // 2. Iterate and create a question for each type
  for (const qType of questionTypes) {
    const payload = {
      text: `This is a test question for ${qType}`,
      type: qType,
      difficulty: 'MEDIUM',
      options: []
    };

    // Add some dummy options for types that typically have them
    if (['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'ORDERING', 'MATCHING'].includes(qType)) {
      payload.options = [
        { label: 'A', text: 'Option 1' },
        { label: 'B', text: 'Option 2' }
      ];
    } else if (qType === 'TRUE_FALSE') {
      payload.options = [
        { label: 'T', text: 'True' },
        { label: 'F', text: 'False' }
      ];
    }

    const res = await fetch(`${baseUrl}/topics/${topicId}/questions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    
    if (data.statusCode === 201) {
      console.log(`[SUCCESS] Created question of type: ${qType}`);
    } else {
      console.error(`[FAILED] Failed to create type: ${qType}`, data);
    }
  }

  // 3. Clean up
  const deleteRes = await fetch(`${baseUrl}/topics/${topicId}`, { method: 'DELETE', headers });
  console.log('Cleaned up Topic:', (await deleteRes.json()).data.message);

  console.log('--- TEST FINISHED ---');
}

testTypes().catch(console.error);
