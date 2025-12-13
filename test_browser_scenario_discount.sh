#!/bin/bash

# Test script that simulates the exact browser test scenario
# This matches the test case that was failing

API_BASE_URL="${API_BASE_URL:-http://localhost:3000}"
TEST_EMAIL="john.smith@email.ie"
TEST_PASSWORD="password123"

echo "========================================"
echo "Browser Test Scenario - Discount Code"
echo "========================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Login
echo "Logging in as ${TEST_EMAIL}..."
LOGIN_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\"}")

AUTH_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | sed 's/"token":"//')
if [ -z "$AUTH_TOKEN" ]; then
  AUTH_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"auth_token":"[^"]*' | sed 's/"auth_token":"//')
fi

if [ -z "$AUTH_TOKEN" ]; then
  echo -e "${RED}✗ Login failed${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Logged in${NC}"
echo ""

# Clear cart
echo "Clearing cart..."
curl -s -X DELETE "${API_BASE_URL}/api/cart" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" > /dev/null
echo -e "${GREEN}✓ Cart cleared${NC}"
echo ""

# Add items to meet minimum order requirement
echo "Adding items to cart..."
curl -s -X POST "${API_BASE_URL}/api/cart/items" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"item_id":"item_x9IKeDcJ1QCZqquElmvp","quantity":1,"selected_customizations":{}}' > /dev/null

ADD_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/api/cart/items" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"item_id":"item_8-1WsOpjwL4DmYnLvWHW","quantity":1,"selected_customizations":{}}')

SUBTOTAL=$(echo "$ADD_RESPONSE" | grep -o '"subtotal":[0-9.]*' | sed 's/"subtotal"://')
TOTAL=$(echo "$ADD_RESPONSE" | grep -o '"total":[0-9.]*' | sed 's/"total"://')

echo -e "${GREEN}✓ Items added (Subtotal: €${SUBTOTAL}, Total: €${TOTAL})${NC}"
echo ""

# Test invalid code (should fail)
echo "Test 1: Testing INVALID code 'INVALID123'..."
INVALID_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/api/discount/validate" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"code\":\"INVALID123\",\"order_type\":\"collection\",\"order_value\":${SUBTOTAL}}")

INVALID_VALID=$(echo "$INVALID_RESPONSE" | grep -o '"valid":[^,]*' | sed 's/"valid"://')
INVALID_MESSAGE=$(echo "$INVALID_RESPONSE" | grep -o '"message":"[^"]*' | sed 's/"message":"//')

if [ "$INVALID_VALID" = "false" ]; then
  echo -e "${GREEN}✓ Invalid code correctly rejected: ${INVALID_MESSAGE}${NC}"
else
  echo -e "${RED}✗ FAILED: Invalid code was accepted${NC}"
  exit 1
fi
echo ""

# Test expired code (should fail)
echo "Test 2: Testing EXPIRED code 'EXPIRED'..."
EXPIRED_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/api/discount/validate" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"code\":\"EXPIRED\",\"order_type\":\"collection\",\"order_value\":${SUBTOTAL}}")

EXPIRED_VALID=$(echo "$EXPIRED_RESPONSE" | grep -o '"valid":[^,]*' | sed 's/"valid"://')
EXPIRED_MESSAGE=$(echo "$EXPIRED_RESPONSE" | grep -o '"message":"[^"]*' | sed 's/"message":"//')

if [ "$EXPIRED_VALID" = "false" ]; then
  echo -e "${GREEN}✓ Expired code correctly rejected: ${EXPIRED_MESSAGE}${NC}"
else
  echo -e "${RED}✗ FAILED: Expired code was accepted${NC}"
  exit 1
fi
echo ""

# Test valid code FIRST10 (should succeed)
echo "Test 3: Testing VALID code 'FIRST10'..."
VALID_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/api/discount/validate" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"code\":\"FIRST10\",\"order_type\":\"collection\",\"order_value\":${SUBTOTAL}}")

