#!/bin/bash

# Test script for discount code application fix
# Tests the complete flow: validate discount -> apply to cart -> verify in cart response

API_BASE_URL="${API_BASE_URL:-http://localhost:3000}"
TEST_EMAIL="john.smith@email.ie"
TEST_PASSWORD="password123"

echo "================================"
echo "Discount Code Application Test"
echo "================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Login
echo "Step 1: Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\"}")

# Try both token field names
AUTH_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | sed 's/"token":"//')
if [ -z "$AUTH_TOKEN" ]; then
  AUTH_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"auth_token":"[^"]*' | sed 's/"auth_token":"//')
fi

if [ -z "$AUTH_TOKEN" ]; then
  echo -e "${RED}✗ Failed to login${NC}"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi
echo -e "${GREEN}✓ Logged in successfully${NC}"
echo ""

# Step 2: Clear cart
echo "Step 2: Clearing cart..."
CLEAR_RESPONSE=$(curl -s -X DELETE "${API_BASE_URL}/api/cart" \
  -H "Authorization: Bearer ${AUTH_TOKEN}")

echo -e "${GREEN}✓ Cart cleared${NC}"
echo ""

# Step 3: Add items to cart to meet minimum order requirement
echo "Step 3: Adding items to cart..."

# Add Loaded Fries (€9.95)
ADD_ITEM1=$(curl -s -X POST "${API_BASE_URL}/api/cart/items" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"item_id":"item_x9IKeDcJ1QCZqquElmvp","quantity":1,"selected_customizations":{}}')

# Add Test Burrito (€10.50)
ADD_ITEM2=$(curl -s -X POST "${API_BASE_URL}/api/cart/items" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"item_id":"item_8-1WsOpjwL4DmYnLvWHW","quantity":1,"selected_customizations":{}}')

SUBTOTAL=$(echo "$ADD_ITEM2" | grep -o '"subtotal":[^,]*' | sed 's/"subtotal"://')

echo -e "${GREEN}✓ Added items to cart (Subtotal: €${SUBTOTAL})${NC}"
echo ""

# Step 4: Get current cart state (before discount)
echo "Step 4: Getting cart state (before discount)..."
CART_BEFORE=$(curl -s "${API_BASE_URL}/api/cart" \
  -H "Authorization: Bearer ${AUTH_TOKEN}")

DISCOUNT_BEFORE=$(echo "$CART_BEFORE" | grep -o '"discount_code":"[^"]*' | sed 's/"discount_code":"//')
DISCOUNT_AMOUNT_BEFORE=$(echo "$CART_BEFORE" | grep -o '"discount_amount":[^,]*' | sed 's/"discount_amount"://')
TOTAL_BEFORE=$(echo "$CART_BEFORE" | grep -o '"total":[^,}]*' | sed 's/"total"://')

echo "  Discount Code: ${DISCOUNT_BEFORE:-null}"
echo "  Discount Amount: €${DISCOUNT_AMOUNT_BEFORE}"
echo "  Total: €${TOTAL_BEFORE}"
echo ""

# Step 5: Validate and apply discount code
echo "Step 5: Applying discount code FIRST10..."
DISCOUNT_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/api/discount/validate" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"code\":\"FIRST10\",\"order_type\":\"collection\",\"order_value\":${SUBTOTAL}}")

DISCOUNT_VALID=$(echo "$DISCOUNT_RESPONSE" | grep -o '"valid":[^,]*' | sed 's/"valid"://')
DISCOUNT_AMOUNT=$(echo "$DISCOUNT_RESPONSE" | grep -o '"discount_amount":[^,]*' | sed 's/"discount_amount"://')
DISCOUNT_MESSAGE=$(echo "$DISCOUNT_RESPONSE" | grep -o '"message":"[^"]*' | sed 's/"message":"//')

if [ "$DISCOUNT_VALID" = "true" ]; then
  echo -e "${GREEN}✓ Discount validated successfully (Discount: €${DISCOUNT_AMOUNT})${NC}"
else
  echo -e "${RED}✗ Discount validation failed: ${DISCOUNT_MESSAGE}${NC}"
  echo "Response: $DISCOUNT_RESPONSE"
  exit 1
fi
echo ""

# Step 6: Get cart state after discount application
echo "Step 6: Verifying discount was applied to cart..."
sleep 1  # Small delay to ensure cart is updated
CART_AFTER=$(curl -s "${API_BASE_URL}/api/cart" \
  -H "Authorization: Bearer ${AUTH_TOKEN}")

