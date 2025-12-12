#!/bin/bash

echo "=== Testing Staff Orders API Fix ==="
echo ""

# Set base URL
BASE_URL="http://localhost:3000"

echo "1. Logging in as staff user..."
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"manager@coffeeshop.ie","password":"manager123","remember_me":false}')

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | sed 's/"token":"\(.*\)"/\1/')

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to get auth token"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Successfully logged in"
echo ""

echo "2. Fetching staff orders..."
ORDERS_RESPONSE=$(curl -s -X GET "${BASE_URL}/api/staff/orders?sort_by=created_at" \
  -H "Authorization: Bearer $TOKEN")

echo "$ORDERS_RESPONSE" | python3 -m json.tool > /tmp/orders_response.json 2>&1

if [ $? -ne 0 ]; then
  echo "❌ Invalid JSON response"
  echo "Response: $ORDERS_RESPONSE"
  exit 1
fi

echo "✅ Valid JSON response received"
echo ""

echo "3. Checking for items field in orders..."
ITEMS_COUNT=$(echo "$ORDERS_RESPONSE" | grep -o '"items"' | wc -l)

if [ "$ITEMS_COUNT" -eq 0 ]; then
  echo "❌ No 'items' field found in orders"
  echo "Response preview:"
  echo "$ORDERS_RESPONSE" | head -50
  exit 1
fi

echo "✅ Found 'items' field in $ITEMS_COUNT orders"
echo ""

echo "4. Sample order structure:"
echo "$ORDERS_RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if data.get('orders') and len(data['orders']) > 0:
        order = data['orders'][0]
        print(f\"  - Order ID: {order.get('order_id', 'N/A')}\")
        print(f\"  - Order Number: {order.get('order_number', 'N/A')}\")
        print(f\"  - Status: {order.get('status', 'N/A')}\")
        print(f\"  - Items Count: {len(order.get('items', []))}\")
        if order.get('items'):
            print(f\"  - First Item: {order['items'][0].get('item_name', 'N/A')} (Qty: {order['items'][0].get('quantity', 0)})\")
    else:
        print('  No orders found (this is okay if queue is empty)')
except Exception as e:
    print(f'  Error parsing: {e}')
"

echo ""
echo "=== Test Complete ==="
echo "✅ All checks passed! The staff orders endpoint now includes order items."
