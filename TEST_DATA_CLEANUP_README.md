# Browser Test Data Cleanup - Quick Start

## TL;DR

**Problem:** Browser test failing because test user already exists in database  
**Solution:** Run cleanup script before tests  
**Result:** Test will pass

## Quick Fix (30 seconds)

```bash
# Run this command from /app directory
./cleanup-browser-test-data.sh
```

That's it! Now run your browser tests.

---

## What This Does

Removes test user and all associated data:
- User account (`test.signup@example.com` / `+353871234599`)
- Loyalty account and points
- First-order discount code
- Orders, addresses, payment methods
- Email verification tokens
- Activity logs

---

## Why Is This Needed?

The test tries to register a new user, but that user already exists from a previous test run. The application correctly rejects duplicate registrations with a 409 error.

**This is not a bug** - the app is working perfectly!

---

## Alternative Methods

### If you don't have `psql`:

```bash
cd backend && node -e "const { Pool } = require('pg'); const fs = require('fs'); const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }); pool.query(fs.readFileSync('../cleanup_browser_test_data.sql', 'utf8')).then(() => { console.log('Done'); pool.end(); }).catch(e => { console.error(e); pool.end(); });"
```

### Manual cleanup via SQL:

```sql
DELETE FROM users WHERE email = 'test.signup@example.com' OR phone = '+353871234599';
```
(Note: This simplified version may fail due to foreign keys. Use the full cleanup script instead.)

---

## Verification

Check if cleanup worked:

```bash
psql $DATABASE_URL -c "SELECT email, phone FROM users WHERE email = 'test.signup@example.com';"
```

Should return: `(0 rows)`

---

## For CI/CD

Add before your test command:

```bash
./cleanup-browser-test-data.sh && npm run test:browser
```

---

## Test Data Used

| Field | Value |
|-------|-------|
| Email | test.signup@example.com |
| Phone | +353871234599 |
| First Name | New |
| Last Name | User |
| Password | TestPass123! |

---

## More Information

- **Full Status Report:** `REGISTRATION_FORM_STATUS.md`
- **Cleanup Guide:** `BROWSER_TEST_DATA_CLEANUP.md`
- **Quick Summary:** `BROWSER_TEST_FIX_SUMMARY.md`
- **SQL Script:** `cleanup_browser_test_data.sql`

---

## Common Questions

**Q: Do I need to modify any code?**  
A: No! The app is working correctly. Just clean the test data.

**Q: Will this delete real user data?**  
A: No. Only removes specific test users (test.signup@example.com and newcustomer@test.ie).

**Q: How often do I need to run this?**  
A: Before each browser test run, or use dynamic test data.

**Q: Can I automate this?**  
A: Yes! Add it to your test script or CI/CD pipeline.

---

## Support

If cleanup script fails:
1. Check DATABASE_URL is set correctly
2. Verify database connection
3. Check logs in cleanup output
4. Try the Node.js alternative method
