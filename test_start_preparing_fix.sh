#!/bin/bash

# Test script for "Start Preparing" button fix
# Tests the staff order status update functionality

set -e

API_BASE="${API_BASE:-http://localhost:3000}"
STAFF_EMAIL="${STAFF_EMAIL:-manager@coffeeshop.ie}"
STAFF_PASSWORD="${STAFF_PASSWORD:-manager123}"

echo "=========================================="
echo "Staff Order Queue - Start Preparing Fix Test"
echo "=========================================="
echo ""

# Step 1: Login as staff user
echo "Step 1: Logging in as staff user..."
LOGIN_RESPONSE=$(curl -s -X POST "${API_BASE}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${STAFF_EMAIL}\",\"password\":\"${STAFF_PASSWORD}\"}")

AUTH_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"auth_token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$AUTH_TOKEN" ]; then
  echo "❌ Login failed!"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✓ Login successful"
echo "Token: ${AUTH_TOKEN:0:20}..."
echo ""

# Step 2: Get list of orders
echo "Step 2: Fetching staff orders..."
ORDERS_RESPONSE=$(curl -s -X GET "${API_BASE}/api/staff/orders" \
  -H "Authorization: Bearer ${AUTH_TOKEN}")

# Check if we got orders
ORDER_COUNT=$(echo $ORDERS_RESPONSE | grep -o '"order_id"' | wc -l)
echo "✓ Found ${ORDER_COUNT} orders"

if [ "$ORDER_COUNT" -eq 0 ]; then
  echo "⚠ No orders found. Creating a test order first..."
  
  # Login as customer to create an order
  CUSTOMER_LOGIN=$(curl -s -X POST "${API_BASE}/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"john.smith@email.ie","password":"password123"}')
  
  CUSTOMER_TOKEN=$(echo $CUSTOMER_LOGIN | grep -o '"auth_token":"[^"]*"' | cut -d'"' -f4)
  
  if [ -z "$CUSTOMER_TOKEN" ]; then
    echo "❌ Could not login as customer to create test order"
    exit 1
  fi
  
  echo "⚠ Please create a test order manually and re-run this script"
  exit 0
fi
echo ""

# Step 3: Find an order with status 'received'
echo "Step 3: Looking for order with 'received' status..."
RECEIVED_ORDER_ID=$(echo $ORDERS_RESPONSE | grep -o '"order_id":"ord_[^"]*","order_number":"[^"]*","user_id":"[^"]*","order_type":"[^"]*","status":"received"' | head -1 | grep -o '"order_id":"[^"]*"' | cut -d'"' -f4)

if [ -z "$RECEIVED_ORDER_ID" ]; then
  echo "⚠ No orders with 'received' status found"
  echo "Looking for any order to test with..."
  RECEIVED_ORDER_ID=$(echo $ORDERS_RESPONSE | grep -o '"order_id":"[^"]*"' | head -1 | cut -d'"' -f4)
  
  if [ -z "$RECEIVED_ORDER_ID" ]; then
    echo "❌ No orders available for testing"
    exit 1
  fi
fi

echo "✓ Found order: $RECEIVED_ORDER_ID"
echo ""

# Step 4: Update order status to 'preparing'
echo "Step 4: Updating order status to 'preparing'..."
UPDATE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X PUT "${API_BASE}/api/staff/orders/${RECEIVED_ORDER_ID}/status" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"status":"preparing"}')

HTTP_STATUS=$(echo "$UPDATE_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
RESPONSE_BODY=$(echo "$UPDATE_RESPONSE" | grep -v "HTTP_STATUS:")

echo "HTTP Status: $HTTP_STATUS"
echo "Response: $RESPONSE_BODY"
echo ""

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ SUCCESS: Order status updated successfully!"
  
  # Parse response
  SUCCESS=$(echo $RESPONSE_BODY | grep -o '"success":true')
  MESSAGE=$(echo $RESPONSE_BODY | grep -o '"message":"[^"]*"' | cut -d'"' -f4)
  NEW_STATUS=$(echo $RESPONSE_BODY | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
  
  echo "  - Success: $SUCCESS"
  echo "  - Message: $MESSAGE"
  echo "  - New Status: $NEW_STATUS"
  
elif [ "$HTTP_STATUS" = "403" ]; then
  echo "❌ FAILED: Permission denied"
  echo "  - This staff user does not have 'manage_orders' permission"
  echo "  - Check staff_permissions in database"
  
elif [ "$HTTP_STATUS" = "400" ]; then
  echo "❌ FAILED: Bad request"
  ERROR_CODE=$(echo $RESPONSE_BODY | grep -o '"error_code":"[^"]*"' | cut -d'"' -f4)
  MESSAGE=$(echo $RESPONSE_BODY | grep -o '"message":"[^"]*"' | cut -d'"' -f4)
  echo "  - Error Code: $ERROR_CODE"
  echo "  - Message: $MESSAGE"
  
else
  echo "❌ FAILED: Unexpected error"
  echo "  - HTTP Status: $HTTP_STATUS"
  echo "  - Response: $RESPONSE_BODY"
fi

echo ""
echo "=========================================="
echo "Test Complete"
echo "=========================================="
echo ""
echo "To test in browser:"
echo "1. Navigate to http://localhost:5173/staff/login"
echo "2. Login with: ${STAFF_EMAIL} / ${STAFF_PASSWORD}"
echo "3. Go to Order Queue page"
echo "4. Click 'Start Preparing' on any order"
echo "5. Check browser console for logs"
echo "6. Look for toast notification"
echo ""
