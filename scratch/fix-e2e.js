const fs = require('fs');
const path = require('path');

const testDir = path.join(__dirname, '../test');
const files = fs.readdirSync(testDir).filter(f => f.endsWith('.e2e-spec.ts'));

for (const file of files) {
  if (file === 'clients.e2e-spec.ts') continue; // Already manually fixed

  const filePath = path.join(testDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix client creation
  content = content.replace(
    /\.post\('\/api\/v1\/clients'\)\s*\n\s*\.send\(/g,
    ".post('/api/v1/clients')\n      .set('x-admin-api-key', 'test-admin-api-key-12345678901234567890')\n      .send("
  );

  // Fix client suspend (if any) in auth.e2e-spec.ts
  content = content.replace(
    /\.patch\(`\/api\/v1\/clients\/\$\{suspendedClientDbId\}\/suspend`\)\s*\n\s*\.expect/g,
    ".patch(`/api/v1/clients/${suspendedClientDbId}/suspend`)\n      .set('x-admin-api-key', 'test-admin-api-key-12345678901234567890')\n      .expect"
  );

  fs.writeFileSync(filePath, content);
  console.log(`Updated ${file}`);
}
