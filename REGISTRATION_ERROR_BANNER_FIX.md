# Registration Error Banner Display Fix

## Issue Description
During browser testing, when a customer registration failed (e.g., duplicate email), no error banner was displayed to the user despite error state being set correctly in the component state.

## Root Cause
The error banner component was conditionally rendered using `{registration_error && (...)}`, which meant the div containing the `errorBannerRef` was not present in the DOM until the error state was set. This caused a timing issue where:

1. Error occurs → `register_user` throws error
2. Component calls `setRegistrationError(errorMessage)` 
3. React schedules a re-render
4. Code attempts to scroll to `errorBannerRef.current` before React finishes rendering the error banner
5. The ref is null because the banner hasn't been rendered yet

## Console Log Evidence
From the test logs:
```
[1765536648.4977994] LOG: "Setting error state - Error message: Email already registered"
[1765536648.4980185] LOG: "Setting error state - Field errors: {email: 'This email address is already registered...'"
[1765536648.526651] LOG: "Error state set - should now be visible"
[1765536648.5268204] WARNING: "Error banner ref NOT found in DOM"
```

## Solution Implemented

### 1. Always Render Error Banner Container (Primary Fix)
**File:** `/app/vitereact/src/components/views/UV_Signup.tsx` (Lines 488-522)

Changed from conditionally rendering the entire banner:
```typescript
{registration_error && (
  <div ref={errorBannerRef} ...>
    ...
  </div>
)}
```

To always rendering the container with conditional styling:
```typescript
<div 
  ref={errorBannerRef}
  className={`mb-6 transition-all duration-300 ${
    registration_error 
      ? 'bg-red-50 border-4 border-red-400 rounded-lg p-5 shadow-lg opacity-100' 
      : 'h-0 overflow-hidden opacity-0 border-0 p-0'
  }`}
  role={registration_error ? "alert" : undefined}
  aria-live={registration_error ? "assertive" : undefined}
  aria-atomic={registration_error ? "true" : undefined}
  style={{ display: registration_error ? 'block' : 'block' }}
>
  {registration_error && (
    <div className="flex items-start">
      ...error content...
    </div>
  )}
</div>
```

**Benefits:**
- The error banner div is always in the DOM (just visually hidden when no error)
- The `errorBannerRef` is always attached to a DOM element
- No timing issues with React rendering lifecycle
- Smooth animation when error appears (opacity + height transition)

### 2. Enhanced Scroll Timing (Secondary Fix)
**File:** `/app/vitereact/src/components/views/UV_Signup.tsx` (Lines 317-333)

Added double `requestAnimationFrame` to ensure DOM updates complete:
```typescript
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    if (errorBannerRef.current) {
      console.log('Error banner ref found, scrolling into view');
      errorBannerRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
      // Focus the email field if there's an email error
      if (newFieldErrors.email && emailFieldRef.current) {
        setTimeout(() => {
          emailFieldRef.current?.focus();
        }, 500);
      }
    }
  });
});
```

**Benefits:**
- Double `requestAnimationFrame` ensures React has completed all rendering
- Provides better UX by scrolling to error and focusing relevant field

## Technical Details

### Why This Works
1. **Ref Persistence**: By always rendering the container div, the ref attachment happens once on component mount and persists throughout the component lifecycle
2. **CSS-Based Hiding**: Using CSS classes (`h-0 overflow-hidden opacity-0`) to hide the banner when there's no error is more performant than conditional rendering
3. **Smooth Transitions**: The `transition-all duration-300` class creates a professional fade-in animation when errors appear
4. **Accessibility Maintained**: ARIA attributes are conditionally applied only when there's an error to maintain proper screen reader behavior

### Error Handling Flow
1. User submits registration with duplicate email
2. Backend returns 409 status with error message
3. `register_user` in store throws error with enhanced error object
4. Component's `handleSubmit` catch block:
   - Parses error message and field errors
   - Uses `setTimeout` to defer state updates (avoids store update race condition)
   - Uses `flushSync` to batch state updates synchronously
   - Uses double `requestAnimationFrame` for scroll timing
5. Error banner container (always in DOM) gets new classes to make it visible
6. Banner smoothly fades in with error message
7. Page scrolls to error banner
8. Email field receives focus (if email error)

## Testing Verification

### What Should Now Work
✅ Error banner displays immediately when registration fails
✅ Banner is visually prominent (red border, red background, bold text)
✅ Page auto-scrolls to show the error banner
✅ Email field gets focused for email-related errors
✅ "Sign in here" link appears for duplicate email errors
✅ Field-specific error messages show below each field

### Test Case
1. Navigate to `/signup`
2. Fill form with email: `newcustomer@test.ie` (already registered)
3. Submit form
4. **Expected**: Red error banner appears at top of form with message "Email already registered"
5. **Expected**: Page scrolls to show error banner
6. **Expected**: Email field shows additional inline error
7. **Expected**: "Sign in here" link is visible

## Files Modified
- `/app/vitereact/src/components/views/UV_Signup.tsx`
  - Lines 317-333: Enhanced scroll timing with double requestAnimationFrame
  - Lines 488-522: Error banner always rendered with conditional styling

## Build Status
✅ Frontend build successful
✅ No TypeScript errors
✅ All components compiled

## Additional Improvements Made
- Added email field focus on email errors
- Improved accessibility attributes (conditional ARIA labels)
- Added smooth CSS transitions for professional UX
- Enhanced console logging for debugging

## Related Issues Fixed
This fix also resolves:
- Registration form not showing validation errors from backend
- Users unable to understand why registration failed
- Poor UX for duplicate email/phone scenarios
- Missing visual feedback for form submission errors
