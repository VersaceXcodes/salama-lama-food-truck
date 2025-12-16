#!/bin/bash

# Test script to verify authenticated user checkout with discount
set -e

BACKEND_URL="http://localhost:3000"

echo "========================================="
echo "Testing Authenticated Checkout with Discount"
echo "========================================="
echo ""

# Step 1: Login as customer
echo "Step 1: Logging in as customer..."
LOGIN_RESPONSE=$(curl -s -X POST "${BACKEND_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer1@example.com",
    "password": "password123"
  }')
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token')
USER_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.user.user_id')
echo "✓ Logged in as customer (ID: $USER_ID)"
echo ""

# Step 2: Get a menu item
echo "Step 2: Fetching menu items..."
MENU_RESPONSE=$(curl -s "${BACKEND_URL}/api/menu/items?limit=1&offset=0")
ITEM_ID=$(echo "$MENU_RESPONSE" | jq -r '.items[0].item_id')
ITEM_NAME=$(echo "$MENU_RESPONSE" | jq -r '.items[0].name')
echo "✓ Selected item: $ITEM_NAME (ID: $ITEM_ID)"
echo ""

# Step 3: Add item to cart
echo "Step 3: Adding item to cart..."
CART_RESPONSE=$(curl -s -X POST "${BACKEND_URL}/api/cart/items" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"item_id\": \"$ITEM_ID\",
    \"quantity\": 2
  }")
CART_TOTAL=$(echo "$CART_RESPONSE" | jq -r '.total')
echo "✓ Cart total: €$CART_TOTAL"
echo ""

# Step 4: Get available collection time slots
echo "Step 4: Getting collection time slots..."
SLOTS_RESPONSE=$(curl -s "${BACKEND_URL}/api/checkout/collection-time-slots")
TIME_SLOT=$(echo "$SLOTS_RESPONSE" | jq -r '.slots[0].time')
echo "✓ Selected time slot: $TIME_SLOT"
echo ""

# Test Case 1: Authenticated checkout WITH discount code (using first order discount)
echo "========================================="
echo "TEST CASE 1: Authenticated Checkout (With First Order Discount)"
echo "========================================="
echo ""

# Get the user's first order discount code
USER_INFO=$(curl -s "${BACKEND_URL}/api/profile" \
  -H "Authorization: Bearer $TOKEN")
DISCOUNT_CODE=$(echo "$USER_INFO" | jq -r '.user.first_order_discount_code // empty')

if [ -z "$DISCOUNT_CODE" ] || [ "$DISCOUNT_CODE" = "null" ]; then
  echo "⚠ No first order discount available, testing without discount"
  DISCOUNT_CODE=""
else
  echo "✓ Using first order discount code: $DISCOUNT_CODE"
fi
echo ""

ORDER_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "${BACKEND_URL}/api/checkout/create-order" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"order_type\": \"collection\",
    \"collection_time_slot\": \"$TIME_SLOT\",
    ${DISCOUNT_CODE:+\"discount_code\": \"$DISCOUNT_CODE\",}
    \"customer_name\": \"Test Customer\",
    \"customer_email\": \"customer1@example.com\",
    \"customer_phone\": \"0851234567\",
    \"payment_method_id\": \"cash_at_pickup\"
  }")

HTTP_STATUS=$(echo "$ORDER_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
ORDER_BODY=$(echo "$ORDER_RESPONSE" | sed '/HTTP_STATUS:/d')

echo "Response Status: $HTTP_STATUS"
echo "Response Body:"
echo "$ORDER_BODY" | jq '.'
echo ""

if [ "$HTTP_STATUS" = "201" ]; then
  ORDER_NUMBER=$(echo "$ORDER_BODY" | jq -r '.order_number')
  echo "✓ TEST PASSED: Authenticated order created successfully!"
  echo "  Order Number: $ORDER_NUMBER"
  
  # Check if discount was applied
  if [ -n "$DISCOUNT_CODE" ] && [ "$DISCOUNT_CODE" != "null" ]; then
    echo "  ✓ Discount code was used successfully"
  fi
else
  echo "✗ TEST FAILED: Authenticated checkout failed"
  ERROR_CODE=$(echo "$ORDER_BODY" | jq -r '.error_code')
  ERROR_MSG=$(echo "$ORDER_BODY" | jq -r '.message')
  REQUEST_ID=$(echo "$ORDER_BODY" | jq -r '.request_id')
  echo "  Error Code: $ERROR_CODE"
  echo "  Error Message: $ERROR_MSG"
  echo "  Request ID: $REQUEST_ID"
  
  # Check backend logs for this request
  if [ -n "$REQUEST_ID" ] && [ "$REQUEST_ID" != "null" ]; then
    echo ""
    echo "Backend logs for request $REQUEST_ID:"
    grep "$REQUEST_ID" /tmp/backend.log 2>/dev/null | tail -20 || echo "No logs found"
  fi
  
  exit 1
fi

echo ""
echo "========================================="
echo "TEST PASSED!"
echo "========================================="
