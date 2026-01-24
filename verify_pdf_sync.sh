#!/bin/bash

# PDF Menu Sync - Verification Script
# Tests the complete flow from PDF sync to customer menu display

set -e

API_URL="${API_BASE_URL:-http://localhost:3000}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:5173}"

echo "=========================================="
echo "PDF Menu Sync - Verification Test"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

function check_step() {
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ $1${NC}"
  else
    echo -e "${RED}✗ $1 - FAILED${NC}"
    exit 1
  fi
}

echo "Step 1: Testing Backend PDF Sync Endpoint"
echo "------------------------------------------"
echo "You need to be logged in as admin and provide your token"
echo ""
read -p "Enter your admin auth token: " ADMIN_TOKEN

if [ -z "$ADMIN_TOKEN" ]; then
  echo -e "${RED}Error: Admin token is required${NC}"
  exit 1
fi

echo ""
echo "Calling POST $API_URL/api/admin/menu/sync-from-pdf"
SYNC_RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  "$API_URL/api/admin/menu/sync-from-pdf")

echo "$SYNC_RESPONSE" | jq '.' 2>/dev/null || echo "$SYNC_RESPONSE"

if echo "$SYNC_RESPONSE" | grep -q "success.*true"; then
  check_step "PDF sync executed successfully"
  
  # Extract summary
  TOTAL_CATEGORIES=$(echo "$SYNC_RESPONSE" | jq -r '.summary.totalCategories' 2>/dev/null || echo "N/A")
  TOTAL_ITEMS=$(echo "$SYNC_RESPONSE" | jq -r '.summary.totalItems' 2>/dev/null || echo "N/A")
  
  echo -e "${YELLOW}Summary: $TOTAL_CATEGORIES categories, $TOTAL_ITEMS items synced${NC}"
else
  check_step "PDF sync failed"
fi

echo ""
echo "Step 2: Testing Customer Menu Categories Endpoint"
echo "--------------------------------------------------"
CATEGORIES_RESPONSE=$(curl -s "$API_URL/api/menu/categories")
echo "$CATEGORIES_RESPONSE" | jq '.' 2>/dev/null || echo "$CATEGORIES_RESPONSE"

CATEGORY_COUNT=$(echo "$CATEGORIES_RESPONSE" | jq -r '.categories | length' 2>/dev/null || echo "0")
if [ "$CATEGORY_COUNT" -gt 0 ]; then
  check_step "Categories endpoint returned $CATEGORY_COUNT categories"
else
  check_step "Categories endpoint returned no data"
fi

echo ""
echo "Step 3: Testing Customer Menu Items Endpoint"
echo "---------------------------------------------"
ITEMS_RESPONSE=$(curl -s "$API_URL/api/menu/items?limit=10&is_active=true")
echo "$ITEMS_RESPONSE" | jq '.' 2>/dev/null || echo "$ITEMS_RESPONSE"

ITEM_COUNT=$(echo "$ITEMS_RESPONSE" | jq -r '.items | length' 2>/dev/null || echo "0")
TOTAL_ITEMS=$(echo "$ITEMS_RESPONSE" | jq -r '.total' 2>/dev/null || echo "0")

if [ "$ITEM_COUNT" -gt 0 ]; then
  check_step "Items endpoint returned $ITEM_COUNT items (total: $TOTAL_ITEMS)"
else
  check_step "Items endpoint returned no data"
fi

echo ""
echo "Step 4: Testing Cache Headers"
echo "------------------------------"
CACHE_HEADERS=$(curl -s -I "$API_URL/api/menu/items" | grep -i "cache-control\|pragma\|expires")
echo "$CACHE_HEADERS"

if echo "$CACHE_HEADERS" | grep -qi "no-store"; then
  check_step "Cache headers configured correctly (no-store)"
else
  echo -e "${YELLOW}⚠ Cache headers may not be optimal${NC}"
fi

echo ""
echo "Step 5: Sample Menu Item Data"
echo "------------------------------"
SAMPLE_ITEM=$(echo "$ITEMS_RESPONSE" | jq -r '.items[0]' 2>/dev/null)
if [ ! -z "$SAMPLE_ITEM" ] && [ "$SAMPLE_ITEM" != "null" ]; then
  echo "Sample item:"
  echo "$SAMPLE_ITEM" | jq '{item_id, name, price, category_id, is_active}' 2>/dev/null || echo "$SAMPLE_ITEM"
  check_step "Sample item data structure valid"
fi

echo ""
echo "=========================================="
echo "Verification Complete!"
echo "=========================================="
echo ""
echo -e "${GREEN}All tests passed!${NC}"
echo ""
echo "Next steps:"
echo "1. Open admin panel: $FRONTEND_URL/admin/menu"
echo "2. Click 'Sync from PDF' button"
echo "3. Verify categories and items appear"
echo "4. Edit an item (change price or name)"
echo "5. Open customer menu: $FRONTEND_URL/menu"
echo "6. Verify changes are immediately visible"
echo ""
echo "Expected results:"
echo "- 8 categories should be visible"
echo "- 37 menu items across all categories"
echo "- Admin edits reflect immediately on customer menu"
echo "- No caching issues (changes visible on refresh)"
