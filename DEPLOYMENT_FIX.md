# Deployment Fix Required: Empty Cart Endpoint

## Quick Summary
**The production backend server needs to be restarted** to enable the "Empty Cart" functionality.

## Problem
Browser testing revealed that clicking "Empty Cart" returns an error. The DELETE `/api/cart` endpoint exists in the code but the production server is running an old version that doesn't have it.

## Solution
Restart the backend server to load the updated code.

## Deployment Steps

### Option 1: Manual Restart (Recommended if unsure)
```bash
# 1. SSH into production server
ssh user@your-server

# 2. Navigate to backend directory
cd /app/backend

# 3. Stop the current process
# Find the process
ps aux | grep -E "tsx|nodemon|node.*server"

# Kill it (replace PID with actual process ID)
kill <PID>

# 4. Start the server again
npm start

# 5. Verify it's running
curl -X OPTIONS http://localhost:3000/api/cart
```

### Option 2: Using Process Manager

**If using PM2:**
```bash
pm2 restart backend
pm2 logs backend --lines 50
```

**If using systemd:**
```bash
sudo systemctl restart backend
sudo systemctl status backend
```

**If using Docker:**
```bash
docker restart backend-container
docker logs backend-container --tail 50
```

### Option 3: Full Redeploy
If you have a deployment pipeline:
```bash
# Pull latest code
git pull origin main

# Rebuild
cd /app/backend
npm install
npm run build

# Restart
npm start
```

## Verification

After restarting, verify the endpoint works:

```bash
# Test the endpoint exists (should return 401 without auth, not 404)
curl -X DELETE http://localhost:3000/api/cart -v

# Or with authentication
curl -X DELETE http://localhost:3000/api/cart \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

Expected: HTTP 200 with JSON response containing empty cart
NOT Expected: HTTP 404 with HTML "Cannot DELETE /api/cart"

## Automated Test
Run the provided test script:
```bash
# Set your API URL (default is localhost:3000)
export API_URL="https://your-production-domain.com"

# Run the test
/app/test_empty_cart.sh
```

## Rollback Plan
If issues occur after restart:
1. Check logs: `pm2 logs backend` or `journalctl -u backend`
2. If needed, restart again: `pm2 restart backend`
3. The endpoint is a simple DELETE operation with no database migration required

## Technical Details

### Endpoint Added
- **Route:** `DELETE /api/cart`
- **Location:** `backend/server.ts:2364-2388`
- **Commit:** `26044939`
- **Authentication:** Required (Bearer token)

### What it does:
1. Reads user's cart from file storage
2. Clears all items
3. Resets discount code
4. Saves empty cart
5. Returns success response

### Dependencies:
- None (uses existing cart storage system)
- No database changes required
- No frontend changes needed

## Monitoring After Deployment

Watch for:
1. ✅ DELETE /api/cart returns 200 (not 404)
2. ✅ Cart page shows success message after clearing
3. ✅ No errors in server logs
4. ✅ Cart badge updates to 0 after clearing

## Contact
If issues persist after restart, check:
1. Server logs for startup errors
2. Port 3000 is not blocked
3. CORS settings allow DELETE method
4. No reverse proxy blocking DELETE requests

## Files Changed
This fix only requires server restart. No code changes needed.
The endpoint already exists in: `backend/server.ts:2364`

---
**Status:** Ready for deployment
**Risk Level:** Low (simple endpoint, no DB changes)
**Estimated Downtime:** < 5 seconds (server restart)
