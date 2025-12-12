# Browser Testing Guide - Registration Flow

## Pre-Test Checklist

Before running browser tests for the registration flow, **always** run the cleanup script:

```bash
cd /app/backend
npm run cleanup-test-data
```

This ensures the test user `newcustomer@test.ie` doesn't already exist in the database.

---

## Test Scenario: Successful Registration

### Expected Flow:

1. **Navigate to** `/signup`
2. **Fill form:**
   - First Name: New
   - Last Name: Customer
   - Email: newcustomer@test.ie
   - Phone: +353871234588
   - Password: TestPass123!
   - Confirm Password: TestPass123!
   - ☑️ Accept Terms & Conditions

3. **Submit form**

4. **Expected Result:**
   - ✅ HTTP 201 Created
   - ✅ Success modal appears
   - ✅ First-order discount code displayed (format: `FIRST10-XXXXXX`)
   - ✅ JWT token stored
   - ✅ User authenticated
   - ✅ "Start Ordering" button visible

5. **Click "Start Ordering"**

6. **Expected Result:**
   - ✅ Redirect to `/menu` (or URL from redirect_url parameter)
   - ✅ User sees their name in header
   - ✅ Loyalty points visible (0 points for new user)

---

## Test Scenario: Duplicate Email

### Prerequisites:
- Test user `newcustomer@test.ie` **already exists** (DO NOT run cleanup)

### Expected Flow:

1. **Navigate to** `/signup`
2. **Fill form with existing email:** `newcustomer@test.ie`
3. **Submit form**

4. **Expected Result:**
   - ✅ HTTP 409 Conflict
   - ✅ Error banner displayed at top of form
   - ✅ Error message: "Email already registered"
   - ✅ Email field highlighted in red
   - ✅ "Sign in here" link visible
   - ✅ No redirect occurs
   - ✅ Stays on `/signup` page

5. **User can click "Sign in here"**

6. **Expected Result:**
   - ✅ Redirect to `/login` page

---

## Test Scenario: Invalid Data

### Test Case 1: Weak Password

**Input:** Password with only letters (e.g., "password")

**Expected:**
- ✅ Client-side validation error
- ✅ "Password must contain at least one number"
- ✅ Password strength indicator shows "Weak" (red)
- ✅ No API call made

### Test Case 2: Mismatched Passwords

**Input:**
- Password: TestPass123!
- Confirm: TestPass456!

**Expected:**
- ✅ "Passwords do not match" error
- ✅ Confirm password field highlighted
- ✅ No API call made

### Test Case 3: Invalid Email Format

**Input:** Email: `notanemail`

**Expected:**
- ✅ "Please enter a valid email address"
- ✅ Email field highlighted
- ✅ No API call made

### Test Case 4: Missing Terms Acceptance

**Expected:**
- ✅ "You must accept the Terms & Conditions"
- ✅ Submit button disabled or validation error shown

---

## Cleanup Commands Reference

### Clean Default Test User
```bash
cd /app/backend
npm run cleanup-test-data
```

### Clean Specific User
```bash
cd /app/backend
node cleanup-test-data.js "email@example.com"
```

### Using SQL Directly
```bash
psql $DATABASE_URL -f /app/cleanup_test_user.sql
```

### Verify User Is Cleaned
```bash
psql $DATABASE_URL -c "SELECT email FROM users WHERE email = 'newcustomer@test.ie';"
```

---

## API Endpoint Reference

### POST /api/auth/register

**Request:**
```json
{
  "email": "newcustomer@test.ie",
  "phone": "+353871234588",
  "password": "TestPass123!",
  "first_name": "New",
  "last_name": "Customer",
  "marketing_opt_in": false
}
```

**Success Response (201):**
```json
{
  "success": true,
  "user": {
    "user_id": "user_XXXXXXXXXXXX",
    "email": "newcustomer@test.ie",
    "first_name": "New",
    "last_name": "Customer",
    "role": "customer",
    "email_verified": false,
    "referral_code": "NEWCUS1234"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "first_order_discount_code": "FIRST10-USER_X"
}
```

**Error Response - Duplicate Email (409):**
```json
{
  "success": false,
  "message": "Email already registered",
  "error_code": "EMAIL_ALREADY_EXISTS",
  "timestamp": "2025-12-12T11:40:59.762Z",
  "request_id": "req_XXXXXXXXXXXX",
  "details": {
    "field": "email"
  }
}
```

**Error Response - Validation Error (400):**
```json
{
  "success": false,
  "message": "Validation failed",
  "error_code": "VALIDATION_ERROR",
  "timestamp": "2025-12-12T11:40:59.762Z",
  "request_id": "req_XXXXXXXXXXXX",
  "details": {
    "issues": [...]
  }
}
```

---

## UI Element Selectors (for automated testing)

