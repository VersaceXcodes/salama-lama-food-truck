#!/bin/bash

# Test script to verify guest checkout fixes
# Tests both with and without discount codes

set -e

BACKEND_URL="http://localhost:3000"
REQUEST_ID="test_$(date +%s)"

echo "========================================="
echo "Testing Guest Checkout Fix"
echo "========================================="
echo ""

# Step 1: Get a menu item
echo "Step 1: Fetching menu items..."
MENU_RESPONSE=$(curl -s "${BACKEND_URL}/api/menu/items?limit=1&offset=0")
ITEM_ID=$(echo "$MENU_RESPONSE" | jq -r '.items[0].item_id')
ITEM_NAME=$(echo "$MENU_RESPONSE" | jq -r '.items[0].name')
echo "✓ Selected item: $ITEM_NAME (ID: $ITEM_ID)"
echo ""

# Step 2: Add item to cart (guest session)
echo "Step 2: Adding item to cart as guest..."
CART_RESPONSE=$(curl -s -X POST "${BACKEND_URL}/api/cart/items" \
  -H "Content-Type: application/json" \
  -c /tmp/guest_cookies.txt \
  -d "{
    \"item_id\": \"$ITEM_ID\",
    \"quantity\": 2
  }")
CART_TOTAL=$(echo "$CART_RESPONSE" | jq -r '.total')
echo "✓ Cart total: €$CART_TOTAL"
echo ""

# Step 3: Get available collection time slots
echo "Step 3: Getting collection time slots..."
SLOTS_RESPONSE=$(curl -s "${BACKEND_URL}/api/checkout/collection-time-slots")
TIME_SLOT=$(echo "$SLOTS_RESPONSE" | jq -r '.slots[0].time')
echo "✓ Selected time slot: $TIME_SLOT"
echo ""

# Test Case 1: Guest checkout WITHOUT discount code
echo "========================================="
echo "TEST CASE 1: Guest Checkout (No Discount)"
echo "========================================="
echo ""

ORDER_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "${BACKEND_URL}/api/checkout/create-order" \
  -H "Content-Type: application/json" \
  -b /tmp/guest_cookies.txt \
  -d "{
    \"order_type\": \"collection\",
    \"collection_time_slot\": \"$TIME_SLOT\",
    \"customer_name\": \"Guest User Test\",
    \"customer_email\": \"guest.test@example.com\",
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
  echo "✓ TEST PASSED: Guest order created successfully!"
  echo "  Order Number: $ORDER_NUMBER"
else
  echo "✗ TEST FAILED: Guest checkout without discount failed"
  ERROR_CODE=$(echo "$ORDER_BODY" | jq -r '.error_code')
  ERROR_MSG=$(echo "$ORDER_BODY" | jq -r '.message')
  REQUEST_ID=$(echo "$ORDER_BODY" | jq -r '.request_id')
  echo "  Error Code: $ERROR_CODE"
  echo "  Error Message: $ERROR_MSG"
  echo "  Request ID: $REQUEST_ID"
  
  # Check backend logs for this request
  echo ""
  echo "Backend logs for request $REQUEST_ID:"
  grep "$REQUEST_ID" /tmp/backend.log | tail -20
  
  exit 1
fi

echo ""

# Test Case 2: Guest checkout WITH discount code
echo "========================================="
echo "TEST CASE 2: Guest Checkout (With Discount)"
echo "========================================="
echo ""

# First, need to add items to cart again (cart was cleared after previous order)
echo "Adding item to cart again..."
CART_RESPONSE=$(curl -s -X POST "${BACKEND_URL}/api/cart/items" \
  -H "Content-Type: application/json" \
  -b /tmp/guest_cookies.txt \
  -d "{
    \"item_id\": \"$ITEM_ID\",
    \"quantity\": 2
  }")
echo "✓ Cart refreshed"
echo ""

# Create a test discount code if needed
echo "Creating test discount code..."
ADMIN_LOGIN=$(curl -s -X POST "${BACKEND_URL}/api/admin/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@salamalama.ie",
    "password": "admin123"
  }')
ADMIN_TOKEN=$(echo "$ADMIN_LOGIN" | jq -r '.token')

# Create a simple discount code for testing
DISCOUNT_CODE="GUESTTEST10"
curl -s -X POST "${BACKEND_URL}/api/admin/discount-codes" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d "{
    \"code\": \"$DISCOUNT_CODE\",
    \"discount_type\": \"percentage\",
    \"discount_value\": 10,
    \"applicable_order_types\": [\"collection\", \"delivery\"],
    \"status\": \"active\",
    \"valid_from\": \"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\",
    \"valid_until\": \"$(date -u -d '+30 days' +%Y-%m-%dT%H:%M:%S.000Z)\"
  }" > /dev/null 2>&1

echo "✓ Test discount code created: $DISCOUNT_CODE"
echo ""

# Now try checkout with discount
ORDER_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "${BACKEND_URL}/api/checkout/create-order" \
  -H "Content-Type: application/json" \
  -b /tmp/guest_cookies.txt \
  -d "{
    \"order_type\": \"collection\",
    \"collection_time_slot\": \"$TIME_SLOT\",
    \"discount_code\": \"$DISCOUNT_CODE\",
    \"customer_name\": \"Guest User Test\",
    \"customer_email\": \"guest.test@example.com\",
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
  echo "✓ TEST PASSED: Guest order with discount created successfully!"
  echo "  Order Number: $ORDER_NUMBER"
else
  echo "✗ TEST FAILED: Guest checkout with discount failed"
  ERROR_CODE=$(echo "$ORDER_BODY" | jq -r '.error_code')
  ERROR_MSG=$(echo "$ORDER_BODY" | jq -r '.message')
  REQUEST_ID=$(echo "$ORDER_BODY" | jq -r '.request_id')
  echo "  Error Code: $ERROR_CODE"
  echo "  Error Message: $ERROR_MSG"
  echo "  Request ID: $REQUEST_ID"
  
  # Check backend logs for this request
  echo ""
  echo "Backend logs for request $REQUEST_ID:"
  grep "$REQUEST_ID" /tmp/backend.log | tail -20
  
  exit 1
fi

echo ""
echo "========================================="
echo "ALL TESTS PASSED!"
echo "========================================="
echo ""
echo "Summary:"
echo "✓ Guest checkout without discount works"
echo "✓ Guest checkout with discount code works"
echo ""
echo "The fix successfully allows guests to place orders!"