VALID=$(echo "$VALID_RESPONSE" | grep -o '"valid":[^,]*' | sed 's/"valid"://')
DISCOUNT_AMOUNT=$(echo "$VALID_RESPONSE" | grep -o '"discount_amount":[0-9.]*' | sed 's/"discount_amount"://')

if [ "$VALID" = "true" ]; then
  echo -e "${GREEN}✓ Valid code accepted (Discount: €${DISCOUNT_AMOUNT})${NC}"
else
  echo -e "${RED}✗ FAILED: Valid code was rejected${NC}"
  echo "Response: $VALID_RESPONSE"
  exit 1
fi
echo ""

# Verify discount appears in cart
echo "Test 4: Verifying discount appears in cart..."
sleep 1
CART_RESPONSE=$(curl -s "${API_BASE_URL}/api/cart" \
  -H "Authorization: Bearer ${AUTH_TOKEN}")

CART_DISCOUNT_CODE=$(echo "$CART_RESPONSE" | grep -o '"discount_code":"[^"]*' | sed 's/"discount_code":"//')
CART_DISCOUNT_AMOUNT=$(echo "$CART_RESPONSE" | grep -o '"discount_amount":[0-9.]*' | sed 's/"discount_amount"://')
CART_TOTAL=$(echo "$CART_RESPONSE" | grep -o '"total":[0-9.]*' | sed 's/"total"://')
CART_SUBTOTAL=$(echo "$CART_RESPONSE" | grep -o '"subtotal":[0-9.]*' | sed 's/"subtotal"://')
CART_TAX=$(echo "$CART_RESPONSE" | grep -o '"tax_amount":[0-9.]*' | sed 's/"tax_amount"://')

echo "Cart Details:"
echo "  Subtotal: €${CART_SUBTOTAL}"
echo "  Discount Code: ${CART_DISCOUNT_CODE}"
echo "  Discount Amount: €${CART_DISCOUNT_AMOUNT}"
echo "  Tax: €${CART_TAX}"
echo "  Total: €${CART_TOTAL}"
echo ""

# Validation checks
PASS=true

if [ -z "$CART_DISCOUNT_CODE" ] || [ "$CART_DISCOUNT_CODE" = "null" ]; then
  echo -e "${RED}✗ FAILED: Discount code not present in cart${NC}"
  PASS=false
else
  echo -e "${GREEN}✓ Discount code present: ${CART_DISCOUNT_CODE}${NC}"
fi

if [ "$CART_DISCOUNT_AMOUNT" = "0" ] || [ -z "$CART_DISCOUNT_AMOUNT" ]; then
  echo -e "${RED}✗ FAILED: Discount amount is 0${NC}"
  PASS=false
else
  echo -e "${GREEN}✓ Discount amount applied: €${CART_DISCOUNT_AMOUNT}${NC}"
fi

# Check that total is less than original (subtotal + tax)
ORIGINAL_TOTAL=$(echo "$CART_SUBTOTAL + $CART_TAX" | awk '{printf "%.2f", $1 + $3}')
if [ -n "$CART_TOTAL" ] && [ -n "$ORIGINAL_TOTAL" ]; then
  COMPARISON=$(echo "$CART_TOTAL < $ORIGINAL_TOTAL" | awk '{if ($1 < $3) print "true"; else print "false"}')
  if [ "$COMPARISON" = "true" ]; then
    echo -e "${GREEN}✓ Total reduced by discount${NC}"
  else
    echo -e "${RED}✗ FAILED: Total not reduced (${CART_TOTAL} should be less than ${ORIGINAL_TOTAL})${NC}"
    PASS=false
  fi
fi

echo ""
echo "========================================"
if [ "$PASS" = "true" ]; then
  echo -e "${GREEN}✓✓✓ ALL TESTS PASSED ✓✓✓${NC}"
  echo "The discount code application is working correctly!"
else
  echo -e "${RED}✗✗✗ SOME TESTS FAILED ✗✗✗${NC}"
  exit 1
fi
echo "========================================"
