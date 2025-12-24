#!/bin/bash

echo "🧪 Testing Builder Customization Modal Fix"
echo "=========================================="

API_BASE="http://localhost:3000"

# Test 1: Verify builder config exists
echo "✓ Test 1: Checking builder configuration..."
BUILDER_CONFIG=$(curl -s "$API_BASE/api/menu/builder-config")
ENABLED=$(echo "$BUILDER_CONFIG" | jq -r '.config.enabled')
if [ "$ENABLED" = "true" ]; then
  echo "  ✅ Builder is enabled"
else
  echo "  ❌ Builder is not enabled"
  exit 1
fi

# Test 2: Verify builder steps endpoint returns data
echo "✓ Test 2: Checking builder steps API..."
BUILDER_STEPS=$(curl -s "$API_BASE/api/menu/builder-steps")
STEP_COUNT=$(echo "$BUILDER_STEPS" | jq '.steps | length')
if [ "$STEP_COUNT" -gt 0 ]; then
  echo "  ✅ Found $STEP_COUNT steps"
else
  echo "  ❌ No steps returned"
  exit 1
fi

# Test 3: Verify first step has items
echo "✓ Test 3: Checking base step items..."
FIRST_STEP_ITEMS=$(echo "$BUILDER_STEPS" | jq '.steps[0].items | length')
if [ "$FIRST_STEP_ITEMS" -gt 0 ]; then
  echo "  ✅ Found $FIRST_STEP_ITEMS base items"
else
  echo "  ❌ No base items found"
  exit 1
fi

# Test 4: Verify items have is_active field
echo "✓ Test 4: Verifying item schema..."
HAS_IS_ACTIVE=$(echo "$BUILDER_STEPS" | jq '.steps[0].items[0] | has("is_active")')
HAS_OVERRIDE_PRICE=$(echo "$BUILDER_STEPS" | jq '.steps[0].items[0] | has("override_price")')
if [ "$HAS_IS_ACTIVE" = "true" ] && [ "$HAS_OVERRIDE_PRICE" = "true" ]; then
  echo "  ✅ Items have correct schema (is_active, override_price)"
else
  echo "  ❌ Items missing required fields"
  echo "     is_active: $HAS_IS_ACTIVE"
  echo "     override_price: $HAS_OVERRIDE_PRICE"
  exit 1
fi

# Test 5: Verify step structure
echo "✓ Test 5: Verifying step structure..."
FIRST_STEP=$(echo "$BUILDER_STEPS" | jq '.steps[0]')
STEP_NAME=$(echo "$FIRST_STEP" | jq -r '.step_name')
STEP_TYPE=$(echo "$FIRST_STEP" | jq -r '.step_type')
IS_REQUIRED=$(echo "$FIRST_STEP" | jq -r '.is_required')

echo "  Step Name: $STEP_NAME"
echo "  Step Type: $STEP_TYPE"
echo "  Required: $IS_REQUIRED"

if [ "$STEP_TYPE" = "single" ] && [ "$IS_REQUIRED" = "true" ]; then
  echo "  ✅ Step configuration is correct"
else
  echo "  ⚠️  Step configuration may need review"
fi

# Test 6: Verify all items have required fields
echo "✓ Test 6: Checking all item fields..."
SAMPLE_ITEM=$(echo "$BUILDER_STEPS" | jq '.steps[0].items[0]')
echo "$SAMPLE_ITEM" | jq '.'
REQUIRED_FIELDS=("step_item_id" "item_id" "name" "price" "override_price" "is_active" "sort_order")
ALL_PRESENT=true

for field in "${REQUIRED_FIELDS[@]}"; do
  HAS_FIELD=$(echo "$SAMPLE_ITEM" | jq "has(\"$field\")")
  if [ "$HAS_FIELD" = "true" ]; then
    echo "  ✅ Field '$field' present"
  else
    echo "  ❌ Field '$field' missing"
    ALL_PRESENT=false
  fi
done

if [ "$ALL_PRESENT" = "true" ]; then
  echo "  ✅ All required fields present"
else
  echo "  ❌ Some fields are missing"
  exit 1
fi

echo ""
echo "=========================================="
echo "✅ All API tests passed!"
echo "🎯 Next: Test the UI manually in browser"
echo ""
echo "Manual Testing Steps:"
echo "   1. Open http://localhost:5173/menu"
echo "   2. Find a Subs or Wraps category item"
echo "   3. Click 'Add to Cart' or the item card"
echo "   4. Verify 'Choose Your Base' step shows options"
echo "   5. Select a base option (should show checkmark)"
echo "   6. Click 'Next' and verify step 2 appears"
echo "   7. Complete all steps and add to cart"
echo ""
echo "Expected Results:"
echo "   ✓ Base options list is NOT empty"
echo "   ✓ Options show name, description, and price"
echo "   ✓ Selection indicators work (radio buttons)"
echo "   ✓ 'Next' button unlocks after selection"
echo "   ✓ Loading spinner shows while fetching"
echo "   ✓ Empty/error states display if needed"
echo "=========================================="
