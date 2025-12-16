#!/bin/bash
# Test script for guest and authenticated checkout
# This script tests order creation for both guest and authenticated users

API_BASE_URL="${API_BASE_URL:-http://localhost:3000}"

echo "================================"
echo "Testing Guest and Authenticated Checkout"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Guest Checkout (Collection Order with Cash Payment)
echo "Test 1: Guest Checkout - Collection Order"
echo "----------------------------------------"

GUEST_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/api/checkout/order" \
  -H "Content-Type: application/json" \
  -d '{
    "order_type": "collection",
    "collection_time_slot": "2024-12-20T14:00:00Z",
    "delivery_address_id": null,
    "discount_code": null,
    "special_instructions": "Test guest order",
    "customer_name": "Guest Customer",
    "customer_email": "guest@example.com",
    "customer_phone": "+353871111111",
    "payment_method_id": "cash_at_pickup",
    "idempotency_key": "test-guest-'$(date +%s)'"
  }')

if echo "$GUEST_RESPONSE" | grep -q '"order_id"'; then
  echo -e "${GREEN}✓ Guest checkout successful${NC}"
  ORDER_NUMBER=$(echo "$GUEST_RESPONSE" | grep -o '"order_number":"[^"]*"' | cut -d'"' -f4)
  TICKET_NUMBER=$(echo "$GUEST_RESPONSE" | grep -o '"ticket_number":"[^"]*"' | cut -d'"' -f4)
  echo "  Order Number: $ORDER_NUMBER"
  echo "  Ticket Number: $TICKET_NUMBER"
else
  echo -e "${RED}✗ Guest checkout failed${NC}"
  echo "  Response: $GUEST_RESPONSE"
fi

echo ""

# Test 2: Authenticated User Checkout
echo "Test 2: Authenticated User Checkout"
echo "----------------------------------------"

# First, login as a test user
LOGIN_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.smith@email.ie",
    "password": "password123"
  }')

if echo "$LOGIN_RESPONSE" | grep -q '"token"'; then
  echo -e "${GREEN}✓ Login successful${NC}"
  AUTH_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
  
  # Now place an order as authenticated user
  AUTH_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/api/checkout/order" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -d '{
      "order_type": "collection",
      "collection_time_slot": "2024-12-20T15:00:00Z",
      "delivery_address_id": null,
      "discount_code": null,
      "special_instructions": "Test authenticated order",
      "customer_name": "John Smith",
      "customer_email": "john.smith@email.ie",
      "customer_phone": "+353871234569",
      "payment_method_id": "cash_at_pickup",
      "idempotency_key": "test-auth-'$(date +%s)'"
    }')
  
  if echo "$AUTH_RESPONSE" | grep -q '"order_id"'; then
    echo -e "${GREEN}✓ Authenticated checkout successful${NC}"
    ORDER_NUMBER=$(echo "$AUTH_RESPONSE" | grep -o '"order_number":"[^"]*"' | cut -d'"' -f4)
    TICKET_NUMBER=$(echo "$AUTH_RESPONSE" | grep -o '"ticket_number":"[^"]*"' | cut -d'"' -f4)
    echo "  Order Number: $ORDER_NUMBER"
    echo "  Ticket Number: $TICKET_NUMBER"
  else
    echo -e "${RED}✗ Authenticated checkout failed${NC}"
    echo "  Response: $AUTH_RESPONSE"
  fi
else
  echo -e "${RED}✗ Login failed - cannot test authenticated checkout${NC}"
  echo "  Response: $LOGIN_RESPONSE"
fi

echo ""
echo "================================"
echo "Test Complete"
echo "================================"
