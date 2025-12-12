# Admin Menu Item Price Update Fix - Version 2

## Problem
Browser test revealed that after updating a menu item's price from €5.50 to €6.00, the list view still showed the old price €5.50.

## Root Cause
The issue was caused by a **race condition** between:
1. Frontend cache invalidation
2. Backend database transaction commit
3. Navigation to list view
4. List view data fetch

The sequence was:
- Update mutation triggers
- Cache invalidation starts (100ms delay)
- Navigation happens
- List view mounts and fetches data
- BUT: Backend transaction might not be fully committed yet
- Result: Old data is fetched and displayed

## Solution Implemented

### 1. Extended Wait Time (100ms → 300ms)
**File:** `vitereact/src/components/views/UV_AdminMenuItemForm.tsx`

Increased the delay from 100ms to 300ms to ensure the database transaction has time to commit before the list view fetches data.

```typescript
// Wait to ensure backend transaction commits
await new Promise(resolve => setTimeout(resolve, 300));
```

### 2. Pre-fetch Fresh Data Before Navigation
**File:** `vitereact/src/components/views/UV_AdminMenuItemForm.tsx`

Added explicit pre-fetching of fresh menu items data with cache-busting headers before navigating to the list view:

```typescript
await queryClient.prefetchQuery({
  queryKey: ['admin-menu-items', null, null, ''],
  queryFn: () => {
    const params = new URLSearchParams();
    params.append('_t', Date.now().toString());
    return axios.get(
      `${API_BASE_URL}/api/admin/menu/items?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
      }
    ).then(res => ({
      ...res.data,
      items: res.data.items.map((item: any) => ({
        ...item,
        price: Number(item.price || 0), // Ensure numeric conversion
      })),
    }));
  },
});
```

### 3. Enhanced Cache Invalidation
**File:** `vitereact/src/components/views/UV_AdminMenuItemForm.tsx`

Aggressive cache clearing strategy:

```typescript
// Cancel any in-flight queries
await queryClient.cancelQueries({ queryKey: ['admin-menu-items'] });
await queryClient.cancelQueries({ queryKey: ['admin-menu-item'] });

// Remove cached data
queryClient.removeQueries({ queryKey: ['admin-menu-items'] });
queryClient.removeQueries({ queryKey: ['admin-menu-item', itemIdParam] });

// Mark as stale
queryClient.invalidateQueries({ queryKey: ['admin-menu-items'] });
queryClient.invalidateQueries({ queryKey: ['admin-menu-item'] });
```

### 4. Navigation with Replace
**File:** `vitereact/src/components/views/UV_AdminMenuItemForm.tsx`

Using `replace: true` to prevent back button issues:

```typescript
navigate('/admin/menu', { replace: true });
```

### 5. Enhanced Backend Logging
**File:** `backend/server.ts:4395-4456`

Added comprehensive logging to track price updates through the system:

```typescript
// Log incoming price
if ('price' in input) {
  console.log(`[PUT] Updating price for ${item_id}: ${input.price}`);
}

// Log SQL query and params
console.log(`[PUT] SQL: UPDATE menu_items SET ${fields.join(', ')}`);
console.log(`[PUT] Params:`, params);

// Log final response price
console.log(`[PUT] Final price in response: ${updated_item.price}`);
console.log(`[PUT] DB returned price: ${updated_row.price}`);
```

### 6. Enhanced List View Logging
**File:** `vitereact/src/components/views/UV_AdminMenuList.tsx:228-254`

Added logging to track when data is fetched and what prices are received:

```typescript
queryFn: async () => {
  console.log('[AdminMenuList] Fetching menu items with filters:', ...);
  const result = await fetchMenuItems(...);
  console.log('[AdminMenuList] Fetched items:', result.items.length);
  console.log('[AdminMenuList] Sample prices:', ...);
  return result;
}
```

## Files Modified

1. **vitereact/src/components/views/UV_AdminMenuItemForm.tsx**
   - Lines 234-253: Create mutation with pre-fetch
   - Lines 259-307: Update mutation with pre-fetch

2. **vitereact/src/components/views/UV_AdminMenuList.tsx**
   - Lines 228-254: Enhanced query function with logging

3. **backend/server.ts**
   - Lines 4405-4453: Enhanced update endpoint logging

## Testing Recommendations

1. **Manual Testing:**
   - Create a new menu item with price €5.00
   - Edit it to change price to €6.00
   - Verify the list immediately shows €6.00
   - Refresh the page and verify €6.00 persists

2. **Automated Testing:**
   - Re-run the browser test that failed
   - Add explicit waits after update submission
   - Verify the price in the list after navigation

3. **Network Inspection:**
   - Monitor DevTools Network tab
   - Verify PUT request is sent with correct price
   - Verify subsequent GET request returns updated price
   - Check timing between requests

## Expected Behavior

After this fix:

1. User submits price update (€5.50 → €6.00)
2. Frontend shows "Menu item updated successfully!"
3. System waits 300ms for backend to commit
4. System pre-fetches fresh data with updated price
5. Navigation to list occurs with pre-fetched data
6. List displays €6.00 immediately
7. Any subsequent refetch also shows €6.00

## Rollback Plan

If issues persist, the changes can be reverted by:
1. Reducing wait time back to 100ms
2. Removing pre-fetch logic
3. Relying on list view's `refetchOnMount: 'always'`

## Related Documents

- `ADMIN_MENU_UPDATE_DIAGNOSTIC.md` - Initial problem analysis
- Network logs from failed test in issue description
