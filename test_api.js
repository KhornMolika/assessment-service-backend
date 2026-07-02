async function run() {
  try {
    console.log("1. Creating a new API Client using Admin Key...");
    const createRes = await fetch('http://localhost:3001/api/v1/clients', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-admin-api-key': 'c10abdd8cd1de4f800405cef4aa1ad84984c6b50631f58ce08dc04b37511844a'
      },
      body: JSON.stringify({
        name: "Test Client Localhost",
        allowedOrigins: ["http://localhost:3003"]
      })
    });
    
    if (!createRes.ok) {
      console.error("Failed to create client:", await createRes.text());
      return;
    }
    
    const client = await createRes.json();
    console.log("Client created successfully:");
    console.log("Client ID:", client.clientId);
    console.log("Client Secret:", client.clientSecret);
    
    console.log("\n2. Testing /api/v1/auth/embed-token endpoint...");
    const embedRes = await fetch('http://localhost:3001/api/v1/auth/embed-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: client.clientId,
        clientSecret: client.clientSecret,
        origin: "http://localhost:3003"
      })
    });
    
    const embedData = await embedRes.json();
    
    if (embedRes.ok) {
      console.log("✅ SUCCESS! Token generated:");
      console.log(embedData.access_token);
    } else {
      console.log("❌ FAILED! Error:");
      console.log(embedData);
    }
    
  } catch (err) {
    console.error("Test script failed:", err);
  }
}

run();
