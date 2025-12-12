#!/bin/bash

echo "Testing Browser Test Fixes for INT-007"
echo "========================================"
echo ""

# Get admin token (assuming admin login works)
echo "1. Testing Admin Login..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@coffeeshop.ie","password":"admin123"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to get auth token"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Successfully logged in"
echo ""

# Test dashboard alerts endpoint
echo "2. Testing Dashboard Alerts Endpoint..."
ALERTS_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/admin/dashboard/alerts)

ALERTS_STATUS=$(echo "$ALERTS_RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
ALERTS_BODY=$(echo "$ALERTS_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$ALERTS_STATUS" = "200" ]; then
  echo "✅ Dashboard alerts endpoint working (200 OK)"
  echo "Response preview: $(echo $ALERTS_BODY | head -c 100)..."
else
  echo "❌ Dashboard alerts endpoint returned $ALERTS_STATUS"
  echo "Response: $ALERTS_BODY"
fi
echo ""

# Test activity logs endpoint
echo "3. Testing Activity Logs Endpoint..."
LOGS_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/admin/activity-logs?limit=5&offset=0")

LOGS_STATUS=$(echo "$LOGS_RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
LOGS_BODY=$(echo "$LOGS_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$LOGS_STATUS" = "200" ]; then
  echo "✅ Activity logs endpoint working (200 OK)"
  echo "Response preview: $(echo $LOGS_BODY | head -c 100)..."
else
  echo "❌ Activity logs endpoint returned $LOGS_STATUS"
  echo "Response: $LOGS_BODY"
fi
echo ""

# Test discount endpoint (get list first)
echo "4. Testing Discount List Endpoint..."
DISCOUNT_LIST=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/admin/discounts?limit=1&offset=0")

DISCOUNT_LIST_STATUS=$(echo "$DISCOUNT_LIST" | grep "HTTP_STATUS" | cut -d':' -f2)
DISCOUNT_LIST_BODY=$(echo "$DISCOUNT_LIST" | sed '/HTTP_STATUS/d')

if [ "$DISCOUNT_LIST_STATUS" = "200" ]; then
  echo "✅ Discount list endpoint working (200 OK)"
  
  # Extract first discount code_id if available
  CODE_ID=$(echo "$DISCOUNT_LIST_BODY" | grep -o '"code_id":"[^"]*' | head -1 | cut -d'"' -f4)
  
  if [ ! -z "$CODE_ID" ]; then
    echo "Found discount code: $CODE_ID"
    echo ""
    echo "5. Testing Discount Detail Endpoint..."
    
    DISCOUNT_DETAIL=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
      -H "Authorization: Bearer $TOKEN" \
      "http://localhost:3000/api/admin/discounts/$CODE_ID")
    
    DETAIL_STATUS=$(echo "$DISCOUNT_DETAIL" | grep "HTTP_STATUS" | cut -d':' -f2)
    DETAIL_BODY=$(echo "$DISCOUNT_DETAIL" | sed '/HTTP_STATUS/d')
    
    if [ "$DETAIL_STATUS" = "200" ]; then
      echo "✅ Discount detail endpoint working (200 OK)"
      
      # Check if applicable_order_types is an array
      if echo "$DETAIL_BODY" | grep -q '"applicable_order_types":\['; then
        echo "✅ applicable_order_types returned as array"
      elif echo "$DETAIL_BODY" | grep -q '"applicable_order_types":null'; then
        echo "⚠️  applicable_order_types is null (should be array)"
      elif echo "$DETAIL_BODY" | grep -q '"applicable_order_types":\[\]'; then
        echo "✅ applicable_order_types returned as empty array"
      fi
      
      echo "Response preview: $(echo $DETAIL_BODY | head -c 150)..."
    else
      echo "❌ Discount detail endpoint returned $DETAIL_STATUS"
      echo "Response: $DETAIL_BODY"
    fi
  else
    echo "⚠️  No discount codes found in database to test detail endpoint"
  fi
else
  echo "❌ Discount list endpoint returned $DISCOUNT_LIST_STATUS"
fi

echo ""
echo "========================================"
echo "Test completed!"
