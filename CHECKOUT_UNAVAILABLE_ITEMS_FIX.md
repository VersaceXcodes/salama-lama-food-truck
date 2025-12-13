# Checkout Unavailable Items Fix

## Problem
When users clicked "Proceed to Checkout" in the cart, they received an error: "Item no longer available" for items with IDs like `item_nq-T8ehAau4N68Cm3w3e` and `item_WOLhL-jRUBPl2Yu9oCdE`. The validation was failing because:

1. These items either don't exist in the database or have `is_active = false`
2. The cart validation logic was filtering out unavailable items from the response
3. The frontend couldn't display proper warnings because the unavailable items weren't included in the cart items list

## Root Cause
In `backend/server.ts`, the `compute_cart_totals` function was:
- Correctly identifying unavailable items and adding validation errors
- BUT skipping them with `continue`, so they weren't included in `computed_items`
- This meant the frontend received validation errors for items that weren't in the cart response

## Solution
Modified `compute_cart_totals` function in `backend/server.ts` (lines 1023-1075):

### Backend Changes (server.ts:1023-1075)
```typescript
// OLD CODE - skipped unavailable items
if (!menu_item || !menu_item.is_active) {
  validation_errors.push({ field: cart_item.item_id, error: 'ITEM_UNAVAILABLE', message: 'Item no longer available' });
  continue; // ❌ Item not included in response
}

// NEW CODE - includes unavailable items with is_available flag
if (!menu_item || !menu_item.is_active) {
  validation_errors.push({ field: cart_item.item_id, error: 'ITEM_UNAVAILABLE', message: 'Item no longer available' });
  // ✅ Still include the item so frontend can display it
  computed_items.push({
    cart_item_id: cart_item.cart_item_id,
    item_id: cart_item.item_id,
    item_name: menu_item?.name || 'Unavailable Item',
    image_url: menu_item?.image_url ?? null,
    quantity: cart_item.quantity,
    unit_price: 0,
    selected_customizations: cart_item.selected_customizations || null,
    line_total: 0,
    stock_tracked: false,
    current_stock: null,
    low_stock_threshold: null,
    category_id: menu_item?.category_id ?? null,
    is_available: false, // ✅ Mark as unavailable
  });
  continue;
}

// Available items get is_available: true
computed_items.push({
  // ... existing fields
  is_available: true, // ✅ Mark as available
});
```

### Frontend Changes (UV_Cart.tsx)
1. **Updated CartItem interface** to include `is_available?: boolean`

2. **Visual indicators for unavailable items:**
   - Red background and border for unavailable item cards
   - Alert banner at top of unavailable items with "Item No Longer Available" message
   - Strike-through on item name
   - Hide quantity controls and unit price
   - Prominent "Remove" button for unavailable items

3. **Rendering logic:**
```typescript
const isAvailable = item.is_available !== false;

// Apply conditional styling
className={`rounded-xl shadow-md border p-6 transition-all duration-200 hover:shadow-lg ${
  isAvailable 
    ? 'bg-white border-gray-200' 
    : 'bg-red-50 border-red-300 opacity-75'
}`}

// Show alert for unavailable items
{!isAvailable && (
  <div className="mb-3 flex items-start space-x-2 bg-red-100 border border-red-300 rounded-lg p-3">
    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
    <div className="flex-1">
      <p className="text-sm font-semibold text-red-900">Item No Longer Available</p>
      <p className="text-xs text-red-700 mt-1">Please remove this item to continue with checkout</p>
    </div>
  </div>
)}
```

## User Experience
After this fix:
1. ✅ Unavailable items are displayed in the cart with clear visual warnings
2. ✅ Users can see which items are unavailable and why they can't checkout
3. ✅ Users can easily remove unavailable items with the prominent "Remove" button
4. ✅ Checkout validation properly prevents orders with unavailable items
5. ✅ The cart totals exclude unavailable items (they contribute €0.00)

## Testing
1. Navigate to cart page with unavailable items
2. Verify unavailable items are displayed with red styling and alert
3. Verify quantity controls are hidden for unavailable items
4. Click "Proceed to Checkout" - should show validation error
5. Remove unavailable items using the "Remove" button
6. Verify checkout proceeds normally after removing unavailable items

## Files Changed
- `/app/backend/server.ts` (lines 1023-1075)
- `/app/vitereact/src/components/views/UV_Cart.tsx` (interface definition and rendering logic)

## Related
- Similar fix may be needed in checkout review page if it displays cart items
- Consider adding a "Remove All Unavailable Items" bulk action button for better UX
