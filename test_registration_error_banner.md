# Test Plan: Registration Error Banner Display

## Issue Fixed
**Problem**: When customer registration failed (e.g., duplicate email), no error banner was displayed to the user.
**Solution**: Error banner container is now always rendered (hidden when no error) to ensure ref attachment.

## Pre-Test Setup
1. Ensure a test user already exists with email: `newcustomer@test.ie`
2. Frontend built with latest changes (completed)
3. Backend running and database accessible

## Test Case 1: Duplicate Email Registration Error

### Steps:
1. Navigate to: `https://123salama-lama-food-truck.launchpulse.ai/signup`
2. Fill in the registration form:
   - First Name: `New`
   - Last Name: `Customer`
   - Email: `newcustomer@test.ie` (already registered)
   - Phone: `+353871234588`
   - Password: `TestPass123!`
   - Confirm Password: `TestPass123!`
   - Check "I agree to the Terms & Conditions"
3. Click "Create Account"

### Expected Results:
✅ **Error Banner Displays**: A prominent red error banner should appear at the top of the form
✅ **Error Message**: Banner shows "Registration Failed" heading with message "Email already registered"
✅ **Auto-Scroll**: Page automatically scrolls to show the error banner
✅ **Email Field Highlight**: Email field should have red border and background
✅ **Inline Email Error**: Below email field shows: "This email address is already registered. Please use a different email or try logging in."
✅ **Sign In Link**: Error banner includes "Already have an account? Sign in here" link
✅ **Form Preserved**: Form data (except password) remains filled
✅ **Button Re-enabled**: Submit button is clickable again
✅ **No Console Warnings**: Should NOT see "Error banner ref NOT found in DOM" in console

### API Verification:
- Network request to `/api/auth/register` returns status `409 Conflict`
- Response body contains:
  ```json
  {
    "success": false,
    "message": "Email already registered",
    "error_code": "EMAIL_ALREADY_EXISTS",
    "details": {
      "field": "email"
    }
  }
  ```

## Test Case 2: Duplicate Phone Registration Error

### Steps:
1. Navigate to: `/signup`
2. Fill form with:
   - Email: `uniqueemail@test.ie` (new)
   - Phone: `+353871234567` (already registered)
   - Other fields: valid data
3. Submit form

### Expected Results:
✅ Error banner displays
✅ Message shows "Phone already registered"
✅ Phone field highlighted in red
✅ Inline phone error appears

## Test Case 3: Successful Registration (No Error)

### Steps:
1. Navigate to: `/signup`
2. Fill form with all unique data
3. Submit form

### Expected Results:
✅ Success modal appears with welcome message
✅ First-order discount code displayed
✅ NO error banner visible
✅ Redirects to menu/dashboard after modal close

## Test Case 4: Client-Side Validation Errors

### Steps:
1. Navigate to: `/signup`
2. Fill invalid data:
   - Email: `notanemail`
   - Password: `123` (too short)
3. Try to submit

### Expected Results:
✅ Inline validation errors appear
✅ Form does not submit
✅ No error banner (client-side validation only)

## Console Log Verification

### During Error Scenario, Console Should Show:
```
✅ "Setting error state - Error message: Email already registered"
✅ "Setting error state - Field errors: {email: '...'}"
✅ "Error state set - should now be visible"
✅ "Error banner ref found, scrolling into view"
```

### Console Should NOT Show:
❌ "Error banner ref NOT found in DOM"

## Visual Verification Checklist

### Error Banner Appearance:
- [ ] Red background (`bg-red-50`)
- [ ] Thick red border (`border-4 border-red-400`)
- [ ] Drop shadow visible
- [ ] Red X icon on left
- [ ] Bold "Registration Failed" heading
- [ ] Error message clearly readable
- [ ] "Sign in here" link (for email/phone duplicates)
- [ ] Smooth fade-in animation

### Email Field on Error:
- [ ] Red border (`border-red-600`)
- [ ] Light red background (`bg-red-50`)
- [ ] Red focus ring visible when focused
- [ ] Field receives focus automatically

### Email Inline Error:
- [ ] Red background box below email field
- [ ] Red left border (4px)
- [ ] Red X icon
- [ ] Error text in bold red

## Accessibility Testing

### Screen Reader:
- [ ] Error banner has `role="alert"`
- [ ] Error banner has `aria-live="assertive"`
- [ ] Error banner has `aria-atomic="true"`
- [ ] Email field has `aria-invalid="true"` on error
- [ ] Email field has `aria-describedby` linking to error message

### Keyboard Navigation:
- [ ] Can navigate to "Sign in here" link with Tab
- [ ] Can submit form with Enter
- [ ] Focus visible on all interactive elements

## Browser Compatibility
Test in:
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

## Performance Verification
- [ ] Error banner appears within 500ms of API response
- [ ] No layout shift during error display
- [ ] Smooth scroll animation (not jarring)
- [ ] No memory leaks (check DevTools Memory tab)

## Edge Cases to Test

### 1. Multiple Rapid Submissions:
- Submit form multiple times quickly
- Each error should display correctly
- No duplicate error banners

### 2. Network Timeout:
- Simulate slow/failing network
- Error handling works for timeout errors

### 3. Malformed API Response:
- API returns unexpected format
- Generic error message displays

### 4. Form Data Clearing:
- After error appears, start typing in email field
- Error banner should clear
- Field errors should clear

## Regression Testing

### Ensure These Still Work:
- [ ] Password strength indicator
- [ ] Password show/hide toggle
- [ ] Marketing opt-in checkbox
- [ ] Terms acceptance checkbox
- [ ] Referral code query parameter (`?ref=CODE`)
- [ ] Redirect after success (`?redirect_url=/cart`)

## Security Verification
- [ ] Password not visible in console logs
- [ ] Password not included in error responses
- [ ] Error messages don't leak sensitive info
- [ ] Rate limiting prevents brute force

## Documentation Updates
- [x] Fix documented in `REGISTRATION_ERROR_BANNER_FIX.md`
- [x] Console log evidence included
- [x] Technical explanation provided
- [x] Code changes documented

## Sign-Off

### Developer Testing:
- Date: _______________
- Tested By: _______________
- Status: _______________
- Notes: _______________

### QA Testing:
- Date: _______________
- Tested By: _______________
- Status: _______________
- Notes: _______________

### Product Owner Approval:
- Date: _______________
- Approved By: _______________
- Status: _______________
- Notes: _______________
