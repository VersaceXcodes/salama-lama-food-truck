# Registration Error Display Test Plan

## Objective
Verify that the customer registration form displays prominent visual error feedback when validation fails or duplicate data is submitted.

## Test Environment
- Frontend URL: https://123salama-lama-food-truck.launchpulse.ai
- Backend API: https://123salama-lama-food-truck.launchpulse.ai/api

## Pre-Test Setup
1. Clear browser cache and cookies
2. Open browser DevTools Console tab
3. Open browser DevTools Network tab
4. Ensure you're not already logged in

---

## Test Case 1: Duplicate Email Error Display ⭐ PRIMARY TEST

### Test Data
```
First Name: Test
Last Name: User
Email: newcustomer@test.ie (DUPLICATE - already exists)
Phone: +353871234599
Password: TestPass123!
Confirm Password: TestPass123!
Terms: Checked
```

### Steps
1. Navigate to registration page: `/signup` or click "Create Account"
2. Fill out form with test data above
3. Click "Create Account" button
4. Wait for API response (should be ~200-500ms)
5. Observe the page without interacting

### Expected Visual Results

#### ✅ Error Banner (Top of Form)
- [ ] Large red error banner appears above form fields
- [ ] Banner has **thick 4px red border** (clearly visible)
- [ ] Banner has red background (red-50)
- [ ] Banner has shadow for depth
- [ ] Banner **shakes/animates** when it first appears (0.5s animation)
- [ ] Banner contains bold "Registration Failed" heading
- [ ] Banner shows message: "Email already registered"
- [ ] Banner includes link: "Sign in here" that goes to `/login`

#### ✅ Email Field Visual Feedback
- [ ] Email input field has **thick 2px red border** (darker red than banner)
- [ ] Email input field has light red background (red-50)
- [ ] Border is clearly thicker than normal input fields
- [ ] Below email field, error message appears with:
  - [ ] Red X icon on the left
  - [ ] Bold red text
  - [ ] Message: "This email address is already registered. Please use a different email or try logging in."

#### ✅ Console Output
- [ ] Console shows: "Registration error: [Error object]"
- [ ] Console shows: "Error response: {success: false, message: '...', error_code: 'EMAIL_ALREADY_EXISTS', ...}"

#### ✅ Network Tab
- [ ] POST request to `/api/auth/register` with status **409**
- [ ] Response body contains:
  ```json
  {
    "success": false,
    "message": "Email already registered",
    "error_code": "EMAIL_ALREADY_EXISTS",
    "details": { "field": "email" }
  }
  ```

### Expected Behavior
- [ ] Form remains filled (data not cleared)
- [ ] Loading spinner disappears
- [ ] Submit button becomes clickable again
- [ ] User can scroll to see error banner if needed
- [ ] Clicking "Sign in here" link navigates to `/login`

### FAIL Criteria
❌ Test FAILS if ANY of these occur:
- Error banner is not visible or too subtle
- Error banner doesn't animate/shake
- Email field doesn't have red border or background
- Error message is missing or too small
- No console logs appear
- User is left confused about what went wrong

---

## Test Case 2: Duplicate Phone Number Error

### Test Data
```
First Name: Test
Last Name: User
Email: uniqueemail12345@test.ie (UNIQUE)
Phone: +353871234567 (DUPLICATE - already exists)
Password: TestPass123!
Confirm Password: TestPass123!
Terms: Checked
```

### Steps
Same as Test Case 1, but with unique email and duplicate phone

### Expected Visual Results
- [ ] Same error banner appearance as Test Case 1
- [ ] **Phone field** (not email) has red border and background
- [ ] Error message below phone field:
  - [ ] Red X icon
  - [ ] Message: "This phone number is already registered. Please use a different phone number or try logging in."

### Expected Console/Network
- [ ] Console logs show error details
- [ ] Network shows 409 with `error_code: "PHONE_ALREADY_EXISTS"`

---

## Test Case 3: Client-Side Validation Errors

### Test Data - Invalid Email Format
```
Email: notanemail
(all other fields valid)
```

### Expected Results
- [ ] Email field shows red border when you tab/blur away from field
- [ ] Error message: "Please enter a valid email address"
- [ ] Submit button attempts submission and shows field error
- [ ] NO banner error (this is client-side validation)

### Test Data - Password Too Short
```
Password: Test1
(all other fields valid)
```

