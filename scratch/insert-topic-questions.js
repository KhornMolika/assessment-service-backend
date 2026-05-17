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

async function insertQuestions() {
  const topicId = 'b8045111-8cc8-4c32-a0b0-6413f225043c'; // Appended the missing 'c'
  console.log(`--- INSERTING 9 QUESTION TYPES TO TOPIC: ${topicId} ---`);

  for (const qType of questionTypes) {
    const payload = {
      text: `Example ${qType} Question?`,
      type: qType,
      difficulty: 'MEDIUM',
      options: []
    };

    if (['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'ORDERING', 'MATCHING'].includes(qType)) {
      payload.options = [
        { label: 'A', text: 'Option 1' },
        { label: 'B', text: 'Option 2' },
        { label: 'C', text: 'Option 3' }
      ];
    } else if (qType === 'TRUE_FALSE') {
      payload.options = [
        { label: 'T', text: 'True' },
        { label: 'F', text: 'False' }
      ];
    } else if (qType === 'RATING') {
      payload.options = [
        { label: '1', text: '1 Star' },
        { label: '5', text: '5 Stars' }
      ];
    }

    const res = await fetch(`${baseUrl}/topics/${topicId}/questions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    
    if (data.statusCode === 201) {
      console.log(`[SUCCESS] Inserted type: ${qType} (ID: ${data.data.id})`);
    } else {
      console.error(`[FAILED] Failed to insert type: ${qType}`, data);
    }
  }

  console.log('--- INSERTION FINISHED ---');
}

insertQuestions().catch(console.error);