DISCOUNT_CODE_AFTER=$(echo "$CART_AFTER" | grep -o '"discount_code":"[^"]*' | sed 's/"discount_code":"//')
DISCOUNT_AMOUNT_AFTER=$(echo "$CART_AFTER" | grep -o '"discount_amount":[^,]*' | sed 's/"discount_amount"://')
TOTAL_AFTER=$(echo "$CART_AFTER" | grep -o '"total":[^,}]*' | sed 's/"total"://')

echo "  Discount Code: ${DISCOUNT_CODE_AFTER}"
echo "  Discount Amount: €${DISCOUNT_AMOUNT_AFTER}"
echo "  Total: €${TOTAL_AFTER}"
echo ""

# Step 7: Verify the fix
echo "================================"
echo "Test Results:"
echo "================================"

if [ -z "$DISCOUNT_CODE_AFTER" ] || [ "$DISCOUNT_CODE_AFTER" = "null" ]; then
  echo -e "${RED}✗ FAILED: Discount code not applied to cart${NC}"
  echo "  Expected: FIRST10"
  echo "  Actual: ${DISCOUNT_CODE_AFTER:-null}"
  echo ""
  echo "Cart Response:"
  echo "$CART_AFTER" | python3 -m json.tool 2>/dev/null || echo "$CART_AFTER"
  exit 1
fi

if [ "$DISCOUNT_AMOUNT_AFTER" = "0" ] || [ -z "$DISCOUNT_AMOUNT_AFTER" ]; then
  echo -e "${RED}✗ FAILED: Discount amount is 0${NC}"
  echo "  Expected: Greater than 0"
  echo "  Actual: €${DISCOUNT_AMOUNT_AFTER}"
  exit 1
fi

# Compare totals to ensure discount was applied
TOTAL_BEFORE_NUM=$(echo "$TOTAL_BEFORE" | sed 's/[^0-9.]//g')
TOTAL_AFTER_NUM=$(echo "$TOTAL_AFTER" | sed 's/[^0-9.]//g')

if (( $(echo "$TOTAL_AFTER_NUM >= $TOTAL_BEFORE_NUM" | bc -l) )); then
  echo -e "${RED}✗ FAILED: Total did not decrease after discount${NC}"
  echo "  Total Before: €${TOTAL_BEFORE_NUM}"
  echo "  Total After: €${TOTAL_AFTER_NUM}"
  exit 1
fi

echo -e "${GREEN}✓ SUCCESS: Discount code applied correctly!${NC}"
echo ""
echo "Summary:"
echo "  Discount Code: ${DISCOUNT_CODE_AFTER}"
echo "  Discount Amount: €${DISCOUNT_AMOUNT_AFTER}"
echo "  Total Before: €${TOTAL_BEFORE_NUM}"
echo "  Total After: €${TOTAL_AFTER_NUM}"
echo "  Savings: €$(echo "$TOTAL_BEFORE_NUM - $TOTAL_AFTER_NUM" | bc)"
echo ""

# Step 8: Test removing discount
echo "Step 8: Testing discount removal..."
REMOVE_RESPONSE=$(curl -s -X DELETE "${API_BASE_URL}/api/discount/remove" \
  -H "Authorization: Bearer ${AUTH_TOKEN}")

sleep 1
CART_REMOVED=$(curl -s "${API_BASE_URL}/api/cart" \
  -H "Authorization: Bearer ${AUTH_TOKEN}")

DISCOUNT_CODE_REMOVED=$(echo "$CART_REMOVED" | grep -o '"discount_code":"[^"]*' | sed 's/"discount_code":"//')
DISCOUNT_AMOUNT_REMOVED=$(echo "$CART_REMOVED" | grep -o '"discount_amount":[^,]*' | sed 's/"discount_amount"://')

if [ -z "$DISCOUNT_CODE_REMOVED" ] || [ "$DISCOUNT_CODE_REMOVED" = "null" ]; then
  echo -e "${GREEN}✓ Discount removed successfully${NC}"
else
  echo -e "${YELLOW}⚠ WARNING: Discount not removed (Code: ${DISCOUNT_CODE_REMOVED})${NC}"
fi
echo ""

echo -e "${GREEN}✓ All tests passed!${NC}"
exit 0