### Expected Results
- [ ] Password strength indicator shows "Weak" in red
- [ ] Field error appears: "Password must be at least 8 characters"
- [ ] Password strength bar is red and very short

### Test Data - Passwords Don't Match
```
Password: TestPass123!
Confirm Password: TestPass456!
```

### Expected Results
- [ ] Confirm password field shows red border
- [ ] Error message: "Passwords do not match"

---

## Test Case 4: Successful Registration (Positive Test)

### Test Data
```
First Name: New
Last Name: Customer
Email: newuser_[TIMESTAMP]@test.ie
Phone: +353871234[RANDOM 3 DIGITS]
Password: TestPass123!
Confirm Password: TestPass123!
Marketing: Unchecked
Terms: Checked
```

### Expected Results
- [ ] NO error banner appears
- [ ] NO field errors appear
- [ ] Loading spinner appears briefly
- [ ] Success modal appears with:
  - [ ] Welcome message
  - [ ] Discount code displayed
  - [ ] "Start Ordering" button
- [ ] User is authenticated after clicking "Start Ordering"

---

## Test Case 5: Network Error Handling

### Simulate Network Error
1. Open DevTools → Network tab
2. Change throttling to "Offline"
3. Attempt to register with valid data
4. Wait for timeout

### Expected Results
- [ ] Error banner appears after timeout
- [ ] Message indicates network/connection issue
- [ ] User can retry when back online

---

## Browser Compatibility Checklist

Test all cases above in:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Chrome Mobile (iOS)
- [ ] Safari Mobile (iOS)
- [ ] Chrome Mobile (Android)

---

## Accessibility Checklist

### Keyboard Navigation
- [ ] Can tab through all form fields
- [ ] Error banner is announced by screen reader
- [ ] Can activate "Sign in here" link with Enter key

### Screen Reader Testing
- [ ] Error banner has `role="alert"` attribute
- [ ] Error messages are announced when they appear
- [ ] Field labels are properly associated

### Visual Accessibility
- [ ] Error colors have sufficient contrast (WCAG AA minimum)
- [ ] Text is readable at 200% zoom
- [ ] Errors visible in high contrast mode

---

## Performance Checklist

- [ ] Error banner appears within 100ms of API response
- [ ] Shake animation is smooth (60fps)
- [ ] Page remains responsive during error display
- [ ] No memory leaks when errors appear/disappear multiple times

---

## Mobile Responsiveness

Test on mobile devices (viewport < 640px):
- [ ] Error banner is fully visible without horizontal scroll
- [ ] Error text wraps appropriately
- [ ] Touch targets are large enough (44x44px minimum)
- [ ] Shake animation works on mobile
- [ ] No layout shifts when error appears

---

## Regression Tests

Verify these still work after changes:
- [ ] Successful registration flow
- [ ] Success modal displays correctly
- [ ] Discount code can be copied
- [ ] Referral code parameter (`?ref=XXXXX`) still works
- [ ] Redirect URL parameter (`?redirect_url=/menu`) still works
- [ ] Marketing opt-in checkbox works
- [ ] Password show/hide toggle works
- [ ] Password strength indicator updates in real-time

---

## Sign-Off

### Test Execution
- Tester Name: _________________
- Date: _________________
- Browser Used: _________________
- Test Result: ✅ PASS / ❌ FAIL

### Issues Found
1. ___________________________________
2. ___________________________________
3. ___________________________________

### Screenshots
- Attach screenshots of error states for documentation

### Notes
_____________________________________
_____________________________________
_____________________________________

---

## Quick Visual Checklist (Print This)

When testing, look for these **visual indicators** on duplicate email submission:

```
┌─────────────────────────────────────────────────┐
│  ⚠️  Registration Failed                       │
│                                                 │
│  Email already registered                       │
│  Already have an account? Sign in here          │
└─────────────────────────────────────────────────┘
      ↑ RED BANNER WITH THICK BORDER & SHAKE

Email Address *
┌─────────────────────────────────────────────────┐
│ newcustomer@test.ie                             │
└─────────────────────────────────────────────────┘
      ↑ THICK RED BORDER + RED BACKGROUND

❌ This email address is already registered.
   Please use a different email or try logging in.
      ↑ BOLD RED TEXT WITH X ICON
```

✅ If you see ALL of these visual elements clearly, the fix is working!
❌ If ANY element is missing or too subtle, the fix needs more work.
