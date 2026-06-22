const fs = require('fs');
const path = require('path');

const collectionPath = path.join(__dirname, 'assessment-service.postman_collection.json');
const rawData = fs.readFileSync(collectionPath, 'utf8');
const collection = JSON.parse(rawData);

const clientFolders = ['Auth', 'Runtime', 'Realtime', 'Topics', 'Questions', 'Question Banks', 'Assessments', 'Participants', 'Reports', 'Health'];
const adminFolders = ['Auth', 'Topics', 'Questions', 'Question Banks', 'Assessments', 'Participants', 'Reports', 'Clients', 'Health'];

// Make a deep copy to avoid references
const clone = (obj) => JSON.parse(JSON.stringify(obj));

const clientCollection = clone(collection);
clientCollection.info.name = "Assessment Service API - Client/Consumer";
clientCollection.item = clientCollection.item.filter(item => clientFolders.includes(item.name));

// Include Get Me and Update Me from Clients for Client/Consumer
const clientsGroup = collection.item.find(i => i.name === 'Clients');
if (clientsGroup) {
  const clientMeItems = clientsGroup.item.filter(i => i.name === 'Get Me' || i.name === 'Update Me');
  if (clientMeItems.length > 0) {
    clientCollection.item.push({
      name: 'Clients',
      item: clientMeItems
    });
  }
}

const adminCollection = clone(collection);
adminCollection.info.name = "Assessment Service API - Admin";
adminCollection.item = adminCollection.item.filter(item => adminFolders.includes(item.name));

// Update the variables for both collections based on user input
const updateVariables = (col) => {
    col.variable.forEach(v => {
        if (v.key === 'clientId') v.value = 'b4fd6785-0dd7-48b3-bdf3-4351f99e4bbd';
        if (v.key === 'clientSecret') v.value = 'b4649f80cd7c4be8855451084469353473499f9149e04bb0bf396dd863172a47';
        if (v.key === 'baseUrl') v.value = 'http://localhost:3001/api/v1';
    });
};

updateVariables(clientCollection);
updateVariables(adminCollection);

fs.writeFileSync(path.join(__dirname, 'client.postman_collection.json'), JSON.stringify(clientCollection, null, 2));
fs.writeFileSync(path.join(__dirname, 'admin.postman_collection.json'), JSON.stringify(adminCollection, null, 2));
console.log('Split into client and admin collections successfully!');
