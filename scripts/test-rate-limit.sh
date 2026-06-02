#!/bin/bash

# Base URL
API_URL="http://localhost:3001/api/v1"

echo "Creating a test client..."
# We will use grep to parse JSON since jq might not be installed on all Windows/WSL setups.
RESPONSE=$(curl -s -X POST "$API_URL/clients" \
  -H "Content-Type: application/json" \
  -d '{"name": "Rate Limit Test Client", "slug": "rate-limit-test-'$(date +%s)'", "allowedOrigins": ["https://test.com"]}')

CLIENT_ID=$(echo $RESPONSE | grep -o '"clientId":"[^"]*' | grep -o '[^"]*$')
CLIENT_SECRET=$(echo $RESPONSE | grep -o '"clientSecret":"[^"]*' | grep -o '[^"]*$')

if [ -z "$CLIENT_ID" ] || [ -z "$CLIENT_SECRET" ]; then
  echo "Failed to create test client. Is the server running at $API_URL?"
  exit 1
fi

echo "Created Client ID: $CLIENT_ID"

# 1. Test Auth Burst Limit
echo "======================================"
echo "TEST 1: Auth Burst Limit (2 req / sec)"
echo "Expected: 2 successes, 3 failures (Non-2xx)"
echo "======================================"

echo "{\"clientId\":\"$CLIENT_ID\",\"clientSecret\":\"$CLIENT_SECRET\",\"grant_type\":\"client_credentials\"}" > auth_payload.json

ab -n 5 -c 5 -T application/json -p auth_payload.json "$API_URL/auth/token"

# Wait a second to clear authBurst limit
echo "Waiting 2 seconds for burst limit to reset..."
sleep 2

# 2. Get Token for Read Limit Test
echo "Getting JWT token for Read Limit test..."
TOKEN_RESPONSE=$(curl -s -X POST "$API_URL/auth/token" \
  -H "Content-Type: application/json" \
  -d @auth_payload.json)

TOKEN=$(echo $TOKEN_RESPONSE | grep -o '"accessToken":"[^"]*' | grep -o '[^"]*$')

if [ -z "$TOKEN" ]; then
  echo "Failed to get JWT token."
  exit 1
fi

# 3. Test Read Burst Limit
echo "======================================"
echo "TEST 2: Read Burst Limit (50 req / 10 sec)"
echo "Expected: 50 successes, 10 failures (Non-2xx)"
echo "======================================"

ab -n 60 -c 60 -H "Authorization: Bearer $TOKEN" "$API_URL/clients"

# Cleanup
rm auth_payload.json
echo "======================================"
echo "Tests completed."
