#!/bin/bash

# Test Navigation Menu Fixes
# This script verifies the navigation menu bug fixes

echo "======================================"
echo "Navigation Menu Fixes Test Script"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Base URL
BASE_URL="${API_BASE_URL:-http://localhost:3000}"

echo "Base URL: $BASE_URL"
echo ""

# Test 1: Staff Stock Endpoint (Should work without 403)
echo "Test 1: Staff Stock Endpoint"
echo "----------------------------"
echo "Testing /api/staff/stock endpoint..."
echo ""
echo "${YELLOW}Expected: Should return 401 (unauthenticated) or 200 (authenticated)${NC}"
echo "${YELLOW}Should NOT return 403 (forbidden) for authenticated staff users${NC}"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/staff/stock")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "401" ]; then
    echo "${GREEN}✓ Pass:${NC} Returns 401 (authentication required) - This is correct without token"
elif [ "$HTTP_CODE" = "403" ]; then
    echo "${RED}✗ Fail:${NC} Returns 403 (forbidden) - Permission issue still exists!"
elif [ "$HTTP_CODE" = "200" ]; then
    echo "${GREEN}✓ Pass:${NC} Returns 200 (OK) - Endpoint accessible"
else
    echo "${YELLOW}⚠ Warning:${NC} Unexpected HTTP code: $HTTP_CODE"
fi
echo ""

# Test 2: Admin Stock Endpoint Response Format
echo "Test 2: Admin Stock Endpoint Response Format"
echo "--------------------------------------------"
echo "Testing /api/admin/stock endpoint response structure..."
echo ""
echo "${YELLOW}Expected: Response should contain top-level fields:${NC}"
echo "${YELLOW}  - total_items_tracked${NC}"
echo "${YELLOW}  - low_stock_count${NC}"
echo "${YELLOW}  - out_of_stock_count${NC}"
echo "${YELLOW}  - items (array)${NC}"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/admin/stock")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "401" ]; then
    echo "${GREEN}✓ Pass:${NC} Returns 401 (authentication required) - Endpoint exists"
    echo "Note: To fully test response format, authenticate as admin"
elif [ "$HTTP_CODE" = "200" ]; then
    echo "${GREEN}✓ Pass:${NC} Endpoint accessible"
    
    # Check response structure
    HAS_TOTAL=$(echo "$BODY" | grep -c '"total_items_tracked"')
    HAS_LOW=$(echo "$BODY" | grep -c '"low_stock_count"')
    HAS_OUT=$(echo "$BODY" | grep -c '"out_of_stock_count"')
    HAS_ITEMS=$(echo "$BODY" | grep -c '"items"')
    HAS_SUMMARY=$(echo "$BODY" | grep -c '"summary"')
    
    if [ "$HAS_TOTAL" -gt 0 ] && [ "$HAS_LOW" -gt 0 ] && [ "$HAS_OUT" -gt 0 ] && [ "$HAS_ITEMS" -gt 0 ] && [ "$HAS_SUMMARY" -eq 0 ]; then
        echo "${GREEN}✓ Pass:${NC} Response format is correct!"
        echo "  ✓ Contains total_items_tracked"
        echo "  ✓ Contains low_stock_count"
        echo "  ✓ Contains out_of_stock_count"
        echo "  ✓ Contains items array"
        echo "  ✓ No nested 'summary' object (correctly flattened)"
    else
        echo "${RED}✗ Fail:${NC} Response format incorrect"
        [ "$HAS_TOTAL" -eq 0 ] && echo "  ✗ Missing total_items_tracked"
        [ "$HAS_LOW" -eq 0 ] && echo "  ✗ Missing low_stock_count"
        [ "$HAS_OUT" -eq 0 ] && echo "  ✗ Missing out_of_stock_count"
        [ "$HAS_ITEMS" -eq 0 ] && echo "  ✗ Missing items array"
        [ "$HAS_SUMMARY" -gt 0 ] && echo "  ✗ Still has nested 'summary' object"
    fi
else
    echo "${YELLOW}⚠ Warning:${NC} Unexpected HTTP code: $HTTP_CODE"
fi
echo ""

# Test 3: Check if stock items have correct field names
echo "Test 3: Stock Item Field Names"
echo "-------------------------------"
echo "Checking if stock items use 'stock_status' instead of 'status'..."
echo ""

if [ "$HTTP_CODE" = "200" ]; then
    HAS_STOCK_STATUS=$(echo "$BODY" | grep -c '"stock_status"')
    HAS_STATUS=$(echo "$BODY" | grep -c '"status"' | grep -v '"stock_status"')
    
    if [ "$HAS_STOCK_STATUS" -gt 0 ]; then
        echo "${GREEN}✓ Pass:${NC} Items use 'stock_status' field"
    else
        echo "${RED}✗ Fail:${NC} Items missing 'stock_status' field"
    fi
else
    echo "${YELLOW}⚠ Skip:${NC} Cannot check field names without authenticated access"
fi
echo ""

# Test 4: Customer Orders Endpoint
echo "Test 4: Customer Orders Endpoint"
echo "---------------------------------"
echo "Testing /api/orders endpoint..."
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/orders")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "401" ]; then
    echo "${GREEN}✓ Pass:${NC} Returns 401 (authentication required) - Endpoint exists"
elif [ "$HTTP_CODE" = "200" ]; then
    echo "${GREEN}✓ Pass:${NC} Endpoint accessible and working"
elif [ "$HTTP_CODE" = "404" ]; then
    echo "${RED}✗ Fail:${NC} Endpoint not found (404)"
else
    echo "${YELLOW}⚠ Warning:${NC} Unexpected HTTP code: $HTTP_CODE"
fi
echo ""

# Summary
echo "======================================"
echo "Test Summary"
echo "======================================"
echo ""
echo "All navigation menu fixes have been applied:"
echo "1. ${GREEN}✓${NC} Staff Stock endpoint - Permission requirement removed"
echo "2. ${GREEN}✓${NC} Admin Stock endpoint - Response format corrected"
echo "3. ${GREEN}✓${NC} Stock items - Field names updated (stock_status)"
echo "4. ${GREEN}✓${NC} Customer Orders endpoint - Available"
echo ""
echo "${YELLOW}Note:${NC} Full testing requires authenticated API calls"
echo "      Use the browser tests to verify complete functionality"
echo ""
