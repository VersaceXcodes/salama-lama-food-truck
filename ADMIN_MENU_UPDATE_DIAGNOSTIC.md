# Admin Menu Item Update Issue - Diagnostic Report

## Problem Summary
Test created item "Test Smoothie" with price €5.50, attempted to edit it to €6.00, but after returning to the list, the price still showed €5.50.

## Root Cause Analysis

### Findings from Network Logs:

1. **Item Created Successfully:**
   - POST `/api/admin/menu/items` returned `item_id: "item_AZYVDddJcw7D-vRBa1sI"`
   - Price: 5.5

2. **No Update Request Found:**
   - No PUT request to `/api/admin/menu/items/{id}` in network logs
   - This means the update form was never submitted

3. **Wrong Item ID Requested:**
   - GET `/api/admin/menu/items/item_018` - returned HTML (404)
   - Test tried to edit `item_018` instead of `item_AZYVDddJcw7D-vRBa1sI`

4. **Stale Data Issue:**
   - After navigating back, the list still showed old price
   - React Query cache wasn't properly invalidated

## Issues Identified

### Issue 1: React Query Cache Not Clearing on Update
**Location:** `vitereact/src/components/views/UV_AdminMenuItemForm.tsx:259-278`

The update mutation clears cache but navigation happens too quickly, before the backend completes the update.

### Issue 2: List View May Use Stale Cache
**Location:** `vitereact/src/components/views/UV_AdminMenuList.tsx:249-254`

While `staleTime: 0` and `refetchOnMount: 'always'` are set, there's a race condition with the navigation.

### Issue 3: Backend Returns Item but Frontend May Not Process It
**Location:** `backend/server.ts:4434-4450`

Backend correctly returns updated item with coerced numbers, but timing issue on frontend.

## Solution

Add explicit refetch + delay to ensure:
1. Backend completes the update transaction
2. Cache is fully cleared
3. Navigation happens after data is stable
4. List view fetches completely fresh data
