#!/bin/bash

# Get admin token
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@coffeeshop.ie","password":"admin123"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# Get first discount code
DISCOUNT_LIST=$(curl -s \
  -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/admin/discounts?limit=1&offset=0")

CODE_ID=$(echo "$DISCOUNT_LIST" | grep -o '"code_id":"[^"]*' | head -1 | cut -d'"' -f4)

echo "Testing Discount Detail Endpoint for: $CODE_ID"
echo "================================================"
echo ""

# Get discount detail
DETAIL=$(curl -s \
  -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/admin/discounts/$CODE_ID")

echo "Full Response:"
echo "$DETAIL" | python3 -m json.tool 2>/dev/null || echo "$DETAIL"
echo ""
echo "Checking Array Fields:"
echo "----------------------"

# Check each array field
for field in "applicable_order_types" "applicable_category_ids" "applicable_item_ids"; do
  value=$(echo "$DETAIL" | grep -o "\"$field\":\[[^]]*\]" || echo "$DETAIL" | grep -o "\"$field\":null")
  if echo "$value" | grep -q "\[\]"; then
    echo "✅ $field: empty array []"
  elif echo "$value" | grep -q "\["; then
    echo "✅ $field: array with values - $value"
  elif echo "$value" | grep -q "null"; then
    echo "❌ $field: null (should be array)"
  else
    echo "⚠️  $field: could not parse"
  fi
done