### Form Fields
```javascript
// Input fields
const emailField = page.locator('#email');
const phoneField = page.locator('#phone');
const passwordField = page.locator('#password');
const confirmPasswordField = page.locator('#password_confirmation');
const firstNameField = page.locator('#first_name');
const lastNameField = page.locator('#last_name');

// Checkboxes
const termsCheckbox = page.locator('#terms_accepted');
const marketingCheckbox = page.locator('#marketing_opt_in');

// Buttons
const submitButton = page.locator('button[type="submit"]');
```

### Error Elements
```javascript
// Error banner (for server errors)
const errorBanner = page.locator('[data-testid="registration-error-banner"]');
const errorBannerById = page.locator('#registration-error-banner');

// Field-specific errors
const emailError = page.locator('#email-error');

// Error styling
const emailFieldWithError = page.locator('#email.border-red-600');
```

### Success Elements
```javascript
// Success modal
const successModal = page.locator('[aria-labelledby="success-modal"]');
const discountCode = successModal.locator('text=/FIRST\\d+/');
const startOrderingButton = successModal.locator('button:has-text("Start Ordering")');
const copyCodeButton = successModal.locator('button:has-text("Copy Code")');
```

---

## Common Issues & Solutions

### Issue: Test fails with "Email already registered"

**Cause:** Test user already exists from previous run

**Solution:**
```bash
cd /app/backend && npm run cleanup-test-data
```

### Issue: Test fails with network error

**Cause:** Backend not running or wrong URL

**Solution:**
```bash
# Check backend is running
curl https://123salama-lama-food-truck.launchpulse.ai/api/business/info

# Or start backend locally
cd /app/backend && npm run dev
```

### Issue: Error banner not visible in test

**Cause:** Test checks too quickly before React updates DOM

**Solution:**
```javascript
// Wait for error banner with timeout
await page.waitForSelector('[data-testid="registration-error-banner"]', { 
  timeout: 5000 
});

// Or use expect with timeout
await expect(errorBanner).toBeVisible({ timeout: 5000 });
```

### Issue: Password validation not working

**Cause:** Password doesn't meet requirements

**Solution:**
Password must have:
- ✅ Minimum 8 characters
- ✅ At least one letter (a-z, A-Z)
- ✅ At least one number (0-9)

Valid examples:
- `Password123`
- `TestPass123!`
- `MySecret99`

Invalid examples:
- `password` (no number)
- `12345678` (no letter)
- `Pass1` (too short)

---

## Best Practices

### 1. Always Clean Before Testing
```bash
# Add to test setup
before(async () => {
  await exec('cd /app/backend && npm run cleanup-test-data');
});
```

### 2. Use Unique Emails for Parallel Tests
```javascript
const timestamp = Date.now();
const testEmail = `test+${timestamp}@example.com`;
```

### 3. Wait for Network Requests
```javascript
// Wait for registration API call to complete
await page.waitForResponse(
  response => response.url().includes('/api/auth/register')
);
```

### 4. Verify Success State
```javascript
// Check multiple success indicators
await expect(successModal).toBeVisible();
await expect(page).toHaveURL(/\/menu|\/dashboard/);
await expect(page.locator('text=/Welcome|Hi/')).toBeVisible();
```

### 5. Clean Up After Tests
```javascript
after(async () => {
  // Optional: clean up test data after suite completes
  if (process.env.CLEANUP_AFTER_TESTS === 'true') {
    await exec('cd /app/backend && npm run cleanup-test-data');
  }
});
```

---

## Environment Variables

```bash
# Frontend
VITE_API_BASE_URL=https://123salama-lama-food-truck.launchpulse.ai

# Backend
DATABASE_URL=postgresql://user:pass@host:5432/dbname
JWT_SECRET=your-secret-key
FRONTEND_URL=https://123salama-lama-food-truck.launchpulse.ai
```

---

## Testing URLs

- **Frontend:** https://123salama-lama-food-truck.launchpulse.ai
- **Backend:** https://123salama-lama-food-truck.launchpulse.ai
- **Signup Page:** https://123salama-lama-food-truck.launchpulse.ai/signup
- **Login Page:** https://123salama-lama-food-truck.launchpulse.ai/login

---

## Helpful Scripts

### Check if Backend is Running
```bash
curl https://123salama-lama-food-truck.launchpulse.ai/api/business/info
```

### Test Registration API Directly
```bash
curl -X POST https://123salama-lama-food-truck.launchpulse.ai/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "phone": "+353871234567",
    "password": "TestPass123!",
    "first_name": "Test",
    "last_name": "User",
    "marketing_opt_in": false
  }'
```

### Check Database User Count
```bash
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users WHERE email LIKE '%test%';"
```

---

## Support

For issues or questions:
1. Check this guide first
2. Review `/app/REGISTRATION_TEST_FIX.md` for technical details
3. Check console logs in browser DevTools
4. Review network tab for API responses

---

**Last Updated:** December 12, 2025  
**Status:** ✅ All systems operational
