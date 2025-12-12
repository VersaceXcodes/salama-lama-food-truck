# Activity Logging System Fix

## Issue Summary
The Activity Logging System test case failed because administrative actions were not being logged to the `activity_logs` table. Three specific admin actions failed to appear in the Activity Logs:
1. Create menu item
2. Update discount code  
3. Adjust customer loyalty points

## Root Cause
The backend endpoints for these administrative actions did not include any calls to insert records into the `activity_logs` table. While a logout endpoint demonstrated the correct pattern, the admin endpoints for managing menu items, discounts, and customer loyalty points were missing this functionality entirely.

## Solution Implemented

### 1. Created Activity Logging Helper Function
Added a reusable `log_activity()` helper function in `/app/backend/server.ts` (after line 220):

```typescript
async function log_activity({ user_id, action_type, entity_type, entity_id, description, changes, ip_address, user_agent }) {
  try {
    await pool.query(
      'INSERT INTO activity_logs (log_id, user_id, action_type, entity_type, entity_id, description, changes, ip_address, user_agent, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10)',
      [
        gen_id('log'),
        user_id,
        action_type,
        entity_type,
        entity_id,
        description,
        JSON.stringify(changes || {}),
        ip_address || null,
        user_agent || null,
        now_iso(),
      ]
    );
  } catch (error) {
    // Log but don't throw - activity logging should not break the main operation
    console.error('[log_activity] Failed to log activity:', error);
  }
}
```

**Key Features:**
- Accepts all necessary parameters for activity logging
- Handles JSON serialization of changes
- Non-blocking: errors in logging don't break the main operation
- Includes IP address and user agent for audit trail

### 2. Updated Admin Endpoints

#### A. Create Menu Item (`POST /api/admin/menu/items`)
**Location:** Line ~4555 in server.ts

Added activity logging after successful menu item creation:
```typescript
await log_activity({
  user_id: req.user.user_id,
  action_type: 'create',
  entity_type: 'menu_item',
  entity_id: item_id,
  description: `Created menu item: ${input.name}`,
  changes: { name: input.name, price: input.price, category_id: input.category_id },
  ip_address: req.ip,
  user_agent: req.headers['user-agent'],
});
```

#### B. Update Menu Item (`PUT /api/admin/menu/items/:id`)
**Location:** Line ~4640 in server.ts

Added activity logging after successful menu item update:
```typescript
await log_activity({
  user_id: req.user.user_id,
  action_type: 'update',
  entity_type: 'menu_item',
  entity_id: item_id,
  description: `Updated menu item: ${updated_item.name}`,
  changes: input,
  ip_address: req.ip,
  user_agent: req.headers['user-agent'],
});
```

#### C. Create Discount Code (`POST /api/admin/discounts`)
**Location:** Line ~5584 in server.ts

Added activity logging after successful discount creation:
```typescript
await log_activity({
  user_id: req.user.user_id,
  action_type: 'create',
  entity_type: 'discount',
  entity_id: code_id,
  description: `Created discount code: ${input.code}`,
  changes: { 
    code: input.code, 
    discount_type: input.discount_type, 
    discount_value: input.discount_value 
  },
  ip_address: req.ip,
  user_agent: req.headers['user-agent'],
});
```

#### D. Update Discount Code (`PUT /api/admin/discounts/:id`)
**Location:** Line ~5648 in server.ts

Modified query to return discount code and added activity logging:
```typescript
const upd = await pool.query(`UPDATE discount_codes SET ${fields.join(', ')} WHERE code_id = $${params.length} RETURNING code_id, code`, params);

await log_activity({
  user_id: req.user.user_id,
  action_type: 'update',
  entity_type: 'discount',
  entity_id: code_id,
  description: `Updated discount code: ${upd.rows[0].code}`,
  changes: input,
  ip_address: req.ip,
  user_agent: req.headers['user-agent'],
});
```

#### E. Adjust Customer Loyalty Points (`PUT /api/admin/customers/:id/points`)
**Location:** Line ~5770 in server.ts

Added user name lookup and activity logging:
```typescript
// Get user info for logging
const user_res = await client.query('SELECT first_name, last_name, email FROM users WHERE user_id = $1', [user_id]);
const user_name = user_res.rows.length > 0 ? `${user_res.rows[0].first_name} ${user_res.rows[0].last_name}` : user_id;

await client.query('COMMIT');

// Log activity
await log_activity({
  user_id: req.user.user_id,
  action_type: 'update',
  entity_type: 'user',
  entity_id: user_id,
  description: `Adjusted loyalty points for ${user_name}: ${body.action === 'add' ? '+' : '-'}${body.points} points`,
  changes: { 
    action: body.action, 
    points: body.points, 
    reason: body.reason,
    previous_balance: prev_balance,
    new_balance: next_balance
  },
  ip_address: req.ip,
  user_agent: req.headers['user-agent'],
});
```

## Activity Log Schema
The logs are stored in the `activity_logs` table with the following fields:
- `log_id`: Unique identifier
- `user_id`: Admin user performing the action
- `action_type`: Type of action (create, update, delete, etc.)
- `entity_type`: Type of entity (menu_item, discount, user, etc.)
- `entity_id`: ID of the affected entity
- `description`: Human-readable description
- `changes`: JSON object with details of what changed
- `ip_address`: IP address of the admin
- `user_agent`: Browser/client user agent
- `created_at`: Timestamp of the action

## Testing
After the fix:
1. Admin creates a menu item → Activity log entry created with action_type='create', entity_type='menu_item'
2. Admin updates a discount code → Activity log entry created with action_type='update', entity_type='discount'
3. Admin adjusts customer loyalty points → Activity log entry created with action_type='update', entity_type='user'

All three actions will now appear in the Activity Logs page in the admin dashboard.

## Additional Notes
- The fix is non-breaking: if activity logging fails, the main operation still succeeds
- Activity logs include full audit trail (who, what, when, where)
- The pattern is now established for future admin endpoints to follow
- All activity logs are queryable via `GET /api/admin/activity-logs` endpoint

## Files Modified
- `/app/backend/server.ts` - Added helper function and activity logging to 5 admin endpoints

## Deployment
The backend has been rebuilt and restarted with the changes applied.
