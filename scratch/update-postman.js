const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../postman/assessment-service.postman_collection.json');
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

// 1. Update variables to include adminApiKey
let hasAdminKey = false;
data.variable = data.variable || [];
for (const v of data.variable) {
  if (v.key === 'adminApiKey') hasAdminKey = true;
}
if (!hasAdminKey) {
  data.variable.push({
    key: 'adminApiKey',
    value: 'c10abdd8cd1de4f800405cef4aa1ad84984c6b50631f58ce08dc04b37511844a',
    type: 'string'
  });
}

// 2. Find Clients folder
const clientsFolder = data.item.find(i => i.name === 'Clients');

if (clientsFolder) {
  // 3. Update existing admin endpoints to use x-admin-api-key
  const adminEndpoints = [
    'Create Client',
    'List Clients',
    'Get Client by ID',
    'Update Client',
    'Suspend Client',
    'Activate Client',
    'Rotate Secret'
  ];

  for (const item of clientsFolder.item) {
    if (adminEndpoints.includes(item.name)) {
      // Remove Authorization Bearer if exists
      item.request.header = item.request.header.filter(h => h.key !== 'Authorization');
      
      // Add x-admin-api-key if not exists
      const hasKey = item.request.header.find(h => h.key === 'x-admin-api-key');
      if (!hasKey) {
        item.request.header.push({
          key: 'x-admin-api-key',
          value: '{{adminApiKey}}',
          type: 'text'
        });
      }
    }
  }

  // 4. Add "me" endpoints if they don't exist
  const hasGetMe = clientsFolder.item.find(i => i.name === 'Get Me');
  if (!hasGetMe) {
    clientsFolder.item.splice(1, 0, {
      name: 'Get Me',
      request: {
        method: 'GET',
        header: [
          {
            key: 'Authorization',
            value: 'Bearer {{accessToken}}',
            type: 'text'
          }
        ],
        url: {
          raw: '{{baseUrl}}/clients/me',
          host: ['{{baseUrl}}'],
          path: ['clients', 'me']
        }
      },
      response: []
    });
  }

  const hasPatchMe = clientsFolder.item.find(i => i.name === 'Update Me');
  if (!hasPatchMe) {
    clientsFolder.item.splice(2, 0, {
      name: 'Update Me',
      request: {
        method: 'PATCH',
        header: [
          {
            key: 'Content-Type',
            value: 'application/json',
            type: 'text'
          },
          {
            key: 'Authorization',
            value: 'Bearer {{accessToken}}',
            type: 'text'
          }
        ],
        body: {
          mode: 'raw',
          raw: JSON.stringify({
            webhookUrl: "https://my-tenant.com/api/webhooks/assessments"
          }, null, 2)
        },
        url: {
          raw: '{{baseUrl}}/clients/me',
          host: ['{{baseUrl}}'],
          path: ['clients', 'me']
        }
      },
      response: []
    });
  }
}

fs.writeFileSync(file, JSON.stringify(data, null, 2));
console.log('Postman collection updated successfully!');
