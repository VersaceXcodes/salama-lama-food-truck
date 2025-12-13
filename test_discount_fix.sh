#!/bin/bash

API_BASE="https://123salama-lama-food-truck.launchpulse.ai"

echo "=== Testing Discount Code Validation Fix ==="
echo ""

# First login to get a token
echo "1. Logging in as claire.murphy@email.ie..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "claire.murphy@email.ie",
    "password": "password123",
    "remember_me": false
  }')

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "Failed to login. Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "Login successful. Token obtained."
echo ""

# Test 1: Valid code FIRST10
echo "2. Testing valid code 'FIRST10'..."
RESPONSE_1=$(curl -s -X POST "$API_BASE/api/discount/validate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "code": "FIRST10",
    "order_type": "collection",
    "order_value": 42.45
  }')
echo "Response: $RESPONSE_1"
echo ""

# Test 2: Invalid code INVALID123
echo "3. Testing invalid code 'INVALID123'..."
RESPONSE_2=$(curl -s -X POST "$API_BASE/api/discount/validate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "code": "INVALID123",
    "order_type": "collection",
    "order_value": 42.45
  }')
echo "Response: $RESPONSE_2"
echo ""

# Test 3: Expired code EXPIRED
echo "4. Testing expired code 'EXPIRED'..."
RESPONSE_3=$(curl -s -X POST "$API_BASE/api/discount/validate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "code": "EXPIRED",
    "order_type": "collection",
    "order_value": 42.45
  }')
echo "Response: $RESPONSE_3"
echo ""

echo "=== Test Summary ==="
echo ""

# Check test results
VALID_1=$(echo "$RESPONSE_1" | grep -o '"valid":true' | wc -l)
VALID_2=$(echo "$RESPONSE_2" | grep -o '"valid":false' | wc -l)
VALID_3=$(echo "$RESPONSE_3" | grep -o '"valid":false' | wc -l)

INVALID_MSG=$(echo "$RESPONSE_2" | grep -o '"message":"Invalid discount code"' | wc -l)
EXPIRED_MSG=$(echo "$RESPONSE_3" | grep -o '"message":"This discount code has expired"' | wc -l)

if [ $VALID_1 -eq 1 ]; then
  echo "✓ FIRST10: Successfully validated and applied"
else
  echo "✗ FIRST10: Failed to validate"
fi

if [ $VALID_2 -eq 1 ] && [ $INVALID_MSG -eq 1 ]; then
  echo "✓ INVALID123: Correctly rejected with specific error message"
else
  echo "✗ INVALID123: Did not return expected error"
fi

if [ $VALID_3 -eq 1 ] && [ $EXPIRED_MSG -eq 1 ]; then
  echo "✓ EXPIRED: Correctly rejected with 'expired' error message"
else
  echo "✗ EXPIRED: Did not return expected 'expired' error message"
fi

echo ""
echo "=== Test Complete ==="
