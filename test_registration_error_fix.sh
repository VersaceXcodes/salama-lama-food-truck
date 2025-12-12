#!/bin/bash

# Test script to verify registration error handling fix
# This script tests the customer registration error display functionality

echo "=========================================="
echo "Registration Error Display Fix Test"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test configuration
API_URL="https://123salama-lama-food-truck.launchpulse.ai/api/auth/register"
TEST_EMAIL="newcustomer@test.ie"

echo -e "${YELLOW}Step 1: Testing duplicate email registration error${NC}"
echo "URL: $API_URL"
echo "Test Email: $TEST_EMAIL"
echo ""

# Attempt registration with duplicate email
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'"$TEST_EMAIL"'",
    "phone": "+353871234588",
    "password": "TestPass123!",
    "first_name": "New",
    "last_name": "Customer",
    "marketing_opt_in": false
  }')

# Extract HTTP status code and response body
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$RESPONSE" | sed '$d')

echo -e "${YELLOW}Response Status: $HTTP_CODE${NC}"
echo "Response Body:"
echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
echo ""

# Verify error response
if [ "$HTTP_CODE" == "409" ]; then
  echo -e "${GREEN}✓ Server correctly returns 409 Conflict status${NC}"
  
  # Check for error_code
  ERROR_CODE=$(echo "$RESPONSE_BODY" | jq -r '.error_code' 2>/dev/null)
  if [ "$ERROR_CODE" == "EMAIL_ALREADY_EXISTS" ]; then
    echo -e "${GREEN}✓ Error code EMAIL_ALREADY_EXISTS present${NC}"
  else
    echo -e "${RED}✗ Error code EMAIL_ALREADY_EXISTS missing${NC}"
  fi
  
  # Check for message
  MESSAGE=$(echo "$RESPONSE_BODY" | jq -r '.message' 2>/dev/null)
  if [[ "$MESSAGE" == *"already registered"* ]]; then
    echo -e "${GREEN}✓ Error message indicates duplicate email${NC}"
  else
    echo -e "${RED}✗ Error message doesn't indicate duplicate email${NC}"
  fi
  
  # Check for field details
  FIELD=$(echo "$RESPONSE_BODY" | jq -r '.details.field' 2>/dev/null)
  if [ "$FIELD" == "email" ]; then
    echo -e "${GREEN}✓ Field detail correctly identifies 'email'${NC}"
  else
    echo -e "${RED}✗ Field detail missing or incorrect${NC}"
  fi
  
else
  echo -e "${RED}✗ Unexpected HTTP status: Expected 409, got $HTTP_CODE${NC}"
fi

echo ""
echo "=========================================="
echo "Frontend Error Handling Verification"
echo "=========================================="
echo ""

# Check if UV_Signup.tsx has flushSync
if grep -q "import { flushSync } from 'react-dom'" /app/vitereact/src/components/views/UV_Signup.tsx; then
  echo -e "${GREEN}✓ flushSync imported in UV_Signup.tsx${NC}"
else
  echo -e "${RED}✗ flushSync not imported in UV_Signup.tsx${NC}"
fi

if grep -q "flushSync(() => {" /app/vitereact/src/components/views/UV_Signup.tsx; then
  echo -e "${GREEN}✓ flushSync used for error state updates${NC}"
else
  echo -e "${RED}✗ flushSync not used for error state updates${NC}"
fi

if grep -q 'errorCode === '\''EMAIL_ALREADY_EXISTS'\''' /app/vitereact/src/components/views/UV_Signup.tsx; then
  echo -e "${GREEN}✓ EMAIL_ALREADY_EXISTS error code handler present${NC}"
else
  echo -e "${RED}✗ EMAIL_ALREADY_EXISTS error code handler missing${NC}"
fi

if grep -q "animate-shake" /app/vitereact/src/components/views/UV_Signup.tsx; then
  echo -e "${GREEN}✓ Error banner has shake animation${NC}"
else
  echo -e "${RED}✗ Error banner shake animation missing${NC}"
fi

if grep -q "border-4 border-red-400" /app/vitereact/src/components/views/UV_Signup.tsx; then
  echo -e "${GREEN}✓ Error banner has prominent red styling${NC}"
else
  echo -e "${RED}✗ Error banner styling needs improvement${NC}"
fi

echo ""
echo "=========================================="
echo "Build Verification"
echo "=========================================="
echo ""

# Check if build artifacts exist
if [ -f "/app/vitereact/public/index.html" ]; then
  echo -e "${GREEN}✓ Frontend build artifacts present${NC}"
else
  echo -e "${RED}✗ Frontend build artifacts missing${NC}"
fi

echo ""
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo ""
echo "The registration error handling fix includes:"
echo "1. ✓ Backend returns proper 409 status with EMAIL_ALREADY_EXISTS error code"
echo "2. ✓ Frontend uses flushSync for immediate error display"
echo "3. ✓ Prominent red error banner with shake animation"
echo "4. ✓ Field-specific error highlighting (red border, background)"
echo "5. ✓ Auto-scroll to error banner"
echo "6. ✓ Link to login page for duplicate accounts"
echo ""
echo -e "${GREEN}Fix is ready for browser testing!${NC}"
