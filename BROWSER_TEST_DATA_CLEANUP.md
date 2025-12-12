# Browser Test Data Cleanup

## Issue Summary

The browser test for user registration (ui-004) is failing because test data from previous runs remains in the database. When the test attempts to register a new user with:
- Email: `test.signup@example.com`
- Phone: `+353871234599`

The backend correctly returns a 409 (Conflict) error with the message "Phone already registered", which is the expected behavior for duplicate registrations.

## Root Cause

The application is working correctly - it's properly validating that phone numbers must be unique and displaying appropriate error messages. The issue is that browser test data is not being cleaned up between test runs, causing subsequent tests to fail.

## Solution

Before running browser tests, you must clean up test data from the database.

### Method 1: Using psql (Recommended)

```bash
# Connect to your PostgreSQL database and run the cleanup script
psql $DATABASE_URL -f cleanup_browser_test_data.sql
```

### Method 2: Using Node.js

```bash
# Run the cleanup script through Node.js
node -e "
const { Pool } = require('pg');
const fs = require('fs');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const sql = fs.readFileSync('cleanup_browser_test_data.sql', 'utf8');
pool.query(sql).then(() => { console.log('Cleanup completed'); pool.end(); }).catch(err => { console.error(err); pool.end(); });
"
```

### Method 3: Manual Cleanup via API

If you have admin access, you can also delete test users through the admin interface or by running SQL directly:

```sql
DELETE FROM users WHERE email = 'test.signup@example.com' OR phone = '+353871234599';
```

Note: This simplified query may fail due to foreign key constraints. Use the comprehensive cleanup script instead.

## Test Data Used

Current browser tests use the following test data:

| Field | Value |
|-------|-------|
| First Name | New |
| Last Name | User |
| Email | test.signup@example.com |
| Phone | +353871234599 |
| Password | TestPass123! |

## Verification

After cleanup, you can verify the data was removed:

```sql
SELECT email, phone, first_name, last_name 
FROM users 
WHERE email = 'test.signup@example.com' OR phone = '+353871234599';
```

This should return no rows.

## Form Behavior Verification

The registration form is working correctly:

1. **Client-side validation** - All field validation rules are working:
   - Required fields
   - Email format validation
   - Password complexity requirements
   - Password confirmation matching
   - Terms acceptance

2. **Server-side validation** - The backend properly:
   - Checks for duplicate emails
   - Checks for duplicate phone numbers
   - Returns appropriate 409 errors with clear messages
   - Includes field-specific error details

3. **Error display** - The frontend correctly:
   - Shows field-specific error messages
   - Displays a prominent error banner for server errors
   - Maps backend error codes to user-friendly messages
   - Highlights affected fields with red styling

4. **Success flow** - On successful registration:
   - User account is created
   - Loyalty account is initialized
   - First-order discount code is generated
   - JWT token is issued
   - Success modal displays with discount code
   - User is redirected to the appropriate page

## Expected Test Flow

1. Run cleanup script to remove test data
2. Execute browser tests
3. Test creates user with test data
4. Verify registration success modal appears
5. Verify discount code is displayed
6. Verify redirection occurs

## Notes for Test Automation

To make browser tests idempotent:

1. Always run cleanup before tests
2. Consider using dynamic test data (timestamp-based emails/phones)
3. Or implement a test cleanup hook in the test framework
4. Consider adding a `?test=true` query parameter that uses a test database

## Files Modified

- `cleanup_browser_test_data.sql` - Comprehensive cleanup script
- `BROWSER_TEST_DATA_CLEANUP.md` - This documentation
