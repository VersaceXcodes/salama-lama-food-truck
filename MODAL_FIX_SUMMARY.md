# Modal Backdrop Click Fix - Summary

## Problem
Browser test UI-007 failed: "Clicking backdrop (index 0) did not close modal"

## Root Cause
The modal had nested divs where:
- **Outer div (index 0)**: No click handler ❌
- **Inner backdrop div (index 1)**: Had click handler ✓

When tests clicked "index 0", nothing happened because the handler was on index 1.

## Solution
Merged the outer container and backdrop into one element:
- **Single div (index 0)**: Now has click handler ✓
- Simplified from 3-layer to 2-layer structure
- Click handler now directly on the first element

## Code Change
File: `vitereact/src/components/views/UV_Menu.tsx` (lines 979-982)

```tsx
// BEFORE: Two separate divs
<div className="fixed inset-0 z-50 overflow-y-auto">
  <div className="fixed inset-0 bg-black bg-opacity-50" onClick={close}></div>
  ...
</div>

// AFTER: One merged div
<div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50" onClick={close}>
  ...
</div>
```

## Status
✅ Build successful
✅ DOM structure simplified
✅ Click handler on correct element
✅ All existing functionality preserved (ESC key, X button, stopPropagation)

## Test Expectations
All modal close methods should now work:
1. Clicking backdrop ✅
2. Pressing ESC key ✅
3. Clicking X button ✅
