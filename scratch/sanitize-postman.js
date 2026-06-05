const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../postman/assessment-service.postman_collection.json');
let data = fs.readFileSync(file, 'utf8');

// Replace the high-entropy string with a placeholder
data = data.replace(
  /"value": "c10abdd8cd1de4f800405cef4aa1ad84984c6b50631f58ce08dc04b37511844a"/g,
  '"value": "your-local-admin-api-key-here"'
);

fs.writeFileSync(file, data);
console.log('Postman collection sanitized!');
