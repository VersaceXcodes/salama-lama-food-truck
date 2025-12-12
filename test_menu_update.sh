#!/bin/bash

# Test script to verify menu item update fix
echo "🧪 Testing Admin Menu Item Update Fix"
echo "======================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test configuration
API_BASE="http://localhost:3000"
ADMIN_EMAIL="admin@coffeeshop.ie"
ADMIN_PASSWORD="admin123"

echo "📝 Step 1: Login as admin..."
LOGIN_RESPONSE=$(curl -s -X POST "${API_BASE}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}")

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Login failed${NC}"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi
echo -e "${GREEN}✅ Login successful${NC}"
echo ""

echo "📋 Step 2: Get list of menu items..."
ITEMS_RESPONSE=$(curl -s -X GET "${API_BASE}/api/admin/menu/items?" \
  -H "Authorization: Bearer ${TOKEN}")

# Extract first item ID and current price
ITEM_ID=$(echo $ITEMS_RESPONSE | grep -o '"item_id":"[^"]*"' | head -1 | cut -d'"' -f4)
CURRENT_PRICE=$(echo $ITEMS_RESPONSE | grep -A5 "\"item_id\":\"${ITEM_ID}\"" | grep -o '"price":[0-9.]*' | head -1 | cut -d':' -f2)

if [ -z "$ITEM_ID" ]; then
  echo -e "${RED}❌ Failed to get menu items${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Found item: ${ITEM_ID}${NC}"
echo "   Current price: €${CURRENT_PRICE}"
echo ""

# Calculate new price (add 0.50)
NEW_PRICE=$(echo "$CURRENT_PRICE + 0.50" | bc)

echo "🔄 Step 3: Update item price to €${NEW_PRICE}..."
UPDATE_RESPONSE=$(curl -s -X PUT "${API_BASE}/api/admin/menu/items/${ITEM_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"price\":${NEW_PRICE}}")

echo "Response: $UPDATE_RESPONSE"

# Check if response includes the item data
if echo "$UPDATE_RESPONSE" | grep -q '"item"'; then
  echo -e "${GREEN}✅ Update response includes full item data${NC}"
else
  echo -e "${YELLOW}⚠️  Update response missing item data (old behavior)${NC}"
fi
echo ""

echo "🔍 Step 4: Verify price change in list view..."
sleep 1  # Brief pause to ensure data propagates

VERIFY_RESPONSE=$(curl -s -X GET "${API_BASE}/api/admin/menu/items?" \
  -H "Authorization: Bearer ${TOKEN}")

UPDATED_PRICE=$(echo $VERIFY_RESPONSE | grep -A5 "\"item_id\":\"${ITEM_ID}\"" | grep -o '"price":[0-9.]*' | head -1 | cut -d':' -f2)

echo "   Previous price: €${CURRENT_PRICE}"
echo "   Expected price: €${NEW_PRICE}"
echo "   Actual price:   €${UPDATED_PRICE}"
echo ""

if [ "$UPDATED_PRICE" == "$NEW_PRICE" ]; then
  echo -e "${GREEN}✅ Price update verified successfully!${NC}"
  echo -e "${GREEN}🎉 TEST PASSED${NC}"
  EXIT_CODE=0
else
  echo -e "${RED}❌ Price mismatch detected${NC}"
  echo -e "${RED}❌ TEST FAILED${NC}"
  EXIT_CODE=1
fi

echo ""
echo "🔄 Step 5: Restore original price..."
curl -s -X PUT "${API_BASE}/api/admin/menu/items/${ITEM_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"price\":${CURRENT_PRICE}}" > /dev/null

echo -e "${GREEN}✅ Original price restored${NC}"
echo ""
echo "======================================="

exit $EXIT_CODE
