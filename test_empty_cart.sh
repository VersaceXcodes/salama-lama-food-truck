#!/bin/bash

echo "Testing Empty Cart Functionality"
echo "================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test configuration
API_URL="${API_URL:-http://localhost:3000}"
TOKEN="${TOKEN:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoidXNlcl8wMDMiLCJyb2xlIjoiY3VzdG9tZXIiLCJlbWFpbCI6ImpvaG4uc21pdGhAZW1haWwuaWUiLCJpYXQiOjE3NjU2NjE3NjUsImV4cCI6MTc2NTc0ODE2NX0.bncgrte5-uUPZM4Y470MREPMTPVQ2wB_gEbbfJEQdBM}"

echo ""
echo "1. Testing GET /api/cart (before clear)..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/api/cart" \
  -H "Authorization: Bearer $TOKEN")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}✓ GET cart successful${NC}"
    ITEM_COUNT=$(echo "$BODY" | grep -o '"cart_item_id"' | wc -l)
    echo "  Current items in cart: $ITEM_COUNT"
else
    echo -e "${RED}✗ GET cart failed with status $HTTP_CODE${NC}"
    exit 1
fi

echo ""
echo "2. Testing DELETE /api/cart (empty cart)..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE "$API_URL/api/cart" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}✓ DELETE cart successful${NC}"
    if echo "$BODY" | grep -q '"success":true'; then
        echo -e "${GREEN}✓ Response indicates success${NC}"
    else
        echo -e "${RED}✗ Response does not indicate success${NC}"
        echo "Response: $BODY"
        exit 1
    fi
    
    ITEM_COUNT=$(echo "$BODY" | grep -o '"items":\[\]' | wc -l)
    if [ "$ITEM_COUNT" -gt 0 ]; then
        echo -e "${GREEN}✓ Cart items array is empty${NC}"
    else
        echo -e "${RED}✗ Cart items array is not empty${NC}"
        echo "Response: $BODY"
        exit 1
    fi
else
    echo -e "${RED}✗ DELETE cart failed with status $HTTP_CODE${NC}"
    echo "Response: $BODY"
    exit 1
fi

echo ""
echo "3. Testing GET /api/cart (after clear)..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/api/cart" \
  -H "Authorization: Bearer $TOKEN")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}✓ GET cart successful${NC}"
    ITEM_COUNT=$(echo "$BODY" | grep -o '"cart_item_id"' | wc -l)
    echo "  Current items in cart: $ITEM_COUNT"
    
    if [ "$ITEM_COUNT" == "0" ]; then
        echo -e "${GREEN}✓ Cart is confirmed empty${NC}"
    else
        echo -e "${RED}✗ Cart still contains items after clear${NC}"
        exit 1
    fi
else
    echo -e "${RED}✗ GET cart failed with status $HTTP_CODE${NC}"
    exit 1
fi

echo ""
echo "================================="
echo -e "${GREEN}All tests passed! ✓${NC}"
echo "Empty Cart functionality is working correctly."
