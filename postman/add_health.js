const fs = require('fs');
const path = require('path');

const collectionPath = path.join(__dirname, 'assessment-service.postman_collection.json');
const rawData = fs.readFileSync(collectionPath, 'utf8');
const collection = JSON.parse(rawData);

const healthItem = {
  "name": "Health",
  "item": [
    {
      "name": "Health Check",
      "request": {
        "method": "GET",
        "header": [],
        "url": {
          "raw": "{{baseUrl}}/health",
          "host": [
            "{{baseUrl}}"
          ],
          "path": [
            "health"
          ]
        }
      },
      "response": []
    }
  ]
};

if (!collection.item.some(i => i.name === 'Health')) {
  collection.item.push(healthItem);
  fs.writeFileSync(collectionPath, JSON.stringify(collection, null, 2));
  console.log('Health item added.');
} else {
  console.log('Health item already exists.');
}
