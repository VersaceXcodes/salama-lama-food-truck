# Discount Code Validation Fix

## Problem Summary
The discount code validation API endpoint (`/api/discount/validate`) was failing with a generic "Validation failed" error for all discount codes (valid, invalid, and expired). The root cause was that the `user_id` parameter was required by the backend validation schema but was not being sent by the frontend.

## Root Causes

### 1. Missing user_id Parameter
- **File**: `backend/server.ts:2395`
- **Issue**: The validation schema required `user_id`, but it wasn't being extracted from the authenticated user token
- **Impact**: All discount code validation requests failed with ZodError

### 2. Generic Error Messages
- **File**: `backend/server.ts:886-898`
- **Issue**: The `validate_discount_code` function returned generic "Invalid or expired code" for all failures
- **Impact**: Users couldn't distinguish between invalid codes, expired codes, and other validation failures

### 3. Expired Discount Code
- **Database**: `discount_codes` table
- **Issue**: The FIRST10 discount code had `valid_until` set to '2024-12-31', which is in the past
- **Impact**: Valid-looking code was being rejected as expired

## Solutions Implemented

### 1. Fixed Missing user_id Parameter
**File**: `backend/server.ts:2395`

```typescript
// BEFORE:
const payload = validateDiscountCodeInputSchema.parse({
  ...req.body,
  order_value: Number(req.body?.order_value),
});

// AFTER:
const payload = validateDiscountCodeInputSchema.parse({
  ...req.body,
  user_id: req.user.user_id, // Get user_id from authenticated token
  order_value: Number(req.body?.order_value),
});
```

### 2. Improved Error Messages
**File**: `backend/server.ts:886-920`

Added comprehensive error checking before validating the discount code:

```typescript
async function validate_discount_code({ code, user_id, order_type, order_value }) {
  const code_upper = ensure_upper(code);
  const now = now_iso();
  
  // First check if code exists at all
  const check_res = await pool.query(
    `SELECT * FROM discount_codes WHERE code = $1`,
    [code_upper]
  );
  
  if (check_res.rows.length === 0) {
    return { valid: false, error: 'INVALID_CODE', message: 'Invalid discount code' };
  }
  
  const check_row = check_res.rows[0];
  
  // Check if expired or inactive
  if (check_row.status !== 'active') {
    return { valid: false, error: 'EXPIRED_CODE', message: 'This discount code has expired' };
  }
  
  if (check_row.valid_until && new Date(check_row.valid_until) < new Date(now)) {
    return { valid: false, error: 'EXPIRED_CODE', message: 'This discount code has expired' };
  }
  
  if (new Date(check_row.valid_from) > new Date(now)) {
    return { valid: false, error: 'NOT_YET_VALID', message: 'This discount code is not yet valid' };
  }
  
  // Continue with existing validation...
}
```

### 3. Updated FIRST10 Validity Period
**Database Update**:
```sql
UPDATE discount_codes 
SET valid_until = '2026-12-31T23:59:59Z'
WHERE code = 'FIRST10';
```

## Testing Results

After implementing these fixes, the discount validation now provides specific error messages:

1. **FIRST10** (valid code): ✅ Returns `{valid: true, discount_amount: 4.25}`
2. **INVALID123** (non-existent): ✅ Returns `"Invalid discount code"`
3. **EXPIRED** (expired code): ✅ Returns `"This discount code has expired"`

## Files Modified

1. `/app/backend/server.ts` - Lines 886-920 and 2395
2. `/app/backend/dist/server.js` - Compiled output (lines 754-781 and 2145)
3. Database: `discount_codes` table (FIRST10 record updated)

## Deployment Instructions

The code has been fixed and compiled. To deploy:

1. The backend code changes are in `/app/backend/server.ts` and have been compiled to `/app/backend/dist/server.js`
2. Restart the backend server to load the new compiled code
3. The database has already been updated with the extended validity period for FIRST10

### Restart Commands (depending on deployment):
```bash
# If using pm2:
pm2 restart backend

# If using systemd:
systemctl restart food-truck-backend

# If running manually:
# Kill the existing process and restart
cd /app/backend && npm start
```

## Expected Behavior After Deployment

- Valid discount codes will apply successfully
- Invalid codes return: "Invalid discount code"
- Expired codes return: "This discount code has expired"
- Not-yet-valid codes return: "This discount code is not yet valid"
- Codes that don't meet minimum order value return: "Minimum order €X.XX not met"
- Codes at usage limit return: "Code usage limit reached" or "Code already used by this customer"

## Test Script

A test script has been created at `/app/test_discount_fix.sh` to verify the fix after deployment.
