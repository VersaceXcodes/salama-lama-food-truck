# Modal Backdrop Click Fix

## Issue
The customization modal in the Menu page did not close when clicking on the backdrop. The test "Modal and Dialog Interactions" failed specifically on the "Verify clicking backdrop closes modal" step.

## Root Cause
The modal implementation had the backdrop click handler attached to the outer container div that also contained the modal content. This caused issues with event propagation and made it difficult for the browser test to properly identify and click the backdrop element.

**Previous Implementation:**
```tsx
<div 
  className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 transition-opacity"
  onClick={handleCloseCustomizationModal}
>
  <div className="flex min-h-full items-center justify-center p-4">
    <div 
      className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
    >
```

In this structure, the backdrop and modal container were nested in a way that made it ambiguous which element was the actual backdrop.

## Solution
Separated the backdrop into its own dedicated element that sits at the same level as the modal container. This creates a clearer DOM structure where:

1. The backdrop is a fixed, full-screen overlay that can be directly clicked
2. The modal content is positioned above the backdrop with proper z-index layering
3. Event propagation is properly controlled

**Fixed Implementation:**
```tsx
<div 
  className="fixed inset-0 z-50 overflow-y-auto"
>
  {/* Backdrop */}
  <div 
    className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
    onClick={handleCloseCustomizationModal}
    aria-hidden="true"
  />
  
  {/* Modal Container */}
  <div className="flex min-h-full items-center justify-center p-4">
    <div 
      className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto z-10"
      onClick={(e) => e.stopPropagation()}
    >
```

## Changes Made
- **File:** `/app/vitereact/src/components/views/UV_Menu.tsx`
- **Lines:** 978-994

### Key Improvements:
1. **Separated Backdrop Element:** Created a dedicated backdrop `div` that's a direct sibling to the modal container
2. **Clear Click Target:** The backdrop now has its own element that can be easily identified and clicked
3. **Proper Z-Index:** Added `z-10` to the modal content to ensure it renders above the backdrop
4. **Accessibility:** Added `aria-hidden="true"` to the backdrop element
5. **Better Event Handling:** Maintained `stopPropagation` on the modal content to prevent backdrop clicks from closing when clicking inside the modal

## Testing
The fix addresses the following test requirements:
- ✅ Backdrop click closes modal
- ✅ ESC key closes modal (already working)
- ✅ Close button closes modal (already working)
- ✅ Focus trapping works (already working)
- ✅ Modal content prevents event propagation

## Related Files
The mobile filter panel in the same file (lines 913-975) already uses a similar pattern and serves as a good reference implementation.

## Browser Test Compatibility
This pattern is widely used in production modal libraries (Radix UI, Headless UI) and is designed to work reliably with automated browser testing tools like Playwright, Selenium, and Cypress.

