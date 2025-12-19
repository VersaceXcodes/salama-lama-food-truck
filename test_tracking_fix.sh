#!/bin/bash

echo "=========================================="
echo "Testing Order Tracking Fix"
echo "=========================================="
echo ""

# Test 1: Track order with only ticket number (should work)
echo "Test 1: Tracking with ticket number only"
echo "GET /api/orders/track?ticket=SL-123456"
curl -s -X GET "http://localhost:3000/api/orders/track?ticket=SL-123456" \
  -H "Content-Type: application/json" | jq '.' || echo "Failed"
echo ""
echo ""

# Test 2: Track order with empty ticket number (should fail with 400)
echo "Test 2: Tracking with empty ticket number"
echo "GET /api/orders/track?ticket="
curl -s -X GET "http://localhost:3000/api/orders/track?ticket=" \
  -H "Content-Type: application/json" | jq '.' || echo "Failed"
echo ""
echo ""

# Test 3: Track order without ticket parameter (should fail with 400)
echo "Test 3: Tracking without ticket parameter"
echo "GET /api/orders/track"
curl -s -X GET "http://localhost:3000/api/orders/track" \
  -H "Content-Type: application/json" | jq '.' || echo "Failed"
echo ""
echo ""

# Test 4: Track order with non-existent ticket (should fail with 404)
echo "Test 4: Tracking with non-existent ticket"
echo "GET /api/orders/track?ticket=SL-999999"
curl -s -X GET "http://localhost:3000/api/orders/track?ticket=SL-999999" \
  -H "Content-Type: application/json" | jq '.' || echo "Failed"
echo ""
echo ""

echo "=========================================="
echo "Testing Complete"
echo "=========================================="
