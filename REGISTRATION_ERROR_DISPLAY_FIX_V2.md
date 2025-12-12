# Registration Error Display Fix V2

## Problem
During browser testing, when a user attempted to register with a duplicate email (or other error condition), the expected error banner was not displayed. The API correctly returned a 409 status with error details, and the error was being caught and logged in the console, but the error banner component was not rendering in the DOM.

### Symptoms
- POST to `/api/auth/register` returned 409 with proper error response
- Console logs showed: "Registration error: Error: Email already registered"
- Console logs showed: "Error response: {success: false, message: 'Email already registered'...}"
- Form fields appeared to clear (suggesting a re-render)
- Error banner with red border and error message did NOT display

## Root Cause Analysis
The issue was a **race condition between the Zustand store's state updates and the component's local state updates**:

1. When `register_user()` throws an error, the Zustand store immediately updates its authentication state:
   ```typescript
   set(() => ({
     authentication_state: {
       ...
       is_authenticated: false,
       is_loading: false,
       error_message: errorMessage,
     },
   }));
   ```

2. This store update triggers a re-render of any component subscribed to the store (including UV_Signup via the `isAuthenticated` selector)

3. Meanwhile, the component's catch block tries to update local state (`setRegistrationError`, `setFormValidationErrors`)

4. The problem: When using `flushSync()` directly in the catch block, the synchronous state update can conflict with the asynchronous store update, potentially causing the local state update to be lost or batched incorrectly

## Solution
Wrapped the error state updates in `setTimeout(..., 0)` to push them to the next event loop tick, ensuring they execute AFTER the store's state updates complete:

```typescript
setTimeout(() => {
  flushSync(() => {
    setSubmissionLoading(false);
    setRegistrationError(errorMessage);
    setFormValidationErrors(newFieldErrors);
  });
  
  // Scroll to error banner
  requestAnimationFrame(() => {
    if (errorBannerRef.current) {
      errorBannerRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }
  });
}, 0);
```

### Why This Works
- `setTimeout(..., 0)` ensures error state updates happen after the store update completes
- `flushSync()` then ensures the error state updates are synchronous and immediate
- `requestAnimationFrame()` ensures the scroll happens after the DOM updates
- This eliminates the race condition between store and component state

## Changes Made
**File: `/app/vitereact/src/components/views/UV_Signup.tsx`**
- Modified error handling in `handleSubmit()` catch block (lines ~272-307)
- Wrapped error state updates in `setTimeout(..., 0)`
- Kept `flushSync()` for synchronous updates within the timeout
- Added debug logging to help diagnose any future issues
- Moved scroll logic to `requestAnimationFrame()` for better timing

## Testing
To verify the fix:
1. Navigate to `/signup` page
2. Enter a duplicate email address (e.g., `newcustomer@test.ie`)
3. Fill in all required fields
4. Submit the form
5. Verify the prominent red error banner appears with message "Email already registered"
6. Verify the email field shows a red border and field-specific error message
7. Verify the banner scrolls into view automatically

## Additional Debug Logging
Added console logs to help diagnose any future issues:
- "Setting error state - Error message: [message]"
- "Setting error state - Field errors: [errors]"
- "Error state set - should now be visible"
- "Error banner ref found, scrolling into view" OR "Error banner ref NOT found in DOM"

These can be removed once the fix is confirmed working in production.

## Files Modified
- `/app/vitereact/src/components/views/UV_Signup.tsx`

## Build Status
✅ Build successful - no errors or warnings related to these changes
