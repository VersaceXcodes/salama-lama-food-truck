# Cart Loading Fix - December 12, 2025

## Issue Summary
Browser testing revealed that the cart page was consistently failing to load with "Failed to Load Cart" error message. The issue was preventing users from completing the checkout flow.

## Root Cause Analysis

### Primary Issue: Performance Bottleneck with Large Carts
1. **Test user cart accumulation**: The test user (user_003) had accumulated 49 items in their cart from repeated browser tests
2. **N+1 Query Problem**: The `compute_cart_totals` function was executing a separate database query for customization options for EACH cart item
3. **Performance degradation**: With 49 items, this meant 49+ database queries, causing significant slowdown or timeout

### Contributing Factors
1. **Lack of error logging**: The cart endpoint had minimal error logging, making debugging difficult
2. **No cart size limits**: Nothing prevented carts from growing indefinitely
3. **File system errors not caught**: Cart file read/write operations could fail silently

## Changes Made

### 1. Backend Performance Optimization (server.ts:986-1053)
**Problem**: N+1 database query pattern in `compute_cart_totals`
**Solution**: Batch query all customization options at once

**Before**:
```typescript
// Inside the loop - queries for EACH cart item
for (const cart_item of cart.items) {
  // ... other code ...
  if (option_ids.length > 0) {
    const options_res = await pool.query(
      `SELECT co.option_id, co.additional_price
       FROM customization_options co
       WHERE co.option_id = ANY($1)`,
      [option_ids]
    );
    // Process results
  }
}
```

**After**:
```typescript
// Collect ALL option IDs first
const all_option_ids = [];
for (const cart_item of cart.items) {
  // Collect option IDs from all items
}

// Single batch query for ALL customization options
const options_map = new Map();
if (all_option_ids.length > 0) {
  const unique_option_ids = [...new Set(all_option_ids)];
  const options_res = await pool.query(
    `SELECT co.option_id, co.additional_price
     FROM customization_options co
     WHERE co.option_id = ANY($1)`,
    [unique_option_ids]
  );
  for (const o of options_res.rows) {
    options_map.set(o.option_id, Number(o.additional_price ?? 0));
  }
}

// Then process each item using the pre-fetched map
for (const cart_item of cart.items) {
  // Use options_map.get(option_id) instead of querying
}
```

**Impact**: Reduced database queries from O(n) to O(1) where n = number of cart items

### 2. Enhanced Error Logging (server.ts:2072-2095)
**Added comprehensive logging to cart GET endpoint**:
- Log user ID and cart request initiation
- Log number of items loaded from cart file
- Log computed totals (subtotal, total, item count)
- Log detailed error information with user context

**Example**:
```typescript
console.log(`[CART GET] User ${req.user.user_id} requesting cart`);
console.log(`[CART GET] Cart loaded with ${cart.items.length} items`);
console.log(`[CART GET] Totals computed: subtotal=${totals.subtotal}, total=${totals.total}, items=${totals.items.length}`);
console.error(`[CART GET ERROR] User ${req.user?.user_id}:`, error);
```

### 3. Robust File System Error Handling (server.ts:545-571)
**Enhanced `read_cart_sync` function**:
- Added try-catch wrapper around entire function
- Added detailed logging at each step
- Graceful fallback to empty cart on any error
- Better handling of missing or corrupt cart files

**Enhanced `write_cart_sync` function**:
- Added error logging for write failures
- Propagates errors properly for handling upstream

### 4. Cart Size Limit (server.ts:2223-2227)
**Added maximum cart items limit**:
```typescript
// Prevent cart from becoming too large (max 50 unique items)
if (cart.items.length >= 50) {
  return res.status(400).json(createErrorResponse(
    'Cart is full. Please remove some items before adding more.', 
    null, 
    'CART_FULL', 
    req.request_id
  ));
}
```

**Rationale**: 
- Prevents performance degradation with extremely large carts
- 50 items is a reasonable maximum for a food ordering cart
- Provides clear error message to users

### 5. Test Data Cleanup
**Cleared accumulated test data**:
- Reset user_003 cart to empty state
- Prevents immediate recurrence of the issue

```json
{
  "items": [],
  "discount_code": null,
  "updated_at": "2025-12-12T22:30:00.000Z"
}
```

## Testing Recommendations

### 1. Performance Testing
- Test cart loading with 1, 10, 25, and 50 items
- Measure response times for cart GET endpoint
- Verify no N+1 query patterns in logs

### 2. Error Handling Testing
- Test with corrupted cart file
- Test with missing cart file
- Test with cart at size limit (50 items)
- Verify all errors are logged properly

### 3. Load Testing
- Simulate multiple concurrent cart operations
- Verify database connection pool handles load
- Monitor for timeout errors

### 4. Browser Testing
- Complete full checkout flow from menu → cart → checkout
- Test with authenticated and guest users
- Verify cart persists correctly across page refreshes

## Monitoring

### Key Metrics to Watch
1. **Cart endpoint response time**: Should be < 500ms even with full carts
2. **Database query count per cart load**: Should be exactly 2 queries (menu items + customization options)
3. **Cart error rate**: Monitor for "CART_FULL", "CART_READ ERROR", "CART_WRITE ERROR"
4. **Average cart size**: Alert if approaching 50 items frequently

### Log Patterns to Monitor
- `[CART GET]` - Normal cart operations
- `[CART GET ERROR]` - Cart loading failures
- `[CART READ ERROR]` - File system read failures
- `[CART WRITE ERROR]` - File system write failures

## Files Modified
- `/app/backend/server.ts`
  - Lines 545-571: Enhanced `read_cart_sync` with error handling
  - Lines 575-586: Enhanced `write_cart_sync` with error handling  
  - Lines 986-1053: Optimized `compute_cart_totals` batch queries
  - Lines 2072-2095: Enhanced cart GET endpoint logging
  - Lines 2223-2227: Added cart size limit

## Build Status
✅ Backend built successfully with all changes
✅ TypeScript compilation passed without errors

## Next Steps
1. Deploy backend changes to production
2. Monitor cart error logs for 24-48 hours
3. Run browser tests to verify fix
4. Consider adding cart item consolidation (merge duplicate items with same customizations)
5. Consider adding cache layer for frequently accessed menu items

## Additional Improvements to Consider

### Short Term
- Add cart item deduplication when adding items
- Add warning when cart approaches size limit (e.g., 45 items)
- Add cart analytics to track average cart size and items

### Long Term
- Consider moving cart storage to database instead of file system
- Add Redis cache for menu items and customization options
- Implement cart expiration (e.g., clear carts older than 30 days)
- Add pagination for very large carts in UI
