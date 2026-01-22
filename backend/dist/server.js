import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { nanoid, customAlphabet } from 'nanoid';
import { z } from 'zod';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import PDFDocument from 'pdfkit';
import { Pool } from 'pg';
const { DATABASE_URL, PGHOST, PGDATABASE, PGUSER, PGPASSWORD, PGPORT = 5432 } = process.env;
const pool = new Pool(DATABASE_URL
    ? {
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false },
    }
    : {
        host: PGHOST,
        database: PGDATABASE,
        user: PGUSER,
        password: PGPASSWORD,
        port: Number(PGPORT),
        ssl: { rejectUnauthorized: false },
    });
/* then, can be used like this :
const client = await pool.connect();
await client.query("SELECT * FROM exampletable;")
*/
import { userSchema, createUserInputSchema, updateUserInputSchema, verifyPasswordResetInputSchema, verifyEmailInputSchema, createNewsletterSubscriberInputSchema, addressSchema, createAddressInputSchema, updateAddressInputSchema, categorySchema, createCategoryInputSchema, updateCategoryInputSchema, searchMenuItemInputSchema, menuItemSchema, createMenuItemInputSchema, updateMenuItemInputSchema, orderSchema, updateOrderInputSchema, searchOrderInputSchema, createCateringInquiryInputSchema, cateringInquirySchema, updateCateringInquiryInputSchema, searchCateringInquiryInputSchema, createCateringQuoteInputSchema, cateringQuoteSchema, invoiceSchema, createInvoiceInputSchema, createDiscountCodeInputSchema, updateDiscountCodeInputSchema, validateDiscountCodeInputSchema, discountCodeSchema, rewardSchema, badgeSchema, loyaltyAccountSchema, createSystemSettingInputSchema, systemSettingSchema, contactMessageSchema, createContactMessageInputSchema, updateContactMessageInputSchema, searchContactMessageInputSchema, } from './schema.js';
dotenv.config();
const { PORT = 3000, JWT_SECRET = 'dev-secret', FRONTEND_URL = 'http://localhost:5173', } = process.env;
const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
    cors: {
        origin: FRONTEND_URL,
        credentials: true,
    },
});
// ESM workaround for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDist = path.basename(__dirname) === 'dist';
const publicDir = isDist
    ? path.resolve(__dirname, '..', 'public') // /app/backend/dist -> /app/backend/public
    : path.resolve(__dirname, 'public'); // /app/backend -> /app/backend/public
const storage_dir = path.resolve(isDist ? path.resolve(__dirname, '..') : __dirname, 'storage');
const storage_uploads_dir = path.join(storage_dir, 'uploads');
const storage_invoices_dir = path.join(storage_dir, 'invoices');
const storage_quotes_dir = path.join(storage_dir, 'quotes');
const storage_catering_attachments_dir = path.join(storage_dir, 'catering_attachments');
const storage_carts_dir = path.join(storage_dir, 'carts');
for (const dir of [
    storage_dir,
    storage_uploads_dir,
    storage_invoices_dir,
    storage_quotes_dir,
    storage_catering_attachments_dir,
    storage_carts_dir,
]) {
    if (!fs.existsSync(dir))
        fs.mkdirSync(dir, { recursive: true });
}
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
/*
  Log requests with high-fidelity data for dev UX.
  We keep it as morgan (requirement) but enrich the format with params/query/body.
*/
morgan.token('req_meta', (req) => {
    const expressReq = req;
    const safe_headers = { ...req.headers };
    if (safe_headers.authorization)
        safe_headers.authorization = '[redacted]';
    return JSON.stringify({
        request_id: expressReq.request_id,
        method: req.method,
        path: expressReq.originalUrl,
        params: expressReq.params,
        query: expressReq.query,
        headers: safe_headers,
        body: expressReq.body,
    });
});
app.use(morgan(':method :url :status :response-time ms - :req_meta'));
/*
  Attach a request_id used for tracing, logs, and all error responses.
*/
app.use((req, res, next) => {
    req.request_id = `req_${nanoid(12)}`;
    res.setHeader('x-request-id', req.request_id);
    next();
});
/*
  Serve storage artifacts (uploads, invoices, quotes, catering attachments) locally.
  This improves development UX without relying on external object storage.
*/
app.use('/storage', express.static(storage_dir));
// Serve static files from the 'public' directory
app.use(express.static(publicDir));
/**
 * Build a consistent error envelope.
 * We include request_id for traceability, and optionally details for debugging.
 */
function createErrorResponse(message, error = null, error_code = 'INTERNAL_ERROR', request_id = null, details = null) {
    const include_error = !!error;
    const payload = {
        success: false,
        message,
        error_code,
        timestamp: new Date().toISOString(),
    };
    if (request_id)
        payload.request_id = request_id;
    if (details !== null && details !== undefined)
        payload.details = details;
    if (include_error) {
        payload.debug = {
            name: error?.name,
            message: error?.message,
            stack: error?.stack,
        };
    }
    return payload;
}
/**
 * Convenience: JSON success wrapper.
 */
function ok(res, status, data) {
    return res.status(status).json({ success: true, ...data, timestamp: new Date().toISOString(), request_id: res.getHeader('x-request-id') });
}
/**
 * Convert pg DECIMAL/NUMERIC string fields to JS numbers.
 * This is critical because pg returns numerics as strings by default.
 */
function coerce_numbers(row, numeric_fields) {
    const out = { ...row };
    for (const f of numeric_fields) {
        if (out[f] === null || out[f] === undefined)
            continue;
        if (typeof out[f] === 'string')
            out[f] = Number(out[f]);
    }
    return out;
}
/**
 * Small helpers.
 */
function now_iso() {
    return new Date().toISOString();
}
function gen_id(prefix) {
    return `${prefix}_${nanoid(20)}`;
}
function ensure_upper(s) {
    return typeof s === 'string' ? s.toUpperCase() : s;
}
/**
 * Log admin activity to activity_logs table.
 */
async function log_activity({ user_id, action_type, entity_type, entity_id, description, changes, ip_address, user_agent }) {
    try {
        await pool.query('INSERT INTO activity_logs (log_id, user_id, action_type, entity_type, entity_id, description, changes, ip_address, user_agent, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10)', [
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
        ]);
    }
    catch (error) {
        // Log but don't throw - activity logging should not break the main operation
        console.error('[log_activity] Failed to log activity:', error);
    }
}
/**
 * Parse query parameters into types expected by Zod schemas.
 * We support booleans, numbers, arrays (comma separated or repeated params).
 */
function normalize_query_value(v) {
    if (Array.isArray(v))
        return v;
    if (v === undefined)
        return undefined;
    if (v === null)
        return null;
    if (typeof v !== 'string')
        return v;
    const trimmed = v.trim();
    if (trimmed === '')
        return '';
    if (trimmed === 'true')
        return true;
    if (trimmed === 'false')
        return false;
    if (/^-?\d+$/.test(trimmed))
        return Number(trimmed);
    if (/^-?\d+\.\d+$/.test(trimmed))
        return Number(trimmed);
    if (trimmed.includes(','))
        return trimmed.split(',').map((x) => x.trim()).filter(Boolean);
    return trimmed;
}
function parse_query(schema, query) {
    const normalized = {};
    for (const [k, v] of Object.entries(query || {})) {
        normalized[k] = normalize_query_value(v);
    }
    return schema.parse(normalized);
}
/**
 * Run a DB operation with a dedicated client, ensuring release.
 */
async function with_client(fn) {
    const client = await pool.connect();
    try {
        return await fn(client);
    }
    finally {
        client.release();
    }
}
/**
 * Load a system setting by key.
 * We allow missing keys for forward-compat and use defaults.
 */
async function get_setting(setting_key, default_value = null) {
    const result = await pool.query('SELECT setting_value, setting_type FROM system_settings WHERE setting_key = $1', [setting_key]);
    if (result.rows.length === 0)
        return default_value;
    const row = result.rows[0];
    // setting_value is JSONB; keep as-is.
    return row.setting_value;
}
/**
 * Upsert a system setting.
 */
async function upsert_setting(client, { setting_key, setting_value, setting_type, updated_by_user_id = null }) {
    const existing = await client.query('SELECT setting_id FROM system_settings WHERE setting_key = $1', [setting_key]);
    if (existing.rows.length === 0) {
        const setting_id = gen_id('set');
        await client.query(`INSERT INTO system_settings (setting_id, setting_key, setting_value, setting_type, updated_at, updated_by_user_id)
       VALUES ($1, $2, $3::jsonb, $4, $5, $6)`, [setting_id, setting_key, JSON.stringify(setting_value), setting_type, now_iso(), updated_by_user_id]);
        return setting_id;
    }
    const setting_id = existing.rows[0].setting_id;
    await client.query(`UPDATE system_settings
     SET setting_value = $1::jsonb, setting_type = $2, updated_at = $3, updated_by_user_id = $4
     WHERE setting_id = $5`, [JSON.stringify(setting_value), setting_type, now_iso(), updated_by_user_id, setting_id]);
    return setting_id;
}
/**
 * Build JWT token.
 * Staff/admin tokens include login_at to enforce single active session.
 */
function sign_token({ user_id, role, email, remember_me = false, login_at = null }) {
    const is_staff_like = role === 'staff' || role === 'admin';
    const expires_in = is_staff_like ? '8h' : remember_me ? '30d' : '1d';
    const payload = {
        user_id,
        role,
        email,
    };
    if (is_staff_like)
        payload.login_at = login_at;
    return jwt.sign(payload, JWT_SECRET, { expiresIn: expires_in });
}
/**
 * Authenticate bearer token and attach req.user.
 * Also enforces: user must exist and be active, and staff/admin single-session.
 * Now supports guest users (role='guest').
 */
async function authenticate_token(req, res, next) {
    const auth_header = req.headers.authorization;
    const token = auth_header && auth_header.startsWith('Bearer ') ? auth_header.slice('Bearer '.length) : null;
    if (!token) {
        return res.status(401).json(createErrorResponse('Access token required', null, 'AUTH_TOKEN_REQUIRED', req.request_id));
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const result = await pool.query('SELECT user_id, email, first_name, last_name, role, status, email_verified, last_login_at FROM users WHERE user_id = $1', [decoded.user_id]);
        if (result.rows.length === 0) {
            return res.status(401).json(createErrorResponse('Invalid token', null, 'AUTH_TOKEN_INVALID', req.request_id));
        }
        const user = result.rows[0];
        if (user.status !== 'active') {
            return res.status(403).json(createErrorResponse('Account is not active', null, 'AUTH_ACCOUNT_INACTIVE', req.request_id));
        }
        if ((user.role === 'staff' || user.role === 'admin') && decoded.login_at) {
            if ((user.last_login_at || null) !== decoded.login_at) {
                return res.status(401).json(createErrorResponse('Session has been superseded by a newer login', null, 'AUTH_SESSION_SUPERSEDED', req.request_id));
            }
        }
        // Add isGuest flag for convenience
        req.user = {
            ...user,
            isGuest: user.role === 'guest',
        };
        req.token_payload = decoded;
        next();
    }
    catch (error) {
        return res.status(403).json(createErrorResponse('Invalid or expired token', error, 'AUTH_TOKEN_INVALID', req.request_id));
    }
}
/**
 * Optional authentication middleware - attaches user if token is present, but doesn't require it.
 * For guest carts, we'll use a session-based identifier.
 * Now supports guest users (role='guest').
 */
async function authenticate_token_optional(req, res, next) {
    const auth_header = req.headers.authorization;
    const token = auth_header && auth_header.startsWith('Bearer ') ? auth_header.slice('Bearer '.length) : null;
    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            const result = await pool.query('SELECT user_id, email, first_name, last_name, role, status, email_verified, last_login_at FROM users WHERE user_id = $1', [decoded.user_id]);
            if (result.rows.length > 0) {
                const user = result.rows[0];
                if (user.status === 'active') {
                    // For staff/admin, check session validity
                    if ((user.role === 'staff' || user.role === 'admin') && decoded.login_at) {
                        if ((user.last_login_at || null) === decoded.login_at) {
                            req.user = {
                                ...user,
                                isGuest: user.role === 'guest',
                            };
                            req.token_payload = decoded;
                        }
                    }
                    else {
                        req.user = {
                            ...user,
                            isGuest: user.role === 'guest',
                        };
                        req.token_payload = decoded;
                    }
                }
            }
        }
        catch (error) {
            // Token invalid or expired - continue as guest
            console.log('[AUTH] Invalid token, continuing as guest:', error.message);
        }
    }
    // If no user authenticated, create/use guest session ID
    if (!req.user) {
        // Use a session ID from cookie or create a new one
        const guest_session_id = req.cookies?.guest_session_id || `guest_${nanoid(20)}`;
        req.guest_session_id = guest_session_id;
        // Always set/refresh the cookie for guest session (7 days expiry)
        // This ensures the session stays alive and the cookie is properly set
        res.cookie('guest_session_id', guest_session_id, {
            maxAge: 7 * 24 * 60 * 60 * 1000,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/' // Ensure cookie is sent for all paths
        });
    }
    next();
}
/**
 * Authorization guard.
 */
function require_role(allowed_roles) {
    return (req, res, next) => {
        const role = req.user?.role;
        if (!role || !allowed_roles.includes(role)) {
            return res.status(403).json(createErrorResponse('Insufficient permissions', null, 'AUTH_FORBIDDEN', req.request_id));
        }
        next();
    };
}
/**
 * Permission guard for staff/admin fine-grained permissions stored in users.staff_permissions JSONB.
 * Admin and manager roles have all permissions by default.
 */
function require_permission(permission_key) {
    return async (req, res, next) => {
        const role = req.user?.role;
        // Admin and manager have all permissions
        if (role === 'admin' || role === 'manager')
            return next();
        if (role !== 'staff') {
            return res.status(403).json(createErrorResponse('Insufficient permissions', null, 'AUTH_FORBIDDEN', req.request_id));
        }
        const result = await pool.query('SELECT staff_permissions FROM users WHERE user_id = $1', [req.user.user_id]);
        const perms = result.rows[0]?.staff_permissions || null;
        const has = perms && typeof perms === 'object' ? !!perms[permission_key] : false;
        if (!has) {
            return res.status(403).json(createErrorResponse('Insufficient permissions', null, 'AUTH_FORBIDDEN', req.request_id));
        }
        next();
    };
}
/**
 * Compute a simple point-in-polygon check.
 * Note: our DB seed uses coordinates as [lat, lng]. We treat them accordingly.
 */
function point_in_polygon(lat, lng, polygon_latlngs) {
    // Ray casting algorithm.
    let inside = false;
    for (let i = 0, j = polygon_latlngs.length - 1; i < polygon_latlngs.length; j = i++) {
        const xi = polygon_latlngs[i][0];
        const yi = polygon_latlngs[i][1];
        const xj = polygon_latlngs[j][0];
        const yj = polygon_latlngs[j][1];
        const intersect = yi > lng !== yj > lng && lat < ((xj - xi) * (lng - yi)) / (yj - yi + 0.0) + xi;
        if (intersect)
            inside = !inside;
    }
    return inside;
}
/**
 * Find the best delivery zone for a given coordinate.
 */
async function find_delivery_zone(lat, lng) {
    const res = await pool.query(`SELECT zone_id, zone_name, zone_type, zone_boundaries, delivery_fee, minimum_order_value, estimated_delivery_time, is_active, priority
     FROM delivery_zones
     WHERE is_active = true
     ORDER BY priority DESC, created_at DESC`);
    for (const row of res.rows) {
        const zone = coerce_numbers(row, ['delivery_fee', 'minimum_order_value']);
        if (!zone.is_active)
            continue;
        if (zone.zone_type === 'polygon') {
            const coords = zone.zone_boundaries?.coordinates?.[0] || [];
            if (coords.length >= 3 && point_in_polygon(lat, lng, coords)) {
                return zone;
            }
        }
        // Radius / postal_code support can be added later.
    }
    return null;
}
/*
  @@need:external-api : Google Geocoding API to convert a human address into latitude/longitude.
  In MVP/dev we return a deterministic mock coordinate in Dublin based on a simple hash.
*/
async function geocode_address_mock({ address_line1, city, postal_code }) {
    const seed = `${address_line1}|${city}|${postal_code}`;
    let h = 0;
    for (let i = 0; i < seed.length; i++)
        h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    // Dublin-ish bounding box.
    const lat = 53.30 + (h % 5000) / 100000; // 53.30 - 53.35
    const lng = -6.30 + ((h / 5000) % 6000) / 100000; // -6.30 - -6.24
    return { latitude: Number(lat.toFixed(8)), longitude: Number(lng.toFixed(8)) };
}
/*
  @@need:external-api : Google Places API to fetch business reviews.
  In MVP/dev we return a stable mock list.
*/
async function get_google_reviews_mock(limit = 5) {
    const reviews = Array.from({ length: Math.max(1, Math.min(5, limit)) }).map((_, idx) => ({
        author_name: `Reviewer ${idx + 1}`,
        rating: 5 - (idx % 2),
        text: idx % 2 === 0 ? 'Great coffee and fast service!' : 'Lovely pastries and friendly staff.',
        time: new Date(Date.now() - idx * 86400000).toISOString(),
        author_photo_url: `https://picsum.photos/seed/review_${idx + 1}/96/96`,
    }));
    return {
        aggregate_rating: 4.7,
        total_count: 234,
        reviews,
        google_business_url: 'https://www.google.com/maps',
    };
}
/*
  @@need:external-api : Email service (SendGrid/Mailgun/SES) for transactional emails.
  In MVP/dev we log and return a mock message id.
*/
async function send_email_mock({ to, subject, body }) {
    const message_id = `email_${nanoid(10)}`;
    console.log('[mock_email]', { message_id, to, subject, body_preview: (body || '').slice(0, 200) });
    return { message_id, queued: true };
}
/*
  @@need:external-api : SMS provider (e.g., Twilio) to send order status SMS.
  In MVP/dev we log and return a mock sms id.
*/
async function send_sms_mock({ to, body }) {
    const sms_id = `sms_${nanoid(10)}`;
    console.log('[mock_sms]', { sms_id, to, body_preview: (body || '').slice(0, 160) });
    return { sms_id, queued: true };
}
/*
  @@need:external-api : SumUp Payment API to charge a card token.
  In MVP/dev we simulate a successful charge (or failure if cvv == '000').
*/
async function sumup_charge_mock({ amount, currency, description, token, cvv }) {
    if (String(cvv) === '000') {
        return { success: false, error_code: 'card_declined', message: 'Card declined (mock)' };
    }
    return {
        success: true,
        transaction_id: `sumup_tx_${nanoid(12)}`,
        amount,
        currency,
        description,
        status: 'paid',
    };
}
/*
  @@need:external-api : SumUp Refund API to refund a prior transaction.
  In MVP/dev we simulate a successful refund.
*/
async function sumup_refund_mock({ transaction_id, amount, reason }) {
    return {
        success: true,
        refund_id: `sumup_ref_${nanoid(12)}`,
        transaction_id,
        amount,
        reason,
        status: 'refunded',
    };
}
/**
 * Read user or guest cart from local durable storage.
 * Supports both authenticated users and guest sessions.
 */
function cart_file_path(identifier) {
    return path.join(storage_carts_dir, `${identifier}.json`);
}
function get_cart_identifier(req) {
    // Use user_id if authenticated, otherwise use guest session ID
    return req.user?.user_id || req.guest_session_id || 'unknown';
}
function read_cart_sync(identifier) {
    try {
        const fp = cart_file_path(identifier);
        console.log(`[CART READ] Attempting to read cart for identifier ${identifier} from ${fp}`);
        if (!fs.existsSync(fp)) {
            console.log(`[CART READ] Cart file does not exist, returning empty cart`);
            return { items: [], discount_code: null, updated_at: now_iso() };
        }
        const content = fs.readFileSync(fp, 'utf8');
        const parsed = JSON.parse(content);
        if (!parsed || typeof parsed !== 'object') {
            console.warn(`[CART READ] Invalid cart data structure, returning empty cart`);
            return { items: [], discount_code: null, updated_at: now_iso() };
        }
        if (!Array.isArray(parsed.items)) {
            console.warn(`[CART READ] Cart items is not an array, fixing`);
            parsed.items = [];
        }
        console.log(`[CART READ] Successfully read cart with ${parsed.items.length} items`);
        return { items: parsed.items, discount_code: parsed.discount_code ?? null, updated_at: parsed.updated_at ?? now_iso() };
    }
    catch (error) {
        console.error(`[CART READ ERROR] Failed to read cart for identifier ${identifier}:`, error);
        return { items: [], discount_code: null, updated_at: now_iso() };
    }
}
function write_cart_sync(identifier, cart) {
    try {
        const fp = cart_file_path(identifier);
        const next = { ...cart, updated_at: now_iso() };
        console.log(`[CART WRITE] Writing cart for identifier ${identifier} with ${next.items.length} items`);
        fs.writeFileSync(fp, JSON.stringify(next, null, 2), 'utf8');
        console.log(`[CART WRITE] Successfully wrote cart to ${fp}`);
        return next;
    }
    catch (error) {
        console.error(`[CART WRITE ERROR] Failed to write cart for identifier ${identifier}:`, error);
        throw error;
    }
}
/**
 * Cart schemas (not provided in schema.ts), so we define minimal local schemas.
 */
const cart_customizations_schema = z.record(z.unknown()).nullable().optional();
const cart_add_input_schema = z.object({
    item_id: z.string(),
    quantity: z.number().int().positive(),
    selected_customizations: cart_customizations_schema,
});
const cart_update_input_schema = z.object({
    quantity: z.number().int().positive(),
});
const checkout_validate_input_schema = z.object({
    order_type: z.enum(['collection', 'delivery']),
    collection_time_slot: z.string().nullable().optional(),
    delivery_address_id: z.string().nullable().optional(),
    discount_code: z.string().nullable().optional(),
});
const checkout_create_order_input_schema = z.object({
    order_type: z.enum(['collection', 'delivery']),
    collection_time_slot: z.string().nullable().optional(),
    delivery_address_id: z.string().nullable().optional(),
    discount_code: z.string().nullable().optional(),
    special_instructions: z.string().max(1000).nullable().optional(),
    customer_name: z.string().min(1).max(100),
    customer_email: z.string().email().max(255),
    customer_phone: z.string().min(10).max(20),
    payment_method_id: z.string().nullable().optional(),
    cvv: z.string().regex(/^\d{3,4}$/).optional(),
    idempotency_key: z.string().min(6).optional(),
});
const admin_delivery_settings_update_schema = z.object({
    delivery_enabled: z.boolean().optional(),
    minimum_order_delivery: z.number().nonnegative().optional(),
    free_delivery_threshold: z.number().nonnegative().nullable().optional(),
    order_prep_time_delivery: z.number().int().positive().optional(),
    zones: z
        .array(z.object({
        zone_id: z.string().optional(),
        zone_name: z.string().min(1),
        zone_type: z.enum(['polygon', 'radius', 'postal_code']),
        zone_boundaries: z.record(z.unknown()),
        delivery_fee: z.number().nonnegative(),
        minimum_order_value: z.number().nonnegative().nullable().optional(),
        estimated_delivery_time: z.number().int().positive(),
        is_active: z.boolean().default(true),
        priority: z.number().int().nonnegative().default(0),
    }))
        .optional(),
});
const admin_stock_update_schema = z.object({
    change_type: z.enum(['restock', 'adjustment', 'waste', 'sale']),
    quantity: z.number().int(),
    reason: z.string().max(255).nullable().optional(),
    notes: z.string().max(500).nullable().optional(),
});
const admin_order_refund_schema = z.object({
    refund_amount: z.number().nonnegative(),
    refund_reason: z.string().max(500).nullable().optional(),
});
const admin_order_cancel_schema = z.object({
    cancellation_reason: z.string().max(500),
    issue_refund: z.boolean().default(false),
    refund_amount: z.number().nonnegative().nullable().optional(),
    refund_reason: z.string().max(500).nullable().optional(),
});
const admin_customers_points_schema = z.object({
    action: z.enum(['add', 'deduct']),
    points: z.number().int().positive(),
    reason: z.string().max(255),
});
const profile_password_change_schema = z.object({
    current_password: z.string().min(1),
    new_password: z.string().min(8).max(100),
});
const profile_delete_schema = z.object({
    password: z.string().min(1),
});
const order_cancel_schema = z.object({
    cancellation_reason: z.string().max(500).optional().nullable(),
});
/**
 * Fetch menu items with optional filters; used by both customer and admin listing.
 */
async function fetch_menu_items({ for_admin = false, search }) {
    const where = [];
    const params = [];
    // Normalize aliases from frontend
    const normalized_search = {
        ...search,
        category_id: search.category_id || search.category,
        query: search.query || search.search,
        dietary_tags: search.dietary_tags || (search.dietary_filters ? (Array.isArray(search.dietary_filters) ? search.dietary_filters : [search.dietary_filters]) : undefined),
    };
    if (!for_admin) {
        where.push('mi.is_active = true');
    }
    else if (normalized_search.is_active !== undefined) {
        params.push(normalized_search.is_active);
        where.push(`mi.is_active = $${params.length}`);
    }
    if (normalized_search.category_id) {
        params.push(normalized_search.category_id);
        where.push(`mi.category_id = $${params.length}`);
    }
    if (normalized_search.is_featured !== undefined) {
        params.push(normalized_search.is_featured);
        where.push(`mi.is_featured = $${params.length}`);
    }
    if (normalized_search.is_limited_edition !== undefined) {
        params.push(normalized_search.is_limited_edition);
        where.push(`mi.is_limited_edition = $${params.length}`);
    }
    if (normalized_search.available_for_collection !== undefined) {
        params.push(normalized_search.available_for_collection);
        where.push(`mi.available_for_collection = $${params.length}`);
    }
    if (normalized_search.available_for_delivery !== undefined) {
        params.push(normalized_search.available_for_delivery);
        where.push(`mi.available_for_delivery = $${params.length}`);
    }
    if (normalized_search.min_price !== undefined) {
        params.push(normalized_search.min_price);
        where.push(`mi.price >= $${params.length}`);
    }
    if (normalized_search.max_price !== undefined) {
        params.push(normalized_search.max_price);
        where.push(`mi.price <= $${params.length}`);
    }
    if (normalized_search.in_stock === true) {
        where.push('(mi.stock_tracked = false OR (mi.current_stock IS NOT NULL AND mi.current_stock > 0))');
    }
    // Improved search with relevance
    let search_order_clause = '';
    if (normalized_search.query) {
        params.push(`%${normalized_search.query}%`);
        const search_param_idx = params.length;
        where.push(`(mi.name ILIKE $${search_param_idx} OR mi.description ILIKE $${search_param_idx})`);
    }
    if (normalized_search.dietary_tags && Array.isArray(normalized_search.dietary_tags) && normalized_search.dietary_tags.length > 0) {
        params.push(JSON.stringify(normalized_search.dietary_tags));
        where.push(`(mi.dietary_tags @> $${params.length}::jsonb)`);
    }
    const sort_by_map = {
        name: 'mi.name',
        price: 'mi.price',
        sort_order: 'mi.sort_order',
        created_at: 'mi.created_at',
    };
    const sort_by = sort_by_map[normalized_search.sort_by] || 'mi.sort_order';
    const sort_order = normalized_search.sort_order === 'desc' ? 'DESC' : 'ASC';
    const where_sql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const count_res = await pool.query(`SELECT COUNT(*)::int as count
     FROM menu_items mi
     ${where_sql}`, params);
    // Add search relevance ordering params after count query
    if (normalized_search.query) {
        params.push(normalized_search.query.toLowerCase());
        const exact_param_idx = params.length;
        search_order_clause = `, 
      CASE 
        WHEN LOWER(mi.name) = $${exact_param_idx} THEN 1
        WHEN LOWER(mi.name) LIKE $${exact_param_idx} || '%' THEN 2
        WHEN LOWER(mi.name) LIKE '%' || $${exact_param_idx} || '%' THEN 3
        ELSE 4
      END`;
    }
    params.push(normalized_search.limit);
    params.push(normalized_search.offset);
    const order_clause = normalized_search.query
        ? `ORDER BY ${search_order_clause.substring(2)}, ${sort_by} ${sort_order}, mi.name ASC`
        : `ORDER BY ${sort_by} ${sort_order}, mi.name ASC`;
    const rows_res = await pool.query(`SELECT mi.*, c.name as category_name, c.sort_order as category_sort_order
     FROM menu_items mi
     JOIN categories c ON mi.category_id = c.category_id
     ${where_sql}
     ${order_clause}
     LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
    const items = rows_res.rows.map((r) => menuItemSchema.parse(coerce_numbers({
        ...r,
        price: Number(r.price),
        image_urls: r.image_urls ?? null,
        dietary_tags: r.dietary_tags ?? null,
    }, ['price', 'current_stock', 'low_stock_threshold', 'sort_order'])));
    return { items, total: count_res.rows[0]?.count ?? 0 };
}
/**
 * Fetch customization groups and options for a set of item_ids.
 */
async function fetch_customizations_for_items(item_ids) {
    if (!item_ids || item_ids.length === 0)
        return new Map();
    const res = await pool.query(`SELECT
        cg.group_id,
        cg.item_id,
        cg.name,
        cg.type,
        cg.is_required,
        cg.sort_order,
        co.option_id,
        co.name as option_name,
        co.additional_price,
        co.is_default,
        co.sort_order as option_sort_order
     FROM customization_groups cg
     LEFT JOIN customization_options co ON cg.group_id = co.group_id
     WHERE cg.item_id = ANY($1)
     ORDER BY cg.item_id ASC, cg.sort_order ASC, co.sort_order ASC`, [item_ids]);
    const map = new Map();
    for (const row of res.rows) {
        const item_id = row.item_id;
        if (!map.has(item_id))
            map.set(item_id, []);
        let groups = map.get(item_id);
        let group = groups.find((g) => g.group_id === row.group_id);
        if (!group) {
            group = {
                group_id: row.group_id,
                item_id: row.item_id,
                name: row.name,
                type: row.type,
                is_required: row.is_required,
                sort_order: row.sort_order,
                options: [],
            };
            groups.push(group);
        }
        if (row.option_id) {
            group.options.push({
                option_id: row.option_id,
                name: row.option_name,
                additional_price: Number(row.additional_price ?? 0),
                is_default: row.is_default,
                sort_order: row.option_sort_order,
            });
        }
    }
    return map;
}
/**
 * Validate and compute a discount for a given order_value and order_type.
 * Returns { valid, code_row, discount_amount, delivery_fee_override }.
 */
async function validate_discount_code({ code, user_id, order_type, order_value }) {
    const code_upper = ensure_upper(code);
    const now = now_iso();
    // First check if code exists at all
    const check_res = await pool.query(`SELECT * FROM discount_codes WHERE code = $1`, [code_upper]);
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
    // Now get the valid code
    const res = await pool.query(`SELECT * FROM discount_codes
     WHERE code = $1
       AND status = 'active'
       AND valid_from <= $2
       AND (valid_until IS NULL OR valid_until >= $2)`, [code_upper, now]);
    if (res.rows.length === 0) {
        return { valid: false, error: 'INVALID_CODE', message: 'Invalid discount code' };
    }
    const row = coerce_numbers(res.rows[0], ['discount_value', 'minimum_order_value']);
    // Order type restriction.
    if (row.applicable_order_types && Array.isArray(row.applicable_order_types)) {
        if (!row.applicable_order_types.includes(order_type)) {
            return { valid: false, error: 'NOT_APPLICABLE', message: 'Code not applicable to this order type' };
        }
    }
    // Minimum order value.
    if (row.minimum_order_value !== null && row.minimum_order_value !== undefined) {
        if (Number(order_value) < Number(row.minimum_order_value)) {
            return { valid: false, error: 'MINIMUM_NOT_MET', message: `Minimum order €${Number(row.minimum_order_value).toFixed(2)} not met` };
        }
    }
    // Usage limits.
    if (row.total_usage_limit !== null && row.total_usage_limit !== undefined) {
        if (row.total_used_count >= row.total_usage_limit) {
            return { valid: false, error: 'USAGE_LIMIT_REACHED', message: 'Code usage limit reached' };
        }
    }
    if (row.per_customer_usage_limit !== null && row.per_customer_usage_limit !== undefined) {
        const usage_res = await pool.query('SELECT COUNT(*)::int as count FROM discount_usage WHERE code_id = $1 AND user_id = $2', [row.code_id, user_id]);
        const used_by_user = usage_res.rows[0]?.count ?? 0;
        if (used_by_user >= row.per_customer_usage_limit) {
            return { valid: false, error: 'CUSTOMER_LIMIT_REACHED', message: 'Code already used by this customer' };
        }
    }
    // Discount computation.
    let discount_amount = 0;
    let delivery_fee_override = null;
    if (row.discount_type === 'percentage') {
        discount_amount = Number(order_value) * (Number(row.discount_value) / 100);
    }
    else if (row.discount_type === 'fixed') {
        discount_amount = Math.min(Number(row.discount_value), Number(order_value));
    }
    else if (row.discount_type === 'delivery_fee') {
        // treated as free delivery.
        delivery_fee_override = 0;
    }
    // Clamp.
    discount_amount = Number(discount_amount.toFixed(2));
    return { valid: true, code_row: row, discount_amount, delivery_fee_override };
}
/**
 * Compute totals from a cart stored in local storage, validating items + stock.
 */
async function compute_cart_totals({ user_id, cart, order_type, delivery_address_id, discount_code }) {
    const item_ids = cart.items.map((i) => i.item_id);
    if (item_ids.length === 0) {
        return {
            items: [],
            subtotal: 0,
            discount_code: discount_code ?? null,
            discount_amount: 0,
            delivery_fee: 0,
            tax_amount: 0,
            total: 0,
            validation_errors: [],
            delivery_zone: null,
            tax_rate: 0,
        };
    }
    const items_res = await pool.query(`SELECT item_id, name, price, image_url, stock_tracked, current_stock, is_active, low_stock_threshold, category_id
     FROM menu_items
     WHERE item_id = ANY($1)`, [item_ids]);
    const menu_map = new Map();
    for (const r of items_res.rows) {
        menu_map.set(r.item_id, {
            ...r,
            price: Number(r.price),
            current_stock: r.current_stock === null || r.current_stock === undefined ? null : Number(r.current_stock),
            low_stock_threshold: r.low_stock_threshold === null || r.low_stock_threshold === undefined ? null : Number(r.low_stock_threshold),
        });
    }
    const validation_errors = [];
    const computed_items = [];
    let subtotal = 0;
    // Collect all customization option IDs from all cart items for batch query
    const all_option_ids = [];
    for (const cart_item of cart.items) {
        const selected = cart_item.selected_customizations || null;
        if (selected && typeof selected === 'object') {
            for (const v of Object.values(selected)) {
                if (typeof v === 'string') {
                    all_option_ids.push(v);
                }
                else if (Array.isArray(v)) {
                    for (const sub of v) {
                        if (typeof sub === 'string')
                            all_option_ids.push(sub);
                        else if (sub && typeof sub === 'object' && sub.option_id)
                            all_option_ids.push(sub.option_id);
                    }
                }
            }
        }
    }
    // Batch query all customization options at once
    const options_map = new Map();
    if (all_option_ids.length > 0) {
        const unique_option_ids = [...new Set(all_option_ids)];
        const options_res = await pool.query(`SELECT co.option_id, co.additional_price
       FROM customization_options co
       WHERE co.option_id = ANY($1)`, [unique_option_ids]);
        for (const o of options_res.rows) {
            options_map.set(o.option_id, Number(o.additional_price ?? 0));
        }
    }
    // Now process each cart item
    for (const cart_item of cart.items) {
        const menu_item = menu_map.get(cart_item.item_id);
        if (!menu_item || !menu_item.is_active) {
            validation_errors.push({ field: cart_item.item_id, error: 'ITEM_UNAVAILABLE', message: 'Item no longer available' });
            // Still include the item in computed_items so frontend can display it
            computed_items.push({
                cart_item_id: cart_item.cart_item_id,
                item_id: cart_item.item_id,
                item_name: menu_item?.name || 'Unavailable Item',
                image_url: menu_item?.image_url ?? null,
                quantity: cart_item.quantity,
                unit_price: 0,
                selected_customizations: cart_item.selected_customizations || null,
                line_total: 0,
                stock_tracked: false,
                current_stock: null,
                low_stock_threshold: null,
                category_id: menu_item?.category_id ?? null,
                is_available: false,
            });
            continue;
        }
        if (menu_item.stock_tracked && (menu_item.current_stock ?? 0) < cart_item.quantity) {
            validation_errors.push({ field: cart_item.item_id, error: 'INSUFFICIENT_STOCK', message: `Only ${menu_item.current_stock ?? 0} available` });
            // Still include the item in computed_items so frontend can display it
            computed_items.push({
                cart_item_id: cart_item.cart_item_id,
                item_id: cart_item.item_id,
                item_name: menu_item.name,
                image_url: menu_item.image_url ?? null,
                quantity: cart_item.quantity,
                unit_price: Number(menu_item.price),
                selected_customizations: cart_item.selected_customizations || null,
                line_total: 0,
                stock_tracked: menu_item.stock_tracked,
                current_stock: menu_item.current_stock,
                low_stock_threshold: menu_item.low_stock_threshold,
                category_id: menu_item.category_id,
                is_available: false,
            });
            continue;
        }
        // Customizations are stored as snapshot; to keep UX consistent we assume unit_price is base price.
        let unit_price = Number(menu_item.price);
        let customizations_total = 0;
        // Calculate customization prices using the pre-fetched options_map
        const selected = cart_item.selected_customizations || null;
        if (selected && typeof selected === 'object') {
            for (const v of Object.values(selected)) {
                if (typeof v === 'string') {
                    customizations_total += options_map.get(v) ?? 0;
                }
                else if (Array.isArray(v)) {
                    for (const sub of v) {
                        if (typeof sub === 'string') {
                            customizations_total += options_map.get(sub) ?? 0;
                        }
                        else if (sub && typeof sub === 'object' && sub.option_id) {
                            customizations_total += options_map.get(sub.option_id) ?? 0;
                        }
                    }
                }
            }
        }
        unit_price = Number((unit_price + customizations_total).toFixed(2));
        const line_total = Number((unit_price * cart_item.quantity).toFixed(2));
        subtotal += line_total;
        computed_items.push({
            cart_item_id: cart_item.cart_item_id,
            item_id: menu_item.item_id,
            item_name: menu_item.name,
            image_url: menu_item.image_url ?? null,
            quantity: cart_item.quantity,
            unit_price,
            selected_customizations: selected,
            line_total,
            stock_tracked: menu_item.stock_tracked,
            current_stock: menu_item.current_stock,
            low_stock_threshold: menu_item.low_stock_threshold,
            category_id: menu_item.category_id,
            is_available: true,
        });
    }
    subtotal = Number(subtotal.toFixed(2));
    // Delivery fee.
    let delivery_fee = 0;
    let delivery_zone = null;
    let estimated_delivery_time = null;
    if (order_type === 'delivery') {
        if (!delivery_address_id) {
            validation_errors.push({ field: 'delivery_address_id', error: 'REQUIRED', message: 'Delivery address is required' });
        }
        else {
            const addr_res = await pool.query('SELECT * FROM addresses WHERE address_id = $1 AND user_id = $2', [delivery_address_id, user_id]);
            if (addr_res.rows.length === 0) {
                validation_errors.push({ field: 'delivery_address_id', error: 'NOT_FOUND', message: 'Address not found' });
            }
            else {
                const addr = addr_res.rows[0];
                const lat = addr.latitude === null || addr.latitude === undefined ? null : Number(addr.latitude);
                const lng = addr.longitude === null || addr.longitude === undefined ? null : Number(addr.longitude);
                if (lat === null || lng === null) {
                    validation_errors.push({ field: 'delivery_address_id', error: 'NO_GEO', message: 'Address is missing coordinates' });
                }
                else {
                    delivery_zone = await find_delivery_zone(lat, lng);
                    const global_delivery_enabled = await get_setting('delivery_enabled', true);
                    if (global_delivery_enabled === false) {
                        validation_errors.push({ field: 'order_type', error: 'DELIVERY_DISABLED', message: 'Delivery is currently unavailable' });
                    }
                    else if (!delivery_zone) {
                        validation_errors.push({ field: 'delivery_address_id', error: 'ADDRESS_OUT_OF_RANGE', message: "Sorry, we don't deliver to this location yet." });
                    }
                    else {
                        const global_moq = await get_setting('minimum_order_delivery', 0);
                        const zone_moq = delivery_zone.minimum_order_value ?? null;
                        const min_required = zone_moq !== null ? Number(zone_moq) : Number(global_moq ?? 0);
                        if (subtotal < min_required) {
                            validation_errors.push({
                                field: 'minimum_order_value',
                                error: 'MOQ_NOT_MET',
                                message: `Minimum order value for delivery is €${min_required.toFixed(2)}. Add €${(min_required - subtotal).toFixed(2)} more to qualify.`,
                            });
                        }
                        delivery_fee = Number(delivery_zone.delivery_fee ?? 0);
                        estimated_delivery_time = `${delivery_zone.estimated_delivery_time} minutes`;
                    }
                }
            }
        }
    }
    // Discount.
    let discount_amount = 0;
    let applied_discount_code = discount_code ?? null;
    if (applied_discount_code) {
        const discount_res = await validate_discount_code({
            code: applied_discount_code,
            user_id,
            order_type,
            order_value: subtotal,
        });
        if (!discount_res.valid) {
            validation_errors.push({ field: 'discount_code', error: discount_res.error, message: discount_res.message });
            applied_discount_code = null;
            discount_amount = 0;
        }
        else {
            discount_amount = discount_res.discount_amount;
            if (discount_res.delivery_fee_override !== null && discount_res.delivery_fee_override !== undefined) {
                delivery_fee = Number(discount_res.delivery_fee_override);
            }
        }
    }
    const tax_rate_setting = await get_setting('tax_rate', 0);
    const tax_rate = typeof tax_rate_setting === 'number' ? tax_rate_setting : Number(tax_rate_setting ?? 0);
    const taxable_base = subtotal - discount_amount + delivery_fee;
    const tax_amount = Number((taxable_base * tax_rate).toFixed(2));
    const total = Number((taxable_base + tax_amount).toFixed(2));
    return {
        items: computed_items,
        subtotal,
        discount_code: applied_discount_code,
        discount_amount: Number(discount_amount.toFixed(2)),
        delivery_fee: Number(delivery_fee.toFixed(2)),
        tax_amount,
        total,
        validation_errors,
        delivery_zone,
        estimated_delivery_time,
        tax_rate,
    };
}
/**
 * Emit order status updates to staff + the customer room.
 */
function emit_order_status_updated({ order_id, order_number, user_id, old_status, new_status, changed_by_user }) {
    const staff_payload = {
        order_id,
        order_number,
        old_status,
        new_status,
        changed_by: {
            user_id: changed_by_user.user_id,
            name: `${changed_by_user.first_name} ${changed_by_user.last_name}`,
            role: changed_by_user.role,
        },
        changed_at: now_iso(),
    };
    io.to('staff').emit('order_status_updated', { event: 'order_status_updated', data: staff_payload, timestamp: now_iso() });
    const customer_payload = {
        order_id,
        order_number,
        new_status,
        message: new_status === 'preparing'
            ? 'Your order is being prepared.'
            : new_status === 'ready'
                ? 'Your order is ready for collection.'
                : new_status === 'out_for_delivery'
                    ? 'Your order is out for delivery.'
                    : new_status === 'completed'
                        ? 'Order completed. Enjoy!'
                        : 'Order status updated.',
    };
    io.to(`customer_${user_id}`).emit('order_status_updated', { event: 'order_status_updated', data: customer_payload, timestamp: now_iso() });
}
/**
 * Emit low stock alert when needed.
 */
async function maybe_emit_low_stock(item_id) {
    const res = await pool.query(`SELECT item_id, name, category_id, stock_tracked, current_stock, low_stock_threshold
     FROM menu_items WHERE item_id = $1`, [item_id]);
    if (res.rows.length === 0)
        return;
    const item = res.rows[0];
    if (!item.stock_tracked)
        return;
    const current_stock = item.current_stock === null || item.current_stock === undefined ? 0 : Number(item.current_stock);
    const threshold = item.low_stock_threshold === null || item.low_stock_threshold === undefined ? null : Number(item.low_stock_threshold);
    if (threshold === null)
        return;
    if (current_stock <= threshold) {
        const status = current_stock === 0 ? 'out_of_stock' : 'low_stock';
        const payload = {
            item_id: item.item_id,
            item_name: item.name,
            category_id: item.category_id,
            current_stock,
            low_stock_threshold: threshold,
            status,
        };
        io.to('admin').emit('low_stock_alert', { event: 'low_stock_alert', data: payload, timestamp: now_iso() });
        io.to('staff_with_stock_view').emit('low_stock_alert', { event: 'low_stock_alert', data: payload, timestamp: now_iso() });
    }
}
/**
 * Generate and persist a simple invoice PDF to local storage.
 */
async function generate_invoice_pdf({ invoice_id }) {
    const invoice_res = await pool.query('SELECT * FROM invoices WHERE invoice_id = $1', [invoice_id]);
    if (invoice_res.rows.length === 0)
        return null;
    const inv_row = coerce_numbers(invoice_res.rows[0], ['subtotal', 'discount_amount', 'delivery_fee', 'tax_amount', 'grand_total']);
    const invoice = invoiceSchema.parse({
        ...inv_row,
        line_items: inv_row.line_items ?? [],
        customer_address: inv_row.customer_address ?? null,
        payment_method: inv_row.payment_method ?? null,
        sumup_transaction_id: inv_row.sumup_transaction_id ?? null,
        due_date: inv_row.due_date ?? null,
        paid_at: inv_row.paid_at ?? null,
        invoice_pdf_url: inv_row.invoice_pdf_url ?? null,
        notes: inv_row.notes ?? null,
    });
    const file_name = `${invoice.invoice_number}.pdf`;
    const file_path = path.join(storage_invoices_dir, file_name);
    await new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const ws = fs.createWriteStream(file_path);
        doc.pipe(ws);
        doc.fontSize(18).text('Salama Lama Food Truck', { align: 'left' });
        doc.moveDown(0.5);
        doc.fontSize(12).text(`Invoice: ${invoice.invoice_number}`);
        doc.text(`Issue Date: ${invoice.issue_date}`);
        if (invoice.due_date)
            doc.text(`Due Date: ${invoice.due_date}`);
        doc.moveDown(1);
        doc.fontSize(12).text('Bill To:', { underline: true });
        doc.text(invoice.customer_name);
        doc.text(invoice.customer_email);
        doc.text(invoice.customer_phone);
        if (invoice.customer_address)
            doc.text(invoice.customer_address);
        doc.moveDown(1);
        doc.fontSize(12).text('Line Items:', { underline: true });
        const items = invoice.line_items || [];
        for (const li of items) {
            const item = li.item ?? li.name ?? 'Item';
            const qty = li.quantity ?? 1;
            const unit_price = li.unit_price ?? 0;
            const total = li.total ?? 0;
            doc.text(`${qty} x ${item} @ €${Number(unit_price).toFixed(2)} = €${Number(total).toFixed(2)}`);
        }
        doc.moveDown(1);
        doc.text(`Subtotal: €${Number(invoice.subtotal).toFixed(2)}`);
        doc.text(`Discount: -€${Number(invoice.discount_amount).toFixed(2)}`);
        if (invoice.delivery_fee !== null && invoice.delivery_fee !== undefined)
            doc.text(`Delivery: €${Number(invoice.delivery_fee).toFixed(2)}`);
        doc.text(`Tax: €${Number(invoice.tax_amount).toFixed(2)}`);
        doc.fontSize(14).text(`Grand Total: €${Number(invoice.grand_total).toFixed(2)}`, { underline: true });
        doc.end();
        ws.on('finish', () => resolve(undefined));
        ws.on('error', (err) => reject(err));
    });
    const public_url = `/storage/invoices/${encodeURIComponent(file_name)}`;
    await pool.query('UPDATE invoices SET invoice_pdf_url = $1, updated_at = $2 WHERE invoice_id = $3', [public_url, now_iso(), invoice_id]);
    return public_url;
}
/**
 * Generate and persist a simple catering quote PDF.
 */
async function generate_quote_pdf({ quote_id }) {
    const q_res = await pool.query('SELECT * FROM catering_quotes WHERE quote_id = $1', [quote_id]);
    if (q_res.rows.length === 0)
        return null;
    const row = coerce_numbers(q_res.rows[0], ['subtotal', 'tax_amount', 'grand_total']);
    const quote = cateringQuoteSchema.parse({
        ...row,
        line_items: row.line_items ?? [],
        additional_fees: row.additional_fees ?? null,
        terms: row.terms ?? null,
        quote_pdf_url: row.quote_pdf_url ?? null,
        sent_at: row.sent_at ?? null,
        accepted_at: row.accepted_at ?? null,
    });
    const file_name = `${quote.quote_number}.pdf`;
    const file_path = path.join(storage_quotes_dir, file_name);
    await new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const ws = fs.createWriteStream(file_path);
        doc.pipe(ws);
        doc.fontSize(18).text('Salama Lama Catering Quote', { align: 'left' });
        doc.moveDown(0.5);
        doc.fontSize(12).text(`Quote: ${quote.quote_number}`);
        doc.text(`Valid Until: ${quote.valid_until}`);
        doc.moveDown(1);
        doc.fontSize(12).text('Line Items:', { underline: true });
        for (const li of quote.line_items) {
            doc.text(`${li.quantity} x ${li.item} @ €${Number(li.unit_price).toFixed(2)} = €${Number(li.total).toFixed(2)}`);
        }
        doc.moveDown(1);
        doc.text(`Subtotal: €${Number(quote.subtotal).toFixed(2)}`);
        if (quote.additional_fees && Array.isArray(quote.additional_fees)) {
            for (const f of quote.additional_fees) {
                doc.text(`${f.name}: €${Number(f.amount).toFixed(2)}`);
            }
        }
        doc.text(`Tax: €${Number(quote.tax_amount).toFixed(2)}`);
        doc.fontSize(14).text(`Grand Total: €${Number(quote.grand_total).toFixed(2)}`, { underline: true });
        if (quote.terms) {
            doc.moveDown(1);
            doc.fontSize(12).text('Terms:', { underline: true });
            doc.text(String(quote.terms));
        }
        doc.end();
        ws.on('finish', () => resolve(undefined));
        ws.on('error', (err) => reject(err));
    });
    const public_url = `/storage/quotes/${encodeURIComponent(file_name)}`;
    await pool.query('UPDATE catering_quotes SET quote_pdf_url = $1, created_at = created_at WHERE quote_id = $2', [public_url, quote_id]);
    return public_url;
}
/**
 * Socket.IO authentication and room assignment.
 * We accept token via handshake.auth.token.
 */
io.use(async (socket, next) => {
    try {
        const token = socket.handshake?.auth?.token || null;
        if (!token)
            return next(new Error('AUTH_TOKEN_REQUIRED'));
        const decoded = jwt.verify(token, JWT_SECRET);
        const result = await pool.query('SELECT user_id, email, first_name, last_name, role, status, last_login_at, staff_permissions FROM users WHERE user_id = $1', [decoded.user_id]);
        if (result.rows.length === 0)
            return next(new Error('AUTH_TOKEN_INVALID'));
        const user = result.rows[0];
        if (user.status !== 'active')
            return next(new Error('AUTH_ACCOUNT_INACTIVE'));
        if ((user.role === 'staff' || user.role === 'admin') && decoded.login_at) {
            if ((user.last_login_at || null) !== decoded.login_at)
                return next(new Error('AUTH_SESSION_SUPERSEDED'));
        }
        socket.user = {
            user_id: user.user_id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            role: user.role,
            staff_permissions: user.staff_permissions,
        };
        next();
    }
    catch (e) {
        next(new Error('AUTH_TOKEN_INVALID'));
    }
});
io.on('connection', (socket) => {
    const { user_id, role } = socket.user || {};
    // Default rooms by role.
    if (role === 'admin') {
        socket.join('admin');
        socket.join('staff');
    }
    else if (role === 'staff') {
        socket.join('staff');
        if (socket.user.staff_permissions?.view_stock)
            socket.join('staff_with_stock_view');
    }
    else if (role === 'customer') {
        socket.join(`customer_${user_id}`);
    }
    /*
      Support explicit room-join messages from client.
      This aligns with the async events spec while keeping server authoritative.
    */
    socket.on('join_staff_room', () => {
        if (role === 'admin' || role === 'staff')
            socket.join('staff');
    });
    socket.on('join_admin_room', () => {
        if (role === 'admin')
            socket.join('admin');
    });
    socket.on('disconnect', () => {
        // No-op; client can handle disconnection UI.
    });
});
/**
 * AUTH ROUTES
 */
/*
  Register a customer.
  - Plain-text password storage required (dev/testing).
  - Creates loyalty account.
  - Generates referral_code and first order discount code.
  - Creates email verification token.
  - Returns JWT token.
*/
app.post('/api/auth/register', async (req, res) => {
    try {
        const input = createUserInputSchema.parse(req.body);
        if (input.role !== 'customer') {
            return res.status(400).json(createErrorResponse('Only customer registration is allowed on this endpoint', null, 'REGISTRATION_ROLE_NOT_ALLOWED', req.request_id));
        }
        // Basic password policy (min 8 already enforced by schema).
        if (!/[A-Za-z]/.test(input.password) || !/\d/.test(input.password)) {
            return res.status(400).json(createErrorResponse('Password must include at least one letter and one number', null, 'PASSWORD_WEAK', req.request_id));
        }
        const email = input.email.toLowerCase().trim();
        const phone = input.phone.trim();
        const referred_by_user_id = input.referred_by_user_id ?? null;
        const user_id = gen_id('user');
        const created_at = now_iso();
        // Create per-user referral code (simple and readable; ensure uniqueness).
        let referral_code = `${input.first_name}`.replace(/\s+/g, '').slice(0, 6).toUpperCase();
        referral_code = `${referral_code}${String(Math.floor(Math.random() * 9000) + 1000)}`;
        await with_client(async (client) => {
            await client.query('BEGIN');
            // Uniqueness checks for better UX.
            const existing_email = await client.query('SELECT user_id FROM users WHERE email = $1', [email]);
            if (existing_email.rows.length > 0) {
                await client.query('ROLLBACK');
                return res.status(409).json(createErrorResponse('Email already registered', null, 'EMAIL_ALREADY_EXISTS', req.request_id, { field: 'email' }));
            }
            const existing_phone = await client.query('SELECT user_id FROM users WHERE phone = $1', [phone]);
            if (existing_phone.rows.length > 0) {
                await client.query('ROLLBACK');
                return res.status(409).json(createErrorResponse('Phone already registered', null, 'PHONE_ALREADY_EXISTS', req.request_id, { field: 'phone' }));
            }
            // Ensure referral_code uniqueness.
            for (let attempt = 0; attempt < 5; attempt++) {
                const check_ref = await client.query('SELECT user_id FROM users WHERE referral_code = $1', [referral_code]);
                if (check_ref.rows.length === 0)
                    break;
                referral_code = `${referral_code.slice(0, 6)}${String(Math.floor(Math.random() * 9000) + 1000)}`;
            }
            await client.query(`INSERT INTO users (
          user_id, email, phone, password_hash, first_name, last_name,
          role, profile_photo_url, email_verified, status, created_at,
          last_login_at, marketing_opt_in, order_notifications_email,
          order_notifications_sms, marketing_emails, marketing_sms,
          newsletter_subscribed, dietary_preferences, first_order_discount_code,
          first_order_discount_used, referral_code, referred_by_user_id, staff_permissions
        ) VALUES (
          $1,$2,$3,$4,$5,$6,
          $7,$8,$9,$10,$11,
          $12,$13,$14,
          $15,$16,$17,
          $18,$19,$20,
          $21,$22,$23,$24
        )`, [
                user_id,
                email,
                phone,
                input.password,
                input.first_name.trim(),
                input.last_name.trim(),
                'customer',
                input.profile_photo_url ?? null,
                false,
                'active',
                created_at,
                null,
                input.marketing_opt_in ?? false,
                input.order_notifications_email ?? true,
                input.order_notifications_sms ?? false,
                input.marketing_emails ?? false,
                input.marketing_sms ?? false,
                input.newsletter_subscribed ?? false,
                input.dietary_preferences ?? null,
                null,
                false,
                referral_code,
                referred_by_user_id,
                null,
            ]);
            // Create loyalty account.
            const loyalty_account_id = gen_id('la');
            await client.query(`INSERT INTO loyalty_accounts (
          loyalty_account_id, user_id, current_points_balance,
          total_points_earned, total_points_redeemed, total_points_expired,
          referral_count, spin_wheel_available_count, next_spin_available_at, created_at
        ) VALUES ($1,$2,0,0,0,0,0,0,NULL,$3)`, [loyalty_account_id, user_id, created_at]);
            // First-order discount auto-generation.
            const first_order_pct = await get_setting('first_order_discount_percentage', 10);
            const validity_days = await get_setting('first_order_discount_validity_days', 30);
            const pct = Number(first_order_pct ?? 10);
            const valid_until = new Date(Date.now() + Number(validity_days ?? 30) * 86400000).toISOString();
            // Generate unique discount code with retry logic
            let discount_code = `FIRST${pct}-${user_id.slice(0, 6).toUpperCase()}`;
            let code_id = gen_id('dc');
            // Check if code already exists and add suffix if needed
            for (let attempt = 0; attempt < 10; attempt++) {
                const existing_code = await client.query('SELECT code_id FROM discount_codes WHERE code = $1', [discount_code]);
                if (existing_code.rows.length === 0)
                    break;
                // Add random suffix to make it unique
                discount_code = `FIRST${pct}-${user_id.slice(0, 6).toUpperCase()}-${String(Math.floor(Math.random() * 900) + 100)}`;
                code_id = gen_id('dc');
            }
            await client.query(`INSERT INTO discount_codes (
          code_id, code, discount_type, discount_value,
          applicable_order_types, applicable_category_ids, applicable_item_ids,
          minimum_order_value, total_usage_limit, per_customer_usage_limit,
          total_used_count, valid_from, valid_until, status,
          internal_notes, created_at, updated_at
        ) VALUES ($1,$2,'percentage',$3,$4::jsonb,NULL,NULL,NULL,NULL,1,0,$5,$6,'active',$7,$8,$9)`, [
                code_id,
                discount_code,
                pct,
                JSON.stringify(['collection', 'delivery']),
                created_at,
                valid_until,
                'Auto-generated first-order discount',
                created_at,
                created_at,
            ]);
            await client.query('UPDATE users SET first_order_discount_code = $1 WHERE user_id = $2', [discount_code, user_id]);
            // Email verification token.
            const verification_id = gen_id('ver');
            const verification_token = nanoid(64);
            const expires_at = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
            await client.query(`INSERT INTO email_verifications (verification_id, user_id, verification_token, created_at, expires_at, verified_at)
         VALUES ($1,$2,$3,$4,$5,NULL)`, [verification_id, user_id, verification_token, created_at, expires_at]);
            // Referral count increment for referrer (simple implementation).
            if (referred_by_user_id) {
                await client.query('UPDATE loyalty_accounts SET referral_count = referral_count + 1 WHERE user_id = $1', [referred_by_user_id]);
            }
            await client.query('COMMIT');
            // Send verification email asynchronously (mocked).
            send_email_mock({
                to: email,
                subject: 'Verify your Salama Lama account',
                body: `Welcome ${input.first_name}! Verify your email using token: ${verification_token}`,
            }).catch(() => { });
            const token = sign_token({ user_id, role: 'customer', email, remember_me: true });
            return ok(res, 201, {
                user: {
                    user_id,
                    email,
                    first_name: input.first_name.trim(),
                    last_name: input.last_name.trim(),
                    role: 'customer',
                    email_verified: false,
                    referral_code,
                },
                token,
                first_order_discount_code: discount_code,
            });
        });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        }
        console.error('register error', error);
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
/*
  Login endpoint.
  - Allows customers and can also login staff/admin; dedicated endpoints exist too.
  - Plain-text password compare.
  - Updates last_login_at; staff/admin token includes login_at for single-session enforcement.
*/
app.post('/api/auth/login', async (req, res) => {
    try {
        const login_schema = z.object({
            email: z.string().min(1),
            password: z.string().min(1),
            remember_me: z.boolean().optional().default(false),
        });
        const { email, password, remember_me } = login_schema.parse(req.body);
        const identifier = email.toLowerCase().trim();
        const user_res = await pool.query('SELECT * FROM users WHERE (email = $1 OR phone = $1) LIMIT 1', [identifier]);
        if (user_res.rows.length === 0) {
            return res.status(401).json(createErrorResponse('Invalid email or password', null, 'AUTHENTICATION_FAILED', req.request_id));
        }
        const user = user_res.rows[0];
        if (user.status !== 'active') {
            return res.status(403).json(createErrorResponse('Account is not active', null, 'AUTH_ACCOUNT_INACTIVE', req.request_id));
        }
        if (String(user.password_hash) !== String(password)) {
            return res.status(401).json(createErrorResponse('Invalid email or password', null, 'AUTHENTICATION_FAILED', req.request_id));
        }
        const login_at = now_iso();
        await pool.query('UPDATE users SET last_login_at = $1 WHERE user_id = $2', [login_at, user.user_id]);
        const token = sign_token({ user_id: user.user_id, role: user.role, email: user.email, remember_me, login_at });
        let loyalty_account = null;
        if (user.role === 'customer') {
            const la_res = await pool.query('SELECT current_points_balance, total_points_earned FROM loyalty_accounts WHERE user_id = $1', [user.user_id]);
            if (la_res.rows.length > 0) {
                loyalty_account = {
                    current_points_balance: Number(la_res.rows[0].current_points_balance),
                    total_points_earned: Number(la_res.rows[0].total_points_earned),
                };
            }
        }
        return ok(res, 200, {
            user: {
                user_id: user.user_id,
                email: user.email,
                role: user.role,
                first_name: user.first_name,
                last_name: user.last_name,
                email_verified: user.email_verified,
                loyalty_account,
            },
            token,
        });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        }
        console.error('login error', error);
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
/*
  Dedicated staff login endpoint.
  - Validates that role is staff/admin.
*/
app.post('/api/staff/login', async (req, res) => {
    try {
        const login_schema = z.object({ email: z.string().email(), password: z.string().min(1) });
        const { email, password } = login_schema.parse(req.body);
        const user_res = await pool.query('SELECT * FROM users WHERE email = $1 LIMIT 1', [email.toLowerCase().trim()]);
        if (user_res.rows.length === 0) {
            return res.status(401).json(createErrorResponse('Invalid email or password', null, 'AUTHENTICATION_FAILED', req.request_id));
        }
        const user = user_res.rows[0];
        if (user.role !== 'staff' && user.role !== 'admin') {
            return res.status(403).json(createErrorResponse('Role not allowed', null, 'AUTH_FORBIDDEN', req.request_id));
        }
        if (String(user.password_hash) !== String(password)) {
            return res.status(401).json(createErrorResponse('Invalid email or password', null, 'AUTHENTICATION_FAILED', req.request_id));
        }
        const login_at = now_iso();
        await pool.query('UPDATE users SET last_login_at = $1 WHERE user_id = $2', [login_at, user.user_id]);
        const token = sign_token({ user_id: user.user_id, role: user.role, email: user.email, remember_me: false, login_at });
        return ok(res, 200, {
            user: {
                user_id: user.user_id,
                email: user.email,
                role: user.role,
                first_name: user.first_name,
                last_name: user.last_name,
                email_verified: user.email_verified,
            },
            token,
        });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        }
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
/*
  Dedicated admin login endpoint.
*/
app.post('/api/admin/login', async (req, res) => {
    try {
        const login_schema = z.object({ email: z.string().email(), password: z.string().min(1) });
        const { email, password } = login_schema.parse(req.body);
        const user_res = await pool.query('SELECT * FROM users WHERE email = $1 LIMIT 1', [email.toLowerCase().trim()]);
        if (user_res.rows.length === 0) {
            return res.status(401).json(createErrorResponse('Invalid email or password', null, 'AUTHENTICATION_FAILED', req.request_id));
        }
        const user = user_res.rows[0];
        if (user.role !== 'admin') {
            return res.status(403).json(createErrorResponse('Role not allowed', null, 'AUTH_FORBIDDEN', req.request_id));
        }
        if (String(user.password_hash) !== String(password)) {
            return res.status(401).json(createErrorResponse('Invalid email or password', null, 'AUTHENTICATION_FAILED', req.request_id));
        }
        const login_at = now_iso();
        await pool.query('UPDATE users SET last_login_at = $1 WHERE user_id = $2', [login_at, user.user_id]);
        const token = sign_token({ user_id: user.user_id, role: user.role, email: user.email, remember_me: false, login_at });
        return ok(res, 200, {
            user: {
                user_id: user.user_id,
                email: user.email,
                role: user.role,
                first_name: user.first_name,
                last_name: user.last_name,
                email_verified: user.email_verified,
            },
            token,
        });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        }
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
/*
  Guest checkout endpoint.
  Creates a temporary guest user session without full registration.
  - Creates a minimal guest user record with isGuest flag
  - Returns JWT token same as normal login
  - Guest sessions expire after 7 days
  - Optional email can be provided
*/
app.post('/api/auth/guest', async (req, res) => {
    try {
        const schema = z.object({
            email: z.string().email().optional(),
        });
        const { email } = schema.parse(req.body);
        const user_id = gen_id('guest');
        const created_at = now_iso();
        const guest_email = email ? email.toLowerCase().trim() : `guest_${user_id}@temp.local`;
        // Create guest user record
        await pool.query(`INSERT INTO users (
        user_id, email, phone, password_hash, first_name, last_name,
        role, profile_photo_url, email_verified, status, created_at,
        last_login_at, marketing_opt_in, order_notifications_email,
        order_notifications_sms, marketing_emails, marketing_sms,
        newsletter_subscribed, dietary_preferences, first_order_discount_code,
        first_order_discount_used, referral_code, referred_by_user_id, staff_permissions
      ) VALUES (
        $1,$2,$3,$4,$5,$6,
        $7,$8,$9,$10,$11,
        $12,$13,$14,
        $15,$16,$17,
        $18,$19,$20,
        $21,$22,$23,$24
      )`, [
            user_id,
            guest_email,
            `guest_${user_id}`, // Unique phone placeholder
            '', // No password for guests
            'Guest',
            'User',
            'guest', // Special guest role
            null,
            false,
            'active',
            created_at,
            created_at,
            false,
            email ? true : false, // Only send notifications if email provided
            false,
            false,
            false,
            false,
            null,
            null,
            false,
            null,
            null,
            null,
        ]);
        // Create JWT token with 7-day expiration for guest
        const token = sign_token({
            user_id,
            role: 'guest',
            email: guest_email,
            remember_me: false
        });
        // Log guest session creation
        await pool.query('INSERT INTO activity_logs (log_id, user_id, action_type, entity_type, entity_id, description, changes, ip_address, user_agent, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10)', [
            gen_id('log'),
            user_id,
            'guest_session_created',
            'user',
            user_id,
            'Guest checkout session created',
            JSON.stringify({ email: email || null }),
            req.ip,
            req.headers['user-agent'] || null,
            created_at,
        ]);
        return ok(res, 200, {
            user: {
                user_id,
                email: guest_email,
                first_name: 'Guest',
                last_name: 'User',
                role: 'guest',
                email_verified: false,
                isGuest: true,
            },
            token,
            redirectTo: '/checkout/order-type',
        });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        }
        console.error('guest auth error', error);
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
/*
  Stateless logout.
*/
app.post('/api/auth/logout', authenticate_token, async (req, res) => {
    try {
        await pool.query('INSERT INTO activity_logs (log_id, user_id, action_type, entity_type, entity_id, description, changes, ip_address, user_agent, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10)', [
            gen_id('log'),
            req.user.user_id,
            'logout',
            'user',
            req.user.user_id,
            'User logged out',
            JSON.stringify({}),
            req.ip,
            req.headers['user-agent'] || null,
            now_iso(),
        ]);
        return ok(res, 200, { message: 'Logged out successfully' });
    }
    catch (error) {
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
/*
  Password reset request.
*/
app.post('/api/auth/password-reset-request', async (req, res) => {
    try {
        const schema = z.object({ email: z.string().min(1) });
        const { email } = schema.parse(req.body);
        const identifier = email.toLowerCase().trim();
        const user_res = await pool.query('SELECT user_id, email, first_name FROM users WHERE email = $1 LIMIT 1', [identifier]);
        if (user_res.rows.length > 0) {
            const user = user_res.rows[0];
            const reset_id = gen_id('rst');
            const reset_token = nanoid(64);
            const created_at = now_iso();
            const expires_at = new Date(Date.now() + 3600 * 1000).toISOString();
            // Invalidate old tokens.
            await pool.query('UPDATE password_resets SET used = true WHERE user_id = $1 AND used = false', [user.user_id]);
            await pool.query(`INSERT INTO password_resets (reset_id, user_id, reset_token, created_at, expires_at, used)
         VALUES ($1,$2,$3,$4,$5,false)`, [reset_id, user.user_id, reset_token, created_at, expires_at]);
            send_email_mock({
                to: user.email,
                subject: 'Reset your Salama Lama password',
                body: `Hello ${user.first_name}, your reset token is: ${reset_token} (expires in 1 hour).`,
            }).catch(() => { });
        }
        return ok(res, 200, {
            message: "If an account exists, you'll receive a reset link.",
        });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        }
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
/*
  Password reset completion.
*/
app.post('/api/auth/password-reset', async (req, res) => {
    try {
        const { reset_token, new_password } = verifyPasswordResetInputSchema.parse(req.body);
        if (!/[A-Za-z]/.test(new_password) || !/\d/.test(new_password)) {
            return res.status(400).json(createErrorResponse('Password must include at least one letter and one number', null, 'PASSWORD_WEAK', req.request_id));
        }
        await with_client(async (client) => {
            await client.query('BEGIN');
            const pr_res = await client.query(`SELECT pr.reset_id, pr.user_id, pr.expires_at, pr.used, u.email
         FROM password_resets pr
         JOIN users u ON u.user_id = pr.user_id
         WHERE pr.reset_token = $1`, [reset_token]);
            if (pr_res.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(400).json(createErrorResponse('Reset token is invalid or has expired', null, 'INVALID_TOKEN', req.request_id));
            }
            const pr = pr_res.rows[0];
            if (pr.used) {
                await client.query('ROLLBACK');
                return res.status(400).json(createErrorResponse('Reset token is invalid or has expired', null, 'INVALID_TOKEN', req.request_id));
            }
            if (String(pr.expires_at) <= now_iso()) {
                await client.query('ROLLBACK');
                return res.status(400).json(createErrorResponse('Reset token is invalid or has expired', null, 'INVALID_TOKEN', req.request_id));
            }
            await client.query('UPDATE users SET password_hash = $1 WHERE user_id = $2', [new_password, pr.user_id]);
            await client.query('UPDATE password_resets SET used = true WHERE reset_id = $1', [pr.reset_id]);
            await client.query('COMMIT');
            send_email_mock({
                to: pr.email,
                subject: 'Your Salama Lama password was changed',
                body: 'Your password has been successfully changed.',
            }).catch(() => { });
            return ok(res, 200, { message: 'Password reset successfully. Please log in with your new password.' });
        });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        }
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
/*
  Email verification.
*/
app.post('/api/auth/verify-email', async (req, res) => {
    try {
        const { verification_token } = verifyEmailInputSchema.parse(req.body);
        await with_client(async (client) => {
            await client.query('BEGIN');
            const ev_res = await client.query(`SELECT verification_id, user_id, expires_at, verified_at
         FROM email_verifications
         WHERE verification_token = $1`, [verification_token]);
            if (ev_res.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(400).json(createErrorResponse('Verification token is invalid or has expired', null, 'VERIFICATION_FAILED', req.request_id));
            }
            const ev = ev_res.rows[0];
            if (ev.verified_at) {
                await client.query('COMMIT');
                return ok(res, 200, { message: 'Email verified successfully!' });
            }
            if (String(ev.expires_at) <= now_iso()) {
                await client.query('ROLLBACK');
                return res.status(400).json(createErrorResponse('Verification token is invalid or has expired', null, 'VERIFICATION_FAILED', req.request_id));
            }
            await client.query('UPDATE users SET email_verified = true WHERE user_id = $1', [ev.user_id]);
            await client.query('UPDATE email_verifications SET verified_at = $1 WHERE verification_id = $2', [now_iso(), ev.verification_id]);
            await client.query('COMMIT');
            return ok(res, 200, { message: 'Email verified successfully!' });
        });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        }
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
/*
  Resend verification email.
*/
app.post('/api/auth/resend-verification', authenticate_token, async (req, res) => {
    try {
        if (req.user.email_verified) {
            return res.status(400).json(createErrorResponse('Email already verified', null, 'EMAIL_ALREADY_VERIFIED', req.request_id));
        }
        const created_at = now_iso();
        const expires_at = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
        const verification_token = nanoid(64);
        await with_client(async (client) => {
            await client.query('BEGIN');
            await client.query('UPDATE email_verifications SET expires_at = $1 WHERE user_id = $2 AND verified_at IS NULL', [now_iso(), req.user.user_id]);
            await client.query(`INSERT INTO email_verifications (verification_id, user_id, verification_token, created_at, expires_at, verified_at)
         VALUES ($1,$2,$3,$4,$5,NULL)`, [gen_id('ver'), req.user.user_id, verification_token, created_at, expires_at]);
            await client.query('COMMIT');
        });
        send_email_mock({
            to: req.user.email,
            subject: 'Verify your Salama Lama account',
            body: `Your new verification token is: ${verification_token}`,
        }).catch(() => { });
        return ok(res, 200, { message: 'Verification email sent successfully' });
    }
    catch (error) {
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
/**
 * BUSINESS (PUBLIC)
 */
app.get('/api/business/info', async (req, res) => {
    try {
        // Map DB seed keys to the public contract.
        const store_name = await get_setting('store_name', 'Salama Lama Food Truck');
        const store_email = await get_setting('store_email', 'hello@salamalama.ie');
        const store_phone = await get_setting('store_phone', '+353000000000');
        const store_address = await get_setting('store_address', null);
        const store_hours = await get_setting('store_hours', null);
        const delivery_enabled = await get_setting('delivery_enabled', true);
        const logo_url = await get_setting('store_logo_url', null);
        // Very lightweight computed "open".
        const is_currently_open = true;
        return ok(res, 200, {
            name: store_name,
            phone: store_phone,
            email: store_email,
            address: store_address,
            operating_hours: store_hours,
            social_links: await get_setting('social_links', {}),
            delivery_enabled: delivery_enabled !== false,
            is_currently_open,
            logo_url,
        });
    }
    catch (error) {
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
app.get('/api/business/reviews', async (req, res) => {
    try {
        const schema = z.object({ limit: z.number().int().positive().max(10).default(5) });
        const { limit } = parse_query(schema, req.query);
        const data = await get_google_reviews_mock(limit);
        return ok(res, 200, {
            aggregate_rating: data.aggregate_rating,
            total_count: data.total_count,
            reviews: data.reviews.slice(0, limit).map((r) => ({
                author_name: r.author_name,
                rating: r.rating,
                text: r.text,
                time: r.time,
                author_photo_url: r.author_photo_url,
            })),
            google_business_url: data.google_business_url,
        });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        }
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
/**
 * MENU (PUBLIC)
 */
app.get('/api/menu/categories', async (req, res) => {
    try {
        const rows = await pool.query('SELECT * FROM categories ORDER BY sort_order ASC, name ASC');
        const categories = rows.rows.map((r) => categorySchema.parse({
            ...r,
            description: r.description ?? null,
            sort_order: Number(r.sort_order),
        }));
        return ok(res, 200, { categories });
    }
    catch (error) {
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
app.get('/api/menu/items', async (req, res) => {
    try {
        const search = parse_query(searchMenuItemInputSchema, req.query);
        const { items, total } = await fetch_menu_items({ for_admin: false, search });
        const customizations_map = await fetch_customizations_for_items(items.map((i) => i.item_id));
        // Construct base URL from request
        const protocol = req.protocol;
        const host = req.get('host');
        const baseUrl = `${protocol}://${host}`;
        const enriched_items = items.map((i) => {
            let fullImageUrl = i.image_url;
            if (fullImageUrl && fullImageUrl.startsWith('/storage')) {
                fullImageUrl = `${baseUrl}${fullImageUrl}`;
            }
            return {
                ...i,
                image_url: fullImageUrl,
                category_name: undefined,
                customization_groups: customizations_map.get(i.item_id) || [],
            };
        });
        return ok(res, 200, { items: enriched_items, total, limit: search.limit, offset: search.offset });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        }
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
app.get('/api/menu/item/:id', async (req, res) => {
    try {
        const item_id = req.params.id;
        const item_res = await pool.query(`SELECT mi.*, c.name as category_name
       FROM menu_items mi
       JOIN categories c ON mi.category_id = c.category_id
       WHERE mi.item_id = $1`, [item_id]);
        if (item_res.rows.length === 0) {
            return res.status(404).json(createErrorResponse('Menu item not found', null, 'NOT_FOUND', req.request_id));
        }
        const row = item_res.rows[0];
        const item = menuItemSchema.parse({
            ...coerce_numbers(row, ['price']),
            price: Number(row.price),
            image_urls: row.image_urls ?? null,
            dietary_tags: row.dietary_tags ?? null,
            description: row.description ?? null,
            image_url: row.image_url ?? null,
            limited_edition_end_date: row.limited_edition_end_date ?? null,
            current_stock: row.current_stock === null || row.current_stock === undefined ? null : Number(row.current_stock),
            low_stock_threshold: row.low_stock_threshold === null || row.low_stock_threshold === undefined ? null : Number(row.low_stock_threshold),
            meta_description: row.meta_description ?? null,
            image_alt_text: row.image_alt_text ?? null,
        });
        const customizations_map = await fetch_customizations_for_items([item_id]);
        return ok(res, 200, {
            item: {
                ...item,
                category_name: row.category_name,
                customization_groups: customizations_map.get(item_id) || [],
            },
        });
    }
    catch (error) {
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
/**
 * CART
 */
app.get('/api/cart', authenticate_token_optional, async (req, res) => {
    try {
        const cart_id = get_cart_identifier(req);
        console.log(`[CART GET] Cart identifier ${cart_id} requesting cart (user: ${req.user?.user_id || 'guest'})`);
        const cart = read_cart_sync(cart_id);
        console.log(`[CART GET] Cart loaded with ${cart.items.length} items`);
        const totals = await compute_cart_totals({
            user_id: req.user?.user_id || cart_id,
            cart,
            order_type: 'collection',
            delivery_address_id: null,
            discount_code: cart.discount_code,
        });
        console.log(`[CART GET] Totals computed: subtotal=${totals.subtotal}, total=${totals.total}, items=${totals.items.length}`);
        return ok(res, 200, {
            items: totals.items,
            subtotal: totals.subtotal,
            discount_code: totals.discount_code,
            discount_amount: totals.discount_amount,
            delivery_fee: totals.delivery_fee,
            tax_amount: totals.tax_amount,
            total: totals.total,
            validation_errors: totals.validation_errors,
        });
    }
    catch (error) {
        console.error(`[CART GET ERROR] Cart identifier ${get_cart_identifier(req)}:`, error);
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
app.post('/api/cart/add', authenticate_token_optional, async (req, res) => {
    try {
        const body = cart_add_input_schema.parse({
            ...req.body,
            quantity: Number(req.body?.quantity),
        });
        const menu_res = await pool.query('SELECT item_id, is_active, stock_tracked, current_stock FROM menu_items WHERE item_id = $1', [body.item_id]);
        if (menu_res.rows.length === 0 || !menu_res.rows[0].is_active) {
            return res.status(400).json(createErrorResponse('Item is unavailable', null, 'ITEM_UNAVAILABLE', req.request_id));
        }
        const menu_item = menu_res.rows[0];
        const current_stock = menu_item.current_stock === null || menu_item.current_stock === undefined ? null : Number(menu_item.current_stock);
        if (menu_item.stock_tracked && (current_stock ?? 0) < body.quantity) {
            return res.status(400).json(createErrorResponse('Item is out of stock', null, 'ITEM_OUT_OF_STOCK', req.request_id));
        }
        const cart_id = get_cart_identifier(req);
        const cart = read_cart_sync(cart_id);
        const cart_item_id = gen_id('cart');
        cart.items.push({
            cart_item_id,
            item_id: body.item_id,
            quantity: body.quantity,
            selected_customizations: body.selected_customizations ?? null,
            added_at: now_iso(),
        });
        write_cart_sync(cart_id, cart);
        const totals = await compute_cart_totals({
            user_id: req.user?.user_id || cart_id,
            cart,
            order_type: 'collection',
            delivery_address_id: null,
            discount_code: cart.discount_code,
        });
        return ok(res, 200, {
            items: totals.items,
            subtotal: totals.subtotal,
            discount_code: totals.discount_code,
            discount_amount: totals.discount_amount,
            delivery_fee: totals.delivery_fee,
            tax_amount: totals.tax_amount,
            total: totals.total,
            validation_errors: totals.validation_errors,
        });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        }
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
// Alias endpoint for /api/cart/add (used by frontend)
app.post('/api/cart/items', authenticate_token_optional, async (req, res) => {
    try {
        const body = cart_add_input_schema.parse({
            ...req.body,
            quantity: Number(req.body?.quantity),
        });
        const menu_res = await pool.query('SELECT item_id, is_active, stock_tracked, current_stock FROM menu_items WHERE item_id = $1', [body.item_id]);
        if (menu_res.rows.length === 0 || !menu_res.rows[0].is_active) {
            return res.status(400).json(createErrorResponse('Item is unavailable', null, 'ITEM_UNAVAILABLE', req.request_id));
        }
        const menu_item = menu_res.rows[0];
        const current_stock = menu_item.current_stock === null || menu_item.current_stock === undefined ? null : Number(menu_item.current_stock);
        if (menu_item.stock_tracked && (current_stock ?? 0) < body.quantity) {
            return res.status(400).json(createErrorResponse('Item is out of stock', null, 'ITEM_OUT_OF_STOCK', req.request_id));
        }
        const cart_id = get_cart_identifier(req);
        const cart = read_cart_sync(cart_id);
        // Prevent cart from becoming too large (max 50 unique items)
        if (cart.items.length >= 50) {
            return res.status(400).json(createErrorResponse('Cart is full. Please remove some items before adding more.', null, 'CART_FULL', req.request_id));
        }
        const cart_item_id = gen_id('cart');
        cart.items.push({
            cart_item_id,
            item_id: body.item_id,
            quantity: body.quantity,
            selected_customizations: body.selected_customizations ?? null,
            added_at: now_iso(),
        });
        write_cart_sync(cart_id, cart);
        const totals = await compute_cart_totals({
            user_id: req.user?.user_id || cart_id,
            cart,
            order_type: 'collection',
            delivery_address_id: null,
            discount_code: cart.discount_code,
        });
        return ok(res, 200, {
            items: totals.items,
            subtotal: totals.subtotal,
            discount_code: totals.discount_code,
            discount_amount: totals.discount_amount,
            delivery_fee: totals.delivery_fee,
            tax_amount: totals.tax_amount,
            total: totals.total,
            validation_errors: totals.validation_errors,
        });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        }
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
app.put('/api/cart/item/:id', authenticate_token_optional, async (req, res) => {
    try {
        const cart_item_id = req.params.id;
        const body = cart_update_input_schema.parse({ quantity: Number(req.body?.quantity) });
        const cart_id = get_cart_identifier(req);
        const cart = read_cart_sync(cart_id);
        const idx = cart.items.findIndex((i) => i.cart_item_id === cart_item_id);
        if (idx === -1) {
            return res.status(404).json(createErrorResponse('Cart item not found', null, 'NOT_FOUND', req.request_id));
        }
        // Validate stock for new quantity.
        const item_id = cart.items[idx].item_id;
        const menu_res = await pool.query('SELECT stock_tracked, current_stock, is_active FROM menu_items WHERE item_id = $1', [item_id]);
        if (menu_res.rows.length === 0 || !menu_res.rows[0].is_active) {
            return res.status(400).json(createErrorResponse('Item is unavailable', null, 'ITEM_UNAVAILABLE', req.request_id));
        }
        const current_stock = menu_res.rows[0].current_stock === null || menu_res.rows[0].current_stock === undefined ? null : Number(menu_res.rows[0].current_stock);
        if (menu_res.rows[0].stock_tracked && (current_stock ?? 0) < body.quantity) {
            return res.status(400).json(createErrorResponse('Insufficient stock', null, 'ITEM_OUT_OF_STOCK', req.request_id));
        }
        cart.items[idx].quantity = body.quantity;
        write_cart_sync(cart_id, cart);
        const totals = await compute_cart_totals({
            user_id: req.user?.user_id || cart_id,
            cart,
            order_type: 'collection',
            delivery_address_id: null,
            discount_code: cart.discount_code,
        });
        return ok(res, 200, {
            items: totals.items,
            subtotal: totals.subtotal,
            discount_code: totals.discount_code,
            discount_amount: totals.discount_amount,
            delivery_fee: totals.delivery_fee,
            tax_amount: totals.tax_amount,
            total: totals.total,
            validation_errors: totals.validation_errors,
        });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        }
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
app.delete('/api/cart/item/:id', authenticate_token_optional, async (req, res) => {
    try {
        const cart_item_id = req.params.id;
        const cart_id = get_cart_identifier(req);
        const cart = read_cart_sync(cart_id);
        const next_items = cart.items.filter((i) => i.cart_item_id !== cart_item_id);
        cart.items = next_items;
        write_cart_sync(cart_id, cart);
        const totals = await compute_cart_totals({
            user_id: req.user?.user_id || cart_id,
            cart,
            order_type: 'collection',
            delivery_address_id: null,
            discount_code: cart.discount_code,
        });
        return ok(res, 200, {
            items: totals.items,
            subtotal: totals.subtotal,
            discount_code: totals.discount_code,
            discount_amount: totals.discount_amount,
            delivery_fee: totals.delivery_fee,
            tax_amount: totals.tax_amount,
            total: totals.total,
            validation_errors: totals.validation_errors,
        });
    }
    catch (error) {
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
app.delete('/api/cart', authenticate_token_optional, async (req, res) => {
    try {
        const cart_id = get_cart_identifier(req);
        console.log(`[CART DELETE] Cart ${cart_id} clearing cart (user: ${req.user?.user_id || 'guest'})`);
        const cart = read_cart_sync(cart_id);
        cart.items = [];
        cart.discount_code = null;
        write_cart_sync(cart_id, cart);
        console.log(`[CART DELETE] Cart cleared for ${cart_id}`);
        return ok(res, 200, {
            items: [],
            subtotal: 0,
            discount_code: null,
            discount_amount: 0,
            delivery_fee: 0,
            tax_amount: 0,
            total: 0,
            validation_errors: [],
        });
    }
    catch (error) {
        console.error(`[CART DELETE ERROR] User ${req.user?.user_id}:`, error);
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
/**
 * DISCOUNT VALIDATION
 */
app.post('/api/discount/validate', authenticate_token_optional, async (req, res) => {
    try {
        // Determine user_id (supports both authenticated users and guests)
        const user_id = req.user?.user_id || req.guest_session_id || null;
        if (!user_id) {
            return res.status(400).json(createErrorResponse('User session required', null, 'SESSION_REQUIRED', req.request_id));
        }
        const payload = validateDiscountCodeInputSchema.parse({
            ...req.body,
            user_id: user_id,
            order_value: Number(req.body?.order_value),
        });
        const result = await validate_discount_code({
            code: payload.code,
            user_id: payload.user_id,
            order_type: payload.order_type,
            order_value: payload.order_value,
        });
        if (!result.valid) {
            return ok(res, 200, { valid: false, discount_amount: 0, message: result.message });
        }
        // Apply the discount to the cart
        const cart = read_cart_sync(user_id);
        cart.discount_code = result.code_row.code;
        write_cart_sync(user_id, cart);
        return ok(res, 200, {
            valid: true,
            discount_amount: result.discount_amount,
            discount_type: result.code_row.discount_type,
            code: result.code_row.code,
        });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        }
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
/**
 * REMOVE DISCOUNT FROM CART
 */
app.delete('/api/discount/remove', authenticate_token_optional, async (req, res) => {
    try {
        // Determine user_id (supports both authenticated users and guests)
        const user_id = req.user?.user_id || req.guest_session_id || null;
        if (!user_id) {
            return res.status(400).json(createErrorResponse('User session required', null, 'SESSION_REQUIRED', req.request_id));
        }
        console.log(`[DISCOUNT REMOVE] User ${user_id} removing discount from cart`);
        const cart = read_cart_sync(user_id);
        cart.discount_code = null;
        write_cart_sync(user_id, cart);
        console.log(`[DISCOUNT REMOVE] Discount removed from cart for user ${user_id}`);
        return ok(res, 200, {
            success: true,
            message: 'Discount removed from cart'
        });
    }
    catch (error) {
        console.error(`[DISCOUNT REMOVE ERROR] User ${req.user?.user_id || req.guest_session_id}:`, error);
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
/**
 * ADDRESSES ROUTES
 */
// Get all addresses for authenticated user
app.get('/api/addresses', authenticate_token, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC', [req.user.user_id]);
        const addresses = result.rows.map(row => addressSchema.parse({
            ...row,
            latitude: row.latitude !== null ? Number(row.latitude) : null,
            longitude: row.longitude !== null ? Number(row.longitude) : null,
        }));
        return ok(res, 200, { addresses });
    }
    catch (error) {
        console.error('Get addresses error:', error);
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
// Get single address by ID
app.get('/api/addresses/:address_id', authenticate_token, async (req, res) => {
    try {
        const { address_id } = req.params;
        const result = await pool.query('SELECT * FROM addresses WHERE address_id = $1 AND user_id = $2', [address_id, req.user.user_id]);
        if (result.rows.length === 0) {
            return res.status(404).json(createErrorResponse('Address not found', null, 'NOT_FOUND', req.request_id));
        }
        const address = addressSchema.parse({
            ...result.rows[0],
            latitude: result.rows[0].latitude !== null ? Number(result.rows[0].latitude) : null,
            longitude: result.rows[0].longitude !== null ? Number(result.rows[0].longitude) : null,
        });
        return ok(res, 200, { address });
    }
    catch (error) {
        console.error('Get address error:', error);
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
// Create new address
app.post('/api/addresses', authenticate_token, async (req, res) => {
    try {
        const input = createAddressInputSchema.parse({
            ...req.body,
            user_id: req.user.user_id,
        });
        await with_client(async (client) => {
            await client.query('BEGIN');
            // If this is set as default, unset other defaults for this user
            if (input.is_default) {
                await client.query('UPDATE addresses SET is_default = false WHERE user_id = $1', [req.user.user_id]);
            }
            // Geocode the address if coordinates not provided
            let latitude = input.latitude ?? null;
            let longitude = input.longitude ?? null;
            if (latitude === null || longitude === null) {
                const geocoded = await geocode_address_mock({
                    address_line1: input.address_line1,
                    city: input.city,
                    postal_code: input.postal_code,
                });
                latitude = geocoded.latitude;
                longitude = geocoded.longitude;
            }
            const address_id = gen_id('addr');
            const created_at = now_iso();
            await client.query(`INSERT INTO addresses (
          address_id, user_id, label, address_line1, address_line2,
          city, postal_code, delivery_instructions, is_default,
          latitude, longitude, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`, [
                address_id,
                input.user_id,
                input.label,
                input.address_line1,
                input.address_line2 ?? null,
                input.city,
                input.postal_code,
                input.delivery_instructions ?? null,
                input.is_default,
                latitude,
                longitude,
                created_at,
            ]);
            await client.query('COMMIT');
            const address = addressSchema.parse({
                address_id,
                user_id: input.user_id,
                label: input.label,
                address_line1: input.address_line1,
                address_line2: input.address_line2 ?? null,
                city: input.city,
                postal_code: input.postal_code,
                delivery_instructions: input.delivery_instructions ?? null,
                is_default: input.is_default,
                latitude,
                longitude,
                created_at,
            });
            return ok(res, 201, { address });
        });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        }
        console.error('Create address error:', error);
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
// Update address
app.put('/api/addresses/:address_id', authenticate_token, async (req, res) => {
    try {
        const { address_id } = req.params;
        const input = updateAddressInputSchema.parse({
            ...req.body,
            address_id,
        });
        await with_client(async (client) => {
            await client.query('BEGIN');
            // Verify ownership
            const check = await client.query('SELECT address_id FROM addresses WHERE address_id = $1 AND user_id = $2', [address_id, req.user.user_id]);
            if (check.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json(createErrorResponse('Address not found', null, 'NOT_FOUND', req.request_id));
            }
            // If setting as default, unset other defaults
            if (input.is_default === true) {
                await client.query('UPDATE addresses SET is_default = false WHERE user_id = $1 AND address_id != $2', [req.user.user_id, address_id]);
            }
            const updates = [];
            const params = [];
            let paramIndex = 1;
            if (input.label !== undefined) {
                updates.push(`label = $${paramIndex++}`);
                params.push(input.label);
            }
            if (input.address_line1 !== undefined) {
                updates.push(`address_line1 = $${paramIndex++}`);
                params.push(input.address_line1);
            }
            if (input.address_line2 !== undefined) {
                updates.push(`address_line2 = $${paramIndex++}`);
                params.push(input.address_line2);
            }
            if (input.city !== undefined) {
                updates.push(`city = $${paramIndex++}`);
                params.push(input.city);
            }
            if (input.postal_code !== undefined) {
                updates.push(`postal_code = $${paramIndex++}`);
                params.push(input.postal_code);
            }
            if (input.delivery_instructions !== undefined) {
                updates.push(`delivery_instructions = $${paramIndex++}`);
                params.push(input.delivery_instructions);
            }
            if (input.is_default !== undefined) {
                updates.push(`is_default = $${paramIndex++}`);
                params.push(input.is_default);
            }
            if (input.latitude !== undefined) {
                updates.push(`latitude = $${paramIndex++}`);
                params.push(input.latitude);
            }
            if (input.longitude !== undefined) {
                updates.push(`longitude = $${paramIndex++}`);
                params.push(input.longitude);
            }
            if (updates.length > 0) {
                params.push(address_id);
                params.push(req.user.user_id);
                await client.query(`UPDATE addresses SET ${updates.join(', ')} WHERE address_id = $${paramIndex} AND user_id = $${paramIndex + 1}`, params);
            }
            await client.query('COMMIT');
            const result = await pool.query('SELECT * FROM addresses WHERE address_id = $1', [address_id]);
            const address = addressSchema.parse({
                ...result.rows[0],
                latitude: result.rows[0].latitude !== null ? Number(result.rows[0].latitude) : null,
                longitude: result.rows[0].longitude !== null ? Number(result.rows[0].longitude) : null,
            });
            return ok(res, 200, { address });
        });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        }
        console.error('Update address error:', error);
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
// Delete address
app.delete('/api/addresses/:address_id', authenticate_token, async (req, res) => {
    try {
        const { address_id } = req.params;
        const result = await pool.query('DELETE FROM addresses WHERE address_id = $1 AND user_id = $2 RETURNING address_id', [address_id, req.user.user_id]);
        if (result.rows.length === 0) {
            return res.status(404).json(createErrorResponse('Address not found', null, 'NOT_FOUND', req.request_id));
        }
        return ok(res, 200, { message: 'Address deleted successfully' });
    }
    catch (error) {
        console.error('Delete address error:', error);
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
/**
 * CHECKOUT
 */
app.post('/api/checkout/validate', authenticate_token_optional, async (req, res) => {
    try {
        const body = checkout_validate_input_schema.parse(req.body);
        const identifier = get_cart_identifier(req);
        const cart = read_cart_sync(identifier);
        const totals = await compute_cart_totals({
            user_id: req.user?.user_id || identifier,
            cart,
            order_type: body.order_type,
            delivery_address_id: body.delivery_address_id ?? null,
            discount_code: body.discount_code ?? cart.discount_code,
        });
        const errors = [...totals.validation_errors];
        // Don't validate collection_time_slot or delivery_address at cart validation stage
        // These will be validated at order creation time
        // if (body.order_type === 'collection') {
        //   if (!body.collection_time_slot) {
        //     errors.push({ field: 'collection_time_slot', error: 'REQUIRED', message: 'Collection time slot is required' });
        //   }
        // }
        const valid = errors.length === 0;
        return ok(res, 200, { valid, errors });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        }
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
app.post('/api/checkout/calculate', authenticate_token_optional, async (req, res) => {
    try {
        const body = checkout_validate_input_schema.parse(req.body);
        const identifier = get_cart_identifier(req);
        const cart = read_cart_sync(identifier);
        const totals = await compute_cart_totals({
            user_id: req.user?.user_id || identifier,
            cart,
            order_type: body.order_type,
            delivery_address_id: body.delivery_address_id ?? null,
            discount_code: body.discount_code ?? cart.discount_code,
        });
        return ok(res, 200, {
            items: totals.items,
            subtotal: totals.subtotal,
            discount_code: totals.discount_code,
            discount_amount: totals.discount_amount,
            delivery_fee: totals.delivery_fee,
            tax_amount: totals.tax_amount,
            total: totals.total,
            total_amount: totals.total, // Frontend expects total_amount
            validation_errors: totals.validation_errors,
        });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        }
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
// Validate delivery address (customer-facing endpoint for checkout)
app.post('/api/delivery/validate-address', authenticate_token, async (req, res) => {
    try {
        const schema = z.object({
            address_id: z.string().optional(),
            address: z.string().min(1).optional(),
            postal_code: z.string().min(1).optional(),
        });
        const { address_id, address, postal_code } = schema.parse(req.body);
        let coords;
        // If address_id is provided, use stored coordinates from database
        if (address_id) {
            const addr_res = await pool.query('SELECT latitude, longitude, address_line1, postal_code FROM addresses WHERE address_id = $1 AND user_id = $2', [address_id, req.user.user_id]);
            if (addr_res.rows.length === 0) {
                return res.status(404).json(createErrorResponse('Address not found', null, 'ADDRESS_NOT_FOUND', req.request_id));
            }
            const addr = addr_res.rows[0];
            coords = {
                latitude: Number(addr.latitude),
                longitude: Number(addr.longitude),
            };
        }
        else if (address && postal_code) {
            // Geocode new address
            coords = await geocode_address_mock({
                address_line1: address,
                city: 'Dublin',
                postal_code: postal_code,
            });
        }
        else {
            return res.status(400).json(createErrorResponse('Either address_id or both address and postal_code must be provided', null, 'INVALID_INPUT', req.request_id));
        }
        // Find delivery zone for coordinates
        const zone = await find_delivery_zone(coords.latitude, coords.longitude);
        if (!zone) {
            return ok(res, 200, {
                valid: false,
                message: "Delivery not available to this address",
                delivery_fee: 0,
                estimated_delivery_time: null,
                zone_id: null,
            });
        }
        return ok(res, 200, {
            valid: true,
            message: "Delivery available",
            delivery_fee: zone.delivery_fee,
            estimated_delivery_time: zone.estimated_delivery_time,
            zone_id: zone.zone_id,
            zone_name: zone.zone_name,
        });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        }
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
// Shared handler for order creation (used by both /api/checkout/create-order and /api/checkout/order)
const handleCheckoutCreateOrder = async (req, res) => {
    console.log(`[CHECKOUT CREATE ORDER] request_id=${req.request_id} Starting order creation`);
    try {
        const body = checkout_create_order_input_schema.parse(req.body);
        const identifier = get_cart_identifier(req);
        const cart = read_cart_sync(identifier);
        console.log(`[CHECKOUT CREATE ORDER] request_id=${req.request_id} Cart loaded: ${cart.items.length} items`);
        if (cart.items.length === 0) {
            return res.status(400).json(createErrorResponse('Cart is empty', null, 'CART_EMPTY', req.request_id));
        }
        // Determine if this is an authenticated user or guest
        const is_authenticated = !!req.user?.user_id;
        const auth_user_id = req.user?.user_id || null;
        console.log(`[CHECKOUT CREATE ORDER] request_id=${req.request_id} is_authenticated=${is_authenticated} auth_user_id=${auth_user_id} discount_code=${body.discount_code || cart.discount_code || 'none'}`);
        // For authenticated users, validate that the user exists in the database and is active
        if (is_authenticated) {
            const user_check = await pool.query('SELECT user_id, status FROM users WHERE user_id = $1', [auth_user_id]);
            if (user_check.rows.length === 0) {
                return res.status(401).json(createErrorResponse('User account not found. Please log in again.', null, 'USER_NOT_FOUND', req.request_id));
            }
            // Check if user account is suspended
            if (user_check.rows[0].status !== 'active') {
                return res.status(403).json(createErrorResponse('Your account has been suspended. You cannot place orders. Please contact support for assistance.', null, 'ACCOUNT_SUSPENDED', req.request_id));
            }
        }
        // Use identifier for cart lookups, but user_id will be NULL for guests in the order
        const cart_identifier = identifier;
        // Compute totals + validate.
        const totals = await compute_cart_totals({
            user_id: auth_user_id || cart_identifier, // For cart totals computation
            cart,
            order_type: body.order_type,
            delivery_address_id: body.delivery_address_id ?? null,
            discount_code: body.discount_code ?? cart.discount_code,
        });
        const errors = [...totals.validation_errors];
        if (body.order_type === 'collection' && !body.collection_time_slot) {
            errors.push({ field: 'collection_time_slot', error: 'REQUIRED', message: 'Collection time slot is required' });
        }
        if (errors.length > 0) {
            return res.status(400).json(createErrorResponse('Order cannot be placed', null, 'VALIDATION_FAILED', req.request_id, { errors }));
        }
        // Determine payment method type
        const pm_id = body.payment_method_id;
        const is_cash_payment = pm_id === 'cash_at_pickup' || pm_id === null;
        const is_new_card_demo = pm_id === 'new_card_temp';
        let pm = null;
        let payment_method_type = 'cash';
        if (!is_cash_payment && !is_new_card_demo) {
            // Load payment method token (never return it to client).
            if (!pm_id) {
                return res.status(400).json(createErrorResponse('Payment method is required', null, 'PAYMENT_METHOD_REQUIRED', req.request_id));
            }
            // For authenticated users, verify payment method belongs to them
            if (is_authenticated) {
                const pm_res = await pool.query('SELECT payment_method_id, sumup_token, card_type, last_four_digits FROM payment_methods WHERE payment_method_id = $1 AND user_id = $2', [pm_id, auth_user_id]);
                if (pm_res.rows.length === 0) {
                    return res.status(400).json(createErrorResponse('Payment method not found', null, 'PAYMENT_METHOD_NOT_FOUND', req.request_id));
                }
                pm = pm_res.rows[0];
                payment_method_type = 'card';
            }
            else {
                // Guests cannot use saved payment methods - they must use cash or new card
                return res.status(400).json(createErrorResponse('Guests cannot use saved payment methods. Please use cash payment or enter card details.', null, 'GUEST_CANNOT_USE_SAVED_PAYMENT', req.request_id));
            }
        }
        else if (is_new_card_demo) {
            // Handle new card demo mode - create a mock payment method for this transaction
            pm = {
                payment_method_id: 'new_card_temp',
                sumup_token: `demo_token_${Date.now()}`,
                card_type: 'Visa',
                last_four_digits: '4242',
            };
            payment_method_type = 'card';
        }
        // Transactional order creation.
        await with_client(async (client) => {
            await client.query('BEGIN');
            console.log(`[CHECKOUT CREATE ORDER] request_id=${req.request_id} STEP: BEGIN transaction`);
            const order_id = gen_id('ord');
            const order_number = `SL-${String(Math.floor(Date.now() / 1000)).slice(-6)}-${nanoid(4).toUpperCase()}`;
            const created_at = now_iso();
            console.log(`[CHECKOUT CREATE ORDER] request_id=${req.request_id} order_id=${order_id} order_number=${order_number}`);
            // Generate ticket number and tracking token for guest-friendly tracking
            // Use nanoid with custom alphabet (uppercase letters + numbers) for non-guessable ticket numbers
            const customNanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 6);
            let ticket_number = `SL-${customNanoid()}`;
            // Ensure ticket number is unique (retry if collision - very unlikely with 36^6 combinations)
            let ticket_exists = true;
            let retry_count = 0;
            while (ticket_exists && retry_count < 5) {
                const check_res = await client.query('SELECT ticket_number FROM orders WHERE ticket_number = $1', [ticket_number]);
                if (check_res.rows.length === 0) {
                    ticket_exists = false;
                }
                else {
                    ticket_number = `SL-${customNanoid()}`;
                    retry_count++;
                }
            }
            if (ticket_exists) {
                await client.query('ROLLBACK');
                return res.status(500).json(createErrorResponse('Failed to generate unique ticket number', null, 'TICKET_GENERATION_ERROR', req.request_id));
            }
            const tracking_token = nanoid(32);
            let delivery_address_snapshot = null;
            let delivery_fee = totals.delivery_fee;
            let estimated_delivery_time = totals.estimated_delivery_time ?? null;
            let delivery_address_id = null;
            if (body.order_type === 'delivery') {
                // For authenticated users, load saved address
                if (is_authenticated && body.delivery_address_id) {
                    delivery_address_id = body.delivery_address_id;
                    const addr_res = await client.query('SELECT * FROM addresses WHERE address_id = $1 AND user_id = $2', [delivery_address_id, auth_user_id]);
                    if (addr_res.rows.length === 0) {
                        await client.query('ROLLBACK');
                        return res.status(400).json(createErrorResponse('Delivery address not found', null, 'ADDRESS_NOT_FOUND', req.request_id));
                    }
                    const addr = addr_res.rows[0];
                    delivery_address_snapshot = {
                        label: addr.label,
                        address_line1: addr.address_line1,
                        address_line2: addr.address_line2,
                        city: addr.city,
                        postal_code: addr.postal_code,
                        delivery_instructions: addr.delivery_instructions,
                        latitude: addr.latitude === null || addr.latitude === undefined ? null : Number(addr.latitude),
                        longitude: addr.longitude === null || addr.longitude === undefined ? null : Number(addr.longitude),
                    };
                }
                else {
                    // For guests, create address snapshot from request body (no saved address)
                    // Guest delivery would need address details in the request body
                    // For now, guests must use collection orders or this will fail validation
                    delivery_address_id = null;
                    delivery_address_snapshot = null;
                }
            }
            // Insert order.
            console.log(`[CHECKOUT CREATE ORDER] request_id=${req.request_id} STEP: insert order auth_user_id=${auth_user_id}`);
            try {
                await client.query(`INSERT INTO orders (
            order_id, order_number, ticket_number, tracking_token,
            user_id, order_type, status,
            collection_time_slot, delivery_address_id, delivery_address_snapshot,
            delivery_fee, estimated_delivery_time,
            subtotal, discount_code, discount_amount, tax_amount, total_amount,
            payment_status, payment_method_id, payment_method_type,
            sumup_transaction_id, invoice_url, loyalty_points_awarded,
            special_instructions, customer_name, customer_email, customer_phone,
            created_at, updated_at,
            completed_at, cancelled_at, cancellation_reason, refund_amount, refund_reason,
            refunded_at, internal_notes
          ) VALUES (
            $1,$2,$3,$4,
            $5,$6,$7,
            $8,$9,$10::jsonb,
            $11,$12,
            $13,$14,$15,$16,$17,
            $18,$19,$20,
            $21,$22,$23,
            $24,$25,$26,$27,
            $28,$29,
            $30,$31,$32,$33,$34,
            $35,$36
          )`, [
                    order_id,
                    order_number,
                    ticket_number,
                    tracking_token,
                    auth_user_id, // NULL for guests, user_id for authenticated users
                    body.order_type,
                    'received',
                    body.collection_time_slot ?? null,
                    delivery_address_id,
                    delivery_address_snapshot ? JSON.stringify(delivery_address_snapshot) : null,
                    delivery_address_id ? delivery_fee : null,
                    estimated_delivery_time,
                    totals.subtotal,
                    totals.discount_code ?? null,
                    totals.discount_amount,
                    totals.tax_amount,
                    totals.total,
                    'pending',
                    (is_cash_payment || is_new_card_demo) ? null : pm_id,
                    payment_method_type,
                    null,
                    null,
                    0,
                    body.special_instructions ?? null,
                    body.customer_name,
                    body.customer_email,
                    body.customer_phone,
                    created_at,
                    created_at,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                ]);
                console.log(`[CHECKOUT CREATE ORDER] request_id=${req.request_id} STEP: insert order SUCCESS`);
            }
            catch (err) {
                console.error(`[CHECKOUT CREATE ORDER] request_id=${req.request_id} STEP: insert order FAILED code=${err.code} constraint=${err.constraint} detail=${err.detail} message=${err.message}`);
                throw err;
            }
            // Insert order items.
            console.log(`[CHECKOUT CREATE ORDER] request_id=${req.request_id} STEP: insert order_items count=${totals.items.length}`);
            for (const ci of totals.items) {
                await client.query(`INSERT INTO order_items (
            order_item_id, order_id, item_id, item_name,
            quantity, unit_price, selected_customizations, line_total
          ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8)`, [
                    gen_id('oi'),
                    order_id,
                    ci.item_id,
                    ci.item_name,
                    ci.quantity,
                    ci.unit_price,
                    ci.selected_customizations ? JSON.stringify(ci.selected_customizations) : null,
                    ci.line_total,
                ]);
            }
            // Status history: received.
            await client.query(`INSERT INTO order_status_history (history_id, order_id, status, changed_by_user_id, changed_at, notes)
         VALUES ($1,$2,$3,$4,$5,$6)`, [gen_id('osh'), order_id, 'received', auth_user_id, created_at, 'Order placed']);
            // Process payment (mock) BEFORE committing - skip for cash payments.
            let payment = null;
            if (!is_cash_payment && payment_method_type === 'card') {
                payment = await sumup_charge_mock({
                    amount: totals.total,
                    currency: 'EUR',
                    description: `Order ${order_number}`,
                    token: pm.sumup_token,
                    cvv: body.cvv || '123', // Use default CVV for demo cards
                });
                if (!payment.success) {
                    await client.query('ROLLBACK');
                    return res.status(400).json(createErrorResponse('Payment was declined. Please try another payment method.', null, 'PAYMENT_FAILED', req.request_id, { sumup_error_code: payment.error_code }));
                }
                // Update order payment status to paid for card payments.
                await client.query('UPDATE orders SET payment_status = $1, sumup_transaction_id = $2, updated_at = $3 WHERE order_id = $4', [
                    'paid',
                    payment.transaction_id,
                    now_iso(),
                    order_id,
                ]);
            }
            // For cash payments, payment_status remains 'pending' until payment is received
            // Discount usage.
            console.log(`[CHECKOUT CREATE ORDER] request_id=${req.request_id} STEP: discount usage discount_code=${totals.discount_code || 'none'} auth_user_id=${auth_user_id}`);
            if (totals.discount_code) {
                try {
                    const dc_res = await client.query('SELECT code_id, total_used_count FROM discount_codes WHERE code = $1', [ensure_upper(totals.discount_code)]);
                    if (dc_res.rows.length > 0) {
                        const dc = dc_res.rows[0];
                        console.log(`[CHECKOUT CREATE ORDER] request_id=${req.request_id} STEP: discount usage - inserting discount_usage record code_id=${dc.code_id} auth_user_id=${auth_user_id}`);
                        // CRITICAL FIX: Only insert discount_usage if user is authenticated
                        // Guest users cannot have discount usage tracked in user_id column
                        if (auth_user_id) {
                            await client.query(`INSERT INTO discount_usage (usage_id, code_id, user_id, order_id, discount_amount_applied, used_at)
                 VALUES ($1,$2,$3,$4,$5,$6)`, [gen_id('du'), dc.code_id, auth_user_id, order_id, totals.discount_amount, now_iso()]);
                            console.log(`[CHECKOUT CREATE ORDER] request_id=${req.request_id} STEP: discount usage - discount_usage record inserted`);
                        }
                        else {
                            console.log(`[CHECKOUT CREATE ORDER] request_id=${req.request_id} STEP: discount usage - SKIPPED for guest (auth_user_id is NULL)`);
                        }
                        await client.query('UPDATE discount_codes SET total_used_count = total_used_count + 1, updated_at = $1 WHERE code_id = $2', [now_iso(), dc.code_id]);
                        // First-order discount usage flag - only for authenticated users.
                        if (auth_user_id) {
                            await client.query('UPDATE users SET first_order_discount_used = true WHERE user_id = $1 AND first_order_discount_code = $2', [auth_user_id, totals.discount_code]);
                        }
                        // If discount code is a redeemed reward, mark as used - only for authenticated users.
                        if (auth_user_id) {
                            await client.query(`UPDATE redeemed_rewards
                 SET usage_status = 'used', used_in_order_id = $1, used_at = $2
                 WHERE reward_code = $3 AND loyalty_account_id = (SELECT loyalty_account_id FROM loyalty_accounts WHERE user_id = $4)
                   AND usage_status = 'unused'`, [order_id, now_iso(), ensure_upper(totals.discount_code), auth_user_id]);
                        }
                    }
                    console.log(`[CHECKOUT CREATE ORDER] request_id=${req.request_id} STEP: discount usage SUCCESS`);
                }
                catch (err) {
                    console.error(`[CHECKOUT CREATE ORDER] request_id=${req.request_id} STEP: discount usage FAILED code=${err.code} constraint=${err.constraint} detail=${err.detail} message=${err.message}`);
                    throw err;
                }
            }
            // Stock deduction + stock history.
            for (const ci of totals.items) {
                const mi_res = await client.query('SELECT stock_tracked, current_stock, low_stock_threshold FROM menu_items WHERE item_id = $1 FOR UPDATE', [ci.item_id]);
                if (mi_res.rows.length === 0)
                    continue;
                const mi = mi_res.rows[0];
                if (mi.stock_tracked) {
                    const prev = mi.current_stock === null || mi.current_stock === undefined ? 0 : Number(mi.current_stock);
                    const next = prev - ci.quantity;
                    if (next < 0) {
                        await client.query('ROLLBACK');
                        return res.status(400).json(createErrorResponse('Stock changed during checkout. Please review your cart.', null, 'STOCK_CHANGED', req.request_id));
                    }
                    await client.query('UPDATE menu_items SET current_stock = $1, updated_at = $2 WHERE item_id = $3', [next, now_iso(), ci.item_id]);
                    await client.query(`INSERT INTO stock_history (history_id, item_id, change_type, previous_stock, new_stock, quantity_changed, reason, notes, changed_by_user_id, changed_at, related_order_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, [
                        gen_id('sh'),
                        ci.item_id,
                        'sale',
                        prev,
                        next,
                        -Math.abs(ci.quantity),
                        'Order sale',
                        'Sold via order',
                        auth_user_id, // NULL for guests
                        now_iso(),
                        order_id,
                    ]);
                }
            }
            // Loyalty points: award on order completion per business rules, BUT MVP UX expects immediate.
            // We'll award immediately and store in order; staff completion can be used for future tightening.
            // Only award points for authenticated users (not guests)
            const points_rate_setting = await get_setting('loyalty_points_rate', 1);
            const points_rate = Number(points_rate_setting ?? 1);
            const points = Math.max(0, Math.floor(totals.total * points_rate));
            const la_res = is_authenticated ? await client.query('SELECT loyalty_account_id, current_points_balance, total_points_earned FROM loyalty_accounts WHERE user_id = $1 FOR UPDATE', [auth_user_id]) : { rows: [] };
            if (la_res.rows.length > 0) {
                const la = la_res.rows[0];
                const prev_balance = Number(la.current_points_balance ?? 0);
                const next_balance = prev_balance + points;
                await client.query('UPDATE loyalty_accounts SET current_points_balance = $1, total_points_earned = total_points_earned + $2 WHERE loyalty_account_id = $3', [next_balance, points, la.loyalty_account_id]);
                await client.query(`INSERT INTO points_transactions (
            transaction_id, loyalty_account_id, transaction_type, points_amount,
            order_id, reason, adjusted_by_user_id, running_balance, created_at, expires_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [
                    gen_id('pt'),
                    la.loyalty_account_id,
                    'earned',
                    points,
                    order_id,
                    'Order purchase',
                    null,
                    next_balance,
                    now_iso(),
                    new Date(Date.now() + 365 * 86400000).toISOString(),
                ]);
                await client.query('UPDATE orders SET loyalty_points_awarded = $1, updated_at = $2 WHERE order_id = $3', [points, now_iso(), order_id]);
            }
            // Create invoice record.
            const inv_id = gen_id('inv');
            const invoice_number = `INV-${String(Math.floor(Date.now() / 1000)).slice(-6)}-${nanoid(4).toUpperCase()}`;
            const oi_rows = await client.query('SELECT item_name as item, quantity, unit_price, line_total as total FROM order_items WHERE order_id = $1 ORDER BY item_name ASC', [order_id]);
            const line_items = oi_rows.rows.map((r) => ({
                item: r.item,
                quantity: Number(r.quantity),
                unit_price: Number(r.unit_price),
                total: Number(r.total),
            }));
            await client.query(`INSERT INTO invoices (
          invoice_id, invoice_number, order_id, catering_inquiry_id,
          user_id, customer_name, customer_email, customer_phone, customer_address,
          line_items, subtotal, discount_amount, delivery_fee, tax_amount, grand_total,
          payment_status, payment_method, sumup_transaction_id, issue_date,
          due_date, paid_at, invoice_pdf_url, notes, created_at, updated_at
        ) VALUES (
          $1,$2,$3,NULL,
          $4,$5,$6,$7,$8,
          $9::jsonb,$10,$11,$12,$13,$14,
          $15,$16,$17,$18,
          $19,$20,$21,$22,$23,$24
        )`, [
                inv_id,
                invoice_number,
                order_id,
                auth_user_id, // NULL for guests
                body.customer_name,
                body.customer_email,
                body.customer_phone,
                delivery_address_snapshot
                    ? `${delivery_address_snapshot.address_line1}${delivery_address_snapshot.address_line2 ? ', ' + delivery_address_snapshot.address_line2 : ''}, ${delivery_address_snapshot.city} ${delivery_address_snapshot.postal_code}`
                    : null,
                JSON.stringify(line_items),
                totals.subtotal,
                totals.discount_amount,
                body.order_type === 'delivery' ? totals.delivery_fee : null,
                totals.tax_amount,
                totals.total,
                is_cash_payment ? 'pending' : 'paid',
                is_cash_payment ? 'cash' : 'credit_card',
                is_cash_payment ? null : payment.transaction_id,
                now_iso(),
                null,
                is_cash_payment ? null : now_iso(),
                null,
                null,
                now_iso(),
                now_iso(),
            ]);
            // Generate invoice PDF to local storage and link order.
            const pdf_url = await generate_invoice_pdf({ invoice_id: inv_id });
            await client.query('UPDATE orders SET invoice_url = $1, updated_at = $2 WHERE order_id = $3', [pdf_url, now_iso(), order_id]);
            // Clear cart.
            write_cart_sync(cart_identifier, { items: [], discount_code: null, updated_at: now_iso() });
            console.log(`[CHECKOUT CREATE ORDER] request_id=${req.request_id} STEP: COMMIT transaction`);
            await client.query('COMMIT');
            console.log(`[CHECKOUT CREATE ORDER] request_id=${req.request_id} STEP: COMMIT SUCCESS - Order ${order_number} created successfully`);
            // WebSocket: new order to staff.
            io.to('staff').emit('new_order', {
                event: 'new_order',
                data: {
                    order_id,
                    order_number,
                    order_type: body.order_type,
                    customer_name: body.customer_name,
                    items: totals.items.map((x) => ({ name: x.item_name, quantity: x.quantity, customizations: x.selected_customizations })),
                    total_amount: totals.total,
                    special_instructions: body.special_instructions ?? null,
                    collection_time_slot: body.collection_time_slot ?? null,
                    delivery_address_snapshot,
                    created_at,
                    estimated_ready_time: body.order_type === 'collection' ? body.collection_time_slot : null,
                },
                timestamp: now_iso(),
            });
            // Low stock checks.
            for (const ci of totals.items)
                maybe_emit_low_stock(ci.item_id).catch(() => { });
            // Notifications (mocked) fire-and-forget.
            send_email_mock({
                to: body.customer_email,
                subject: `Order Confirmation ${order_number}`,
                body: `Thanks for your order! Total: €${totals.total.toFixed(2)}. Invoice: ${pdf_url}`,
            }).catch(() => { });
            if (req.user?.order_notifications_sms) {
                send_sms_mock({
                    to: body.customer_phone,
                    body: `Your order ${order_number} is confirmed. Track in your account.`,
                }).catch(() => { });
            }
            return ok(res, 201, {
                order_id,
                order_number,
                ticket_number,
                tracking_token,
                status: 'received',
                total_amount: totals.total,
                estimated_ready_time: body.order_type === 'collection' ? body.collection_time_slot : null,
                loyalty_points_awarded: totals.items.length > 0 ? Math.max(0, Math.floor(totals.total * Number((await get_setting('loyalty_points_rate', 1)) ?? 1))) : 0,
                invoice_url: pdf_url,
                message: 'Order placed successfully!',
            });
        });
    }
    catch (error) {
        console.error(`[CHECKOUT CREATE ORDER] request_id=${req.request_id} ERROR occurred:`, error);
        if (error instanceof z.ZodError) {
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        }
        // Handle PostgreSQL foreign key constraint violations
        if (error.code === '23503') {
            console.error(`[CHECKOUT CREATE ORDER] request_id=${req.request_id} Foreign key constraint violation: code=${error.code} constraint=${error.constraint} detail=${error.detail} message=${error.message}`);
            // Map specific constraint violations to user-friendly messages
            if (error.constraint === 'orders_user_id_fkey') {
                return res.status(401).json(createErrorResponse('User account not found. Please log in again.', null, 'USER_NOT_FOUND', req.request_id, {
                    error_code: error.code,
                    constraint: error.constraint,
                    step: 'insert_order'
                }));
            }
            if (error.constraint === 'discount_usage_user_id_fkey') {
                return res.status(400).json(createErrorResponse('Cannot apply discount. Please try again or contact support.', null, 'DISCOUNT_APPLICATION_FAILED', req.request_id, {
                    error_code: error.code,
                    constraint: error.constraint,
                    step: 'discount_usage'
                }));
            }
            return res.status(400).json(createErrorResponse('Order creation failed due to invalid reference. Please check your order details.', null, 'CONSTRAINT_VIOLATION', req.request_id, {
                error_code: error.code,
                constraint: error.constraint,
                detail: error.detail
            }));
        }
        // Handle NOT NULL constraint violations
        if (error.code === '23502') {
            console.error(`[CHECKOUT CREATE ORDER] request_id=${req.request_id} NOT NULL constraint violation: code=${error.code} column=${error.column} detail=${error.detail} message=${error.message}`);
            return res.status(400).json(createErrorResponse('Order creation failed: missing required field.', null, 'REQUIRED_FIELD_MISSING', req.request_id, {
                error_code: error.code,
                column: error.column,
                detail: error.detail
            }));
        }
        console.error(`[CHECKOUT CREATE ORDER] request_id=${req.request_id} Unexpected error: code=${error.code} message=${error.message}`, error);
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id, {
            error_code: error.code,
            constraint: error.constraint
        }));
    }
};
app.post('/api/checkout/create-order', authenticate_token_optional, handleCheckoutCreateOrder);
app.post('/api/checkout/order', authenticate_token_optional, handleCheckoutCreateOrder);
/**
 * ORDERS
 */
/*
  Customer orders endpoint - supports filtering by status (including comma-separated values)
  This endpoint is used by the customer dashboard to fetch orders.
*/
app.get('/api/orders', authenticate_token, async (req, res) => {
    try {
        // Parse query with status potentially being a comma-separated string
        const rawQuery = { ...req.query };
        // Handle comma-separated status values - extract before parsing schema
        let statusFilter = null;
        if (rawQuery.status && typeof rawQuery.status === 'string') {
            const statusArray = rawQuery.status.split(',').map(s => s.trim()).filter(Boolean);
            if (statusArray.length > 0) {
                statusFilter = statusArray;
            }
        }
        // Remove status from rawQuery to avoid schema validation issues
        const queryForSchema = { ...rawQuery };
        delete queryForSchema.status;
        const q = parse_query(searchOrderInputSchema, {
            ...queryForSchema,
            user_id: req.user.user_id
        });
        const where = ['user_id = $1'];
        const params = [req.user.user_id];
        // Handle status filter - support both single value and array
        if (statusFilter && statusFilter.length > 0) {
            params.push(statusFilter);
            where.push(`status = ANY($${params.length})`);
        }
        else if (q.status) {
            params.push(q.status);
            where.push(`status = $${params.length}`);
        }
        if (q.order_type) {
            params.push(q.order_type);
            where.push(`order_type = $${params.length}`);
        }
        if (q.payment_status) {
            params.push(q.payment_status);
            where.push(`payment_status = $${params.length}`);
        }
        if (q.date_from) {
            params.push(q.date_from);
            where.push(`created_at >= $${params.length}`);
        }
        if (q.date_to) {
            params.push(q.date_to);
            where.push(`created_at <= $${params.length}`);
        }
        const count_res = await pool.query(`SELECT COUNT(*)::int as count FROM orders WHERE ${where.join(' AND ')}`, params);
        params.push(q.limit);
        params.push(q.offset);
        const sort_by_map = {
            created_at: 'created_at',
            updated_at: 'updated_at',
            total_amount: 'total_amount',
            order_number: 'order_number',
        };
        const sort_by = sort_by_map[q.sort_by] || 'created_at';
        const sort_order = q.sort_order === 'asc' ? 'ASC' : 'DESC';
        const rows = await pool.query(`SELECT * FROM orders WHERE ${where.join(' AND ')}
       ORDER BY ${sort_by} ${sort_order}
       LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
        const orders = rows.rows.map((r) => orderSchema.parse(coerce_numbers({
            ...r,
            delivery_address_id: r.delivery_address_id ?? null,
            delivery_fee: r.delivery_fee === null || r.delivery_fee === undefined ? null : Number(r.delivery_fee),
            subtotal: Number(r.subtotal),
            discount_amount: Number(r.discount_amount),
            tax_amount: Number(r.tax_amount),
            total_amount: Number(r.total_amount),
            refund_amount: r.refund_amount === null || r.refund_amount === undefined ? null : Number(r.refund_amount),
        }, ['subtotal', 'discount_amount', 'tax_amount', 'total_amount', 'delivery_fee', 'refund_amount'])));
        // Fetch items for all orders
        const order_ids = orders.map(o => o.order_id);
        let items_by_order = {};
        if (order_ids.length > 0) {
            const items_res = await pool.query(`SELECT order_id, order_item_id, item_id, item_name, quantity, unit_price, selected_customizations, line_total
         FROM order_items
         WHERE order_id = ANY($1)
         ORDER BY item_name ASC`, [order_ids]);
            // Group items by order_id
            items_res.rows.forEach((item) => {
                if (!items_by_order[item.order_id]) {
                    items_by_order[item.order_id] = [];
                }
                items_by_order[item.order_id].push({
                    order_item_id: item.order_item_id,
                    item_id: item.item_id,
                    item_name: item.item_name,
                    quantity: Number(item.quantity),
                    unit_price: Number(item.unit_price),
                    selected_customizations: item.selected_customizations ?? null,
                    line_total: Number(item.line_total),
                });
            });
        }
        // Add items to each order
        const orders_with_items = orders.map(order => ({
            ...order,
            items: items_by_order[order.order_id] || [],
        }));
        return ok(res, 200, { orders: orders_with_items, total: count_res.rows[0]?.count ?? 0, limit: q.limit, offset: q.offset });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        }
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
app.get('/api/orders/history', authenticate_token, async (req, res) => {
    try {
        const q = parse_query(searchOrderInputSchema, { ...req.query, user_id: req.user.user_id });
        const where = ['user_id = $1'];
        const params = [req.user.user_id];
        if (q.status) {
            params.push(q.status);
            where.push(`status = $${params.length}`);
        }
        if (q.order_type) {
            params.push(q.order_type);
            where.push(`order_type = $${params.length}`);
        }
        if (q.payment_status) {
            params.push(q.payment_status);
            where.push(`payment_status = $${params.length}`);
        }
        if (q.date_from) {
            params.push(q.date_from);
            where.push(`created_at >= $${params.length}`);
        }
        if (q.date_to) {
            params.push(q.date_to);
            where.push(`created_at <= $${params.length}`);
        }
        const count_res = await pool.query(`SELECT COUNT(*)::int as count FROM orders WHERE ${where.join(' AND ')}`, params);
        params.push(q.limit);
        params.push(q.offset);
        const sort_by_map = {
            created_at: 'created_at',
            updated_at: 'updated_at',
            total_amount: 'total_amount',
            order_number: 'order_number',
        };
        const sort_by = sort_by_map[q.sort_by] || 'created_at';
        const sort_order = q.sort_order === 'asc' ? 'ASC' : 'DESC';
        const rows = await pool.query(`SELECT * FROM orders WHERE ${where.join(' AND ')}
       ORDER BY ${sort_by} ${sort_order}
       LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
        const orders = rows.rows.map((r) => orderSchema.parse(coerce_numbers({
            ...r,
            delivery_address_id: r.delivery_address_id ?? null,
            delivery_fee: r.delivery_fee === null || r.delivery_fee === undefined ? null : Number(r.delivery_fee),
            subtotal: Number(r.subtotal),
            discount_amount: Number(r.discount_amount),
            tax_amount: Number(r.tax_amount),
            total_amount: Number(r.total_amount),
            refund_amount: r.refund_amount === null || r.refund_amount === undefined ? null : Number(r.refund_amount),
        }, ['subtotal', 'discount_amount', 'tax_amount', 'total_amount', 'delivery_fee', 'refund_amount'])));
        return ok(res, 200, { orders, total: count_res.rows[0]?.count ?? 0, limit: q.limit, offset: q.offset });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        }
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
// Order tracking endpoint - returns simplified order data for tracking
// IMPORTANT: This route MUST be defined before /api/orders/:id to prevent
// the :id param from matching the literal string "track"
/*
  Public order tracking endpoint - allows guests to track orders without login
  Only requires ticket_number for tracking
*/
app.get('/api/orders/track', async (req, res) => {
    try {
        const ticket = req.query.ticket;
        // Validate input
        if (!ticket) {
            return res.status(400).json(createErrorResponse('Ticket number is required', null, 'MISSING_PARAMS', req.request_id));
        }
        // Trim and uppercase the ticket number
        const normalizedTicket = ticket.trim().toUpperCase();
        if (normalizedTicket.length === 0) {
            return res.status(400).json(createErrorResponse('Ticket number cannot be empty', null, 'INVALID_TICKET', req.request_id));
        }
        // Query by ticket_number only (no tracking_token required)
        const order_res = await pool.query(`SELECT order_id, order_number, ticket_number, status, order_type, 
              collection_time_slot, estimated_delivery_time, 
              created_at, updated_at, completed_at,
              subtotal, discount_amount, tax_amount, total_amount, delivery_fee
       FROM orders 
       WHERE UPPER(ticket_number) = $1`, [normalizedTicket]);
        if (order_res.rows.length === 0) {
            return res.status(404).json(createErrorResponse("Ticket not found", null, 'ORDER_NOT_FOUND', req.request_id));
        }
        const order_row = coerce_numbers(order_res.rows[0], ['subtotal', 'discount_amount', 'tax_amount', 'total_amount', 'delivery_fee']);
        // Get order items
        const items_res = await pool.query(`SELECT item_name, quantity, unit_price, line_total, selected_customizations
       FROM order_items
       WHERE order_id = $1
       ORDER BY item_name ASC`, [order_row.order_id]);
        const items = items_res.rows.map((r) => ({
            item_name: r.item_name,
            quantity: Number(r.quantity),
            unit_price: Number(r.unit_price),
            line_total: Number(r.line_total),
            selected_customizations: r.selected_customizations ?? null,
        }));
        // Get status history
        const status_res = await pool.query(`SELECT status, changed_at, notes 
       FROM order_status_history 
       WHERE order_id = $1 
       ORDER BY changed_at ASC`, [order_row.order_id]);
        return ok(res, 200, {
            ticket_number: order_row.ticket_number,
            order_number: order_row.order_number,
            status: order_row.status,
            order_type: order_row.order_type,
            collection_time_slot: order_row.collection_time_slot ?? null,
            estimated_delivery_time: order_row.estimated_delivery_time ?? null,
            created_at: order_row.created_at,
            updated_at: order_row.updated_at,
            completed_at: order_row.completed_at ?? null,
            items,
            subtotal: order_row.subtotal,
            discount_amount: order_row.discount_amount,
            tax_amount: order_row.tax_amount,
            delivery_fee: order_row.delivery_fee ?? 0,
            total_amount: order_row.total_amount,
            status_history: status_res.rows.map((r) => ({
                status: r.status,
                changed_at: r.changed_at,
                notes: r.notes ?? null,
            })),
        });
    }
    catch (error) {
        console.error('Track order error:', error);
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
app.get('/api/orders/:id', authenticate_token, async (req, res) => {
    try {
        const order_id = req.params.id;
        const order_res = await pool.query('SELECT * FROM orders WHERE order_id = $1 AND user_id = $2', [order_id, req.user.user_id]);
        if (order_res.rows.length === 0) {
            return res.status(404).json(createErrorResponse('Order not found', null, 'NOT_FOUND', req.request_id));
        }
        const order_row = order_res.rows[0];
        const items_res = await pool.query('SELECT * FROM order_items WHERE order_id = $1 ORDER BY item_name ASC', [order_id]);
        const status_res = await pool.query('SELECT * FROM order_status_history WHERE order_id = $1 ORDER BY changed_at ASC', [order_id]);
        const order = orderSchema.parse(coerce_numbers({
            ...order_row,
            delivery_fee: order_row.delivery_fee === null || order_row.delivery_fee === undefined ? null : Number(order_row.delivery_fee),
            subtotal: Number(order_row.subtotal),
            discount_amount: Number(order_row.discount_amount),
            tax_amount: Number(order_row.tax_amount),
            total_amount: Number(order_row.total_amount),
            refund_amount: order_row.refund_amount === null || order_row.refund_amount === undefined ? null : Number(order_row.refund_amount),
        }, ['subtotal', 'discount_amount', 'tax_amount', 'total_amount', 'delivery_fee', 'refund_amount']));
        return ok(res, 200, {
            order,
            items: items_res.rows.map((r) => ({
                order_item_id: r.order_item_id,
                order_id: r.order_id,
                item_id: r.item_id,
                item_name: r.item_name,
                quantity: Number(r.quantity),
                unit_price: Number(r.unit_price),
                selected_customizations: r.selected_customizations ?? null,
                line_total: Number(r.line_total),
            })),
            status_history: status_res.rows.map((r) => ({
                history_id: r.history_id,
                order_id: r.order_id,
                status: r.status,
                changed_by_user_id: r.changed_by_user_id,
                changed_at: r.changed_at,
                notes: r.notes ?? null,
            })),
        });
    }
    catch (error) {
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
app.get('/api/orders/:id/track', authenticate_token, async (req, res) => {
    try {
        const identifier = req.params.id;
        // Support both order_id (ord_005) and order_number (ORD-2024-0005)
        const order_res = await pool.query('SELECT order_id, order_number, status, order_type, collection_time_slot, delivery_address_snapshot, estimated_delivery_time, customer_name, customer_phone FROM orders WHERE (order_id = $1 OR order_number = $1) AND user_id = $2', [identifier, req.user.user_id]);
        if (order_res.rows.length === 0) {
            return res.status(404).json(createErrorResponse('Order not found', null, 'NOT_FOUND', req.request_id));
        }
        const order_row = order_res.rows[0];
        const status_res = await pool.query('SELECT status, changed_at, changed_by_user_id, notes FROM order_status_history WHERE order_id = $1 ORDER BY changed_at ASC', [order_row.order_id]);
        return ok(res, 200, {
            order_id: order_row.order_id,
            order_number: order_row.order_number,
            status: order_row.status,
            order_type: order_row.order_type,
            collection_time_slot: order_row.collection_time_slot,
            delivery_address_snapshot: order_row.delivery_address_snapshot,
            estimated_time: order_row.estimated_delivery_time,
            customer_name: order_row.customer_name,
            customer_phone: order_row.customer_phone,
            status_history: status_res.rows.map((r) => ({
                status: r.status,
                changed_at: r.changed_at,
                changed_by_user_id: r.changed_by_user_id,
                notes: r.notes ?? null,
            })),
        });
    }
    catch (error) {
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
app.post('/api/orders/:id/cancel', authenticate_token, async (req, res) => {
    try {
        const order_id = req.params.id;
        const body = order_cancel_schema.parse(req.body || {});
        await with_client(async (client) => {
            await client.query('BEGIN');
            const ord_res = await client.query('SELECT * FROM orders WHERE order_id = $1 AND user_id = $2 FOR UPDATE', [order_id, req.user.user_id]);
            if (ord_res.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json(createErrorResponse('Order not found', null, 'NOT_FOUND', req.request_id));
            }
            const ord = ord_res.rows[0];
            if (ord.status !== 'received') {
                await client.query('ROLLBACK');
                return res.status(400).json(createErrorResponse('Order cannot be cancelled at this stage', null, 'CANCEL_NOT_ALLOWED', req.request_id));
            }
            const cancellation_reason = body.cancellation_reason ?? 'Customer requested cancellation';
            const cancelled_at = now_iso();
            // If paid, refund (mock).
            let refund_amount = null;
            if (ord.payment_status === 'paid' && ord.sumup_transaction_id) {
                refund_amount = Number(ord.total_amount);
                const refund = await sumup_refund_mock({ transaction_id: ord.sumup_transaction_id, amount: refund_amount, reason: cancellation_reason });
                if (!refund.success) {
                    await client.query('ROLLBACK');
                    return res.status(400).json(createErrorResponse('Refund failed', null, 'REFUND_FAILED', req.request_id));
                }
                await client.query(`UPDATE orders
           SET status = 'cancelled', cancelled_at = $1, cancellation_reason = $2,
               payment_status = 'refunded', refund_amount = $3, refund_reason = $2, refunded_at = $1, updated_at = $1
           WHERE order_id = $4`, [cancelled_at, cancellation_reason, refund_amount, order_id]);
            }
            else {
                await client.query(`UPDATE orders
           SET status = 'cancelled', cancelled_at = $1, cancellation_reason = $2, updated_at = $1
           WHERE order_id = $3`, [cancelled_at, cancellation_reason, order_id]);
            }
            await client.query(`INSERT INTO order_status_history (history_id, order_id, status, changed_by_user_id, changed_at, notes)
         VALUES ($1,$2,$3,$4,$5,$6)`, [gen_id('osh'), order_id, 'cancelled', req.user.user_id, cancelled_at, cancellation_reason]);
            await client.query('COMMIT');
            // WS events.
            io.to('staff').emit('order_cancelled', {
                event: 'order_cancelled',
                data: {
                    order_id,
                    order_number: ord.order_number,
                    cancelled_by: 'customer',
                    cancellation_reason,
                    cancelled_at,
                },
                timestamp: now_iso(),
            });
            io.to(`customer_${req.user.user_id}`).emit('order_cancelled', {
                event: 'order_cancelled',
                data: {
                    order_id,
                    order_number: ord.order_number,
                    refund_amount,
                    message: 'Your order has been cancelled.',
                },
                timestamp: now_iso(),
            });
            return ok(res, 200, { message: 'Order cancelled successfully' });
        });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        }
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
// Customer download invoice for their order
app.get('/api/orders/:id/invoice', authenticate_token, async (req, res) => {
    try {
        const identifier = req.params.id;
        // Support both order_id (ord_xxx) and order_number (ORD-2024-0005)
        const order_res = await pool.query('SELECT order_id, user_id, order_number, invoice_url FROM orders WHERE (order_id = $1 OR order_number = $1) AND user_id = $2', [identifier, req.user.user_id]);
        if (order_res.rows.length === 0) {
            return res.status(404).json(createErrorResponse('Order not found', null, 'NOT_FOUND', req.request_id));
        }
        const order = order_res.rows[0];
        // Find the invoice for this order
        const invoice_res = await pool.query('SELECT invoice_id, invoice_pdf_url FROM invoices WHERE order_id = $1', [order.order_id]);
        if (invoice_res.rows.length === 0) {
            return res.status(404).json(createErrorResponse('Invoice not found for this order', null, 'NOT_FOUND', req.request_id));
        }
        const invoice = invoice_res.rows[0];
        let pdf_url = invoice.invoice_pdf_url;
        // Generate PDF if not exists
        if (!pdf_url) {
            pdf_url = await generate_invoice_pdf({ invoice_id: invoice.invoice_id });
        }
        if (!pdf_url) {
            return res.status(500).json(createErrorResponse('Unable to generate invoice', null, 'INVOICE_GENERATION_FAILED', req.request_id));
        }
        // If local storage, stream the file
        if (pdf_url.startsWith('/storage/')) {
            const file_path = path.join(storage_dir, pdf_url.replace('/storage/', ''));
            if (!fs.existsSync(file_path)) {
                // Attempt regeneration
                const regenerated_url = await generate_invoice_pdf({ invoice_id: invoice.invoice_id });
                if (regenerated_url && regenerated_url.startsWith('/storage/')) {
                    const fp2 = path.join(storage_dir, regenerated_url.replace('/storage/', ''));
                    if (fs.existsSync(fp2)) {
                        return res.download(fp2);
                    }
                }
                return res.status(404).json(createErrorResponse('Invoice file not found', null, 'NOT_FOUND', req.request_id));
            }
            return res.download(file_path);
        }
        // External URL - redirect
        return res.redirect(pdf_url);
    }
    catch (error) {
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
/**
 * PROFILE
 */
app.get('/api/profile', authenticate_token, async (req, res) => {
    try {
        const user_res = await pool.query(`SELECT u.*,
              la.current_points_balance,
              la.total_points_earned,
              la.referral_count
       FROM users u
       LEFT JOIN loyalty_accounts la ON la.user_id = u.user_id
       WHERE u.user_id = $1`, [req.user.user_id]);
        const u = user_res.rows[0];
        const stats_res = await pool.query(`SELECT COUNT(*)::int as total_orders, COALESCE(SUM(total_amount), 0) as total_spent
       FROM orders
       WHERE user_id = $1 AND status = 'completed'`, [req.user.user_id]);
        const total_spent = Number(stats_res.rows[0].total_spent ?? 0);
        return ok(res, 200, {
            user_id: u.user_id,
            email: u.email,
            phone: u.phone,
            first_name: u.first_name,
            last_name: u.last_name,
            role: u.role,
            email_verified: u.email_verified,
            status: u.status,
            dietary_preferences: u.dietary_preferences ?? null,
            marketing_opt_in: u.marketing_opt_in,
            order_notifications_email: u.order_notifications_email,
            order_notifications_sms: u.order_notifications_sms,
            marketing_emails: u.marketing_emails,
            marketing_sms: u.marketing_sms,
            newsletter_subscribed: u.newsletter_subscribed,
            referral_code: u.referral_code,
            first_order_discount_code: u.first_order_discount_code,
            first_order_discount_used: u.first_order_discount_used,
            loyalty_account: u.current_points_balance !== null && u.current_points_balance !== undefined ? {
                current_points_balance: Number(u.current_points_balance),
                total_points_earned: Number(u.total_points_earned ?? 0),
                referral_count: Number(u.referral_count ?? 0),
            } : null,
            stats: {
                total_orders: Number(stats_res.rows[0].total_orders ?? 0),
                total_spent: Number(total_spent.toFixed(2)),
            },
        });
    }
    catch (error) {
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
app.put('/api/profile', authenticate_token, async (req, res) => {
    try {
        const input = updateUserInputSchema
            .omit({ user_id: true })
            .partial()
            .parse({ ...req.body });
        const fields = [];
        const params = [];
        const allowed = [
            'email',
            'phone',
            'first_name',
            'last_name',
            'profile_photo_url',
            'marketing_opt_in',
            'order_notifications_email',
            'order_notifications_sms',
            'marketing_emails',
            'marketing_sms',
            'newsletter_subscribed',
            'dietary_preferences',
        ];
        for (const k of allowed) {
            if (input[k] === undefined)
                continue;
            params.push(k === 'email' && typeof input[k] === 'string' ? input[k].toLowerCase().trim() : input[k]);
            if (k === 'dietary_preferences') {
                fields.push(`${k} = $${params.length}::jsonb`);
            }
            else {
                fields.push(`${k} = $${params.length}`);
            }
        }
        if (fields.length === 0) {
            return res.status(400).json(createErrorResponse('No fields to update', null, 'NO_UPDATES', req.request_id));
        }
        params.push(req.user.user_id);
        await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE user_id = $${params.length}`, params);
        // If email changed, require re-verification.
        if (input.email) {
            await pool.query('UPDATE users SET email_verified = false WHERE user_id = $1', [req.user.user_id]);
            const token = nanoid(64);
            await pool.query(`INSERT INTO email_verifications (verification_id, user_id, verification_token, created_at, expires_at, verified_at)
         VALUES ($1,$2,$3,$4,$5,NULL)`, [gen_id('ver'), req.user.user_id, token, now_iso(), new Date(Date.now() + 24 * 3600 * 1000).toISOString()]);
            send_email_mock({ to: input.email.toLowerCase().trim(), subject: 'Verify your new email', body: `Verification token: ${token}` }).catch(() => { });
        }
        // Return updated profile.
        req.user = (await pool.query('SELECT user_id, email, first_name, last_name, role, status, email_verified, last_login_at FROM users WHERE user_id = $1', [req.user.user_id])).rows[0];
        return ok(res, 200, { message: 'Profile updated successfully' });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        }
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
app.put('/api/profile/password', authenticate_token, async (req, res) => {
    try {
        const { current_password, new_password } = profile_password_change_schema.parse(req.body);
        const u_res = await pool.query('SELECT email, password_hash FROM users WHERE user_id = $1', [req.user.user_id]);
        if (u_res.rows.length === 0)
            return res.status(404).json(createErrorResponse('User not found', null, 'NOT_FOUND', req.request_id));
        if (String(u_res.rows[0].password_hash) !== String(current_password)) {
            return res.status(400).json(createErrorResponse('Current password is incorrect', null, 'INVALID_PASSWORD', req.request_id));
        }
        await pool.query('UPDATE users SET password_hash = $1 WHERE user_id = $2', [new_password, req.user.user_id]);
        send_email_mock({ to: u_res.rows[0].email, subject: 'Password Changed', body: 'Your password was changed.' }).catch(() => { });
        return ok(res, 200, { message: 'Password changed successfully' });
    }
    catch (error) {
        if (error instanceof z.ZodError)
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
app.delete('/api/profile', authenticate_token, async (req, res) => {
    try {
        const { password } = profile_delete_schema.parse(req.body);
        const u_res = await pool.query('SELECT password_hash FROM users WHERE user_id = $1', [req.user.user_id]);
        if (u_res.rows.length === 0)
            return res.status(404).json(createErrorResponse('User not found', null, 'NOT_FOUND', req.request_id));
        if (String(u_res.rows[0].password_hash) !== String(password)) {
            return res.status(400).json(createErrorResponse('Password verification failed', null, 'INVALID_PASSWORD', req.request_id));
        }
        await with_client(async (client) => {
            await client.query('BEGIN');
            const uid = req.user.user_id;
            await client.query(`UPDATE users SET
          email = 'deleted_' || user_id || '@deleted.local',
          phone = 'deleted',
          first_name = '[Deleted]',
          last_name = 'User',
          password_hash = 'deleted',
          profile_photo_url = NULL,
          status = 'deleted',
          dietary_preferences = NULL,
          referral_code = NULL,
          marketing_opt_in = false,
          marketing_emails = false,
          marketing_sms = false,
          newsletter_subscribed = false
         WHERE user_id = $1`, [uid]);
            await client.query(`UPDATE orders SET
          customer_name = '[Deleted User]',
          customer_email = 'deleted@deleted.local',
          customer_phone = 'deleted',
          special_instructions = NULL
         WHERE user_id = $1`, [uid]);
            await client.query('DELETE FROM addresses WHERE user_id = $1', [uid]);
            await client.query('DELETE FROM payment_methods WHERE user_id = $1', [uid]);
            await client.query(`UPDATE catering_inquiries SET
          contact_name = '[Deleted User]',
          contact_email = 'deleted@deleted.local',
          contact_phone = 'deleted',
          company_name = NULL
         WHERE user_id = $1`, [uid]);
            await client.query('COMMIT');
        });
        return ok(res, 200, { message: 'Account deleted successfully' });
    }
    catch (error) {
        if (error instanceof z.ZodError)
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
/**
 * PAYMENT METHODS
 */
// GET all payment methods for the authenticated user
app.get('/api/payment-methods', authenticate_token, async (req, res) => {
    try {
        const rows = await pool.query(`SELECT payment_method_id, user_id, card_type, last_four_digits, expiry_month, expiry_year, cardholder_name, is_default, created_at
       FROM payment_methods
       WHERE user_id = $1
       ORDER BY is_default DESC, created_at DESC`, [req.user.user_id]);
        const payment_methods = rows.rows.map((r) => ({
            payment_method_id: r.payment_method_id,
            user_id: r.user_id,
            card_type: r.card_type,
            last_four_digits: r.last_four_digits,
            expiry_month: r.expiry_month,
            expiry_year: r.expiry_year,
            cardholder_name: r.cardholder_name,
            is_default: r.is_default,
            created_at: r.created_at,
        }));
        return ok(res, 200, { payment_methods });
    }
    catch (error) {
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
// POST create a new payment method
app.post('/api/payment-methods', authenticate_token, async (req, res) => {
    try {
        const payment_method_schema = z.object({
            sumup_token: z.string().min(1),
            card_type: z.enum(['Visa', 'Mastercard', 'Amex', 'Discover']),
            last_four_digits: z.string().length(4),
            expiry_month: z.string().length(2),
            expiry_year: z.string().length(4),
            cardholder_name: z.string().min(1).max(100),
            is_default: z.boolean().default(false),
        });
        const input = payment_method_schema.parse(req.body);
        await with_client(async (client) => {
            await client.query('BEGIN');
            // If this is set as default, unset all other defaults for this user
            if (input.is_default) {
                await client.query('UPDATE payment_methods SET is_default = false WHERE user_id = $1', [req.user.user_id]);
            }
            else {
                // If this is the first payment method, make it default
                const existing = await client.query('SELECT COUNT(*)::int as count FROM payment_methods WHERE user_id = $1', [req.user.user_id]);
                if (existing.rows[0].count === 0) {
                    input.is_default = true;
                }
            }
            const payment_method_id = gen_id('pm');
            const created_at = now_iso();
            await client.query(`INSERT INTO payment_methods (
          payment_method_id, user_id, sumup_token, card_type, last_four_digits,
          expiry_month, expiry_year, cardholder_name, is_default, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, [
                payment_method_id,
                req.user.user_id,
                input.sumup_token,
                input.card_type,
                input.last_four_digits,
                input.expiry_month,
                input.expiry_year,
                input.cardholder_name,
                input.is_default,
                created_at,
            ]);
            await client.query('COMMIT');
            return ok(res, 201, {
                payment_method_id,
                user_id: req.user.user_id,
                card_type: input.card_type,
                last_four_digits: input.last_four_digits,
                expiry_month: input.expiry_month,
                expiry_year: input.expiry_year,
                cardholder_name: input.cardholder_name,
                is_default: input.is_default,
                created_at,
            });
        });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        }
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
// DELETE a payment method
app.delete('/api/payment-methods/:id', authenticate_token, async (req, res) => {
    try {
        const payment_method_id = req.params.id;
        await with_client(async (client) => {
            await client.query('BEGIN');
            // Check if payment method exists and belongs to user
            const pm_res = await client.query('SELECT payment_method_id, is_default FROM payment_methods WHERE payment_method_id = $1 AND user_id = $2', [payment_method_id, req.user.user_id]);
            if (pm_res.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json(createErrorResponse('Payment method not found', null, 'NOT_FOUND', req.request_id));
            }
            const was_default = pm_res.rows[0].is_default;
            // Delete the payment method
            await client.query('DELETE FROM payment_methods WHERE payment_method_id = $1 AND user_id = $2', [payment_method_id, req.user.user_id]);
            // If deleted payment method was default, set another one as default
            if (was_default) {
                await client.query(`UPDATE payment_methods
           SET is_default = true
           WHERE user_id = $1
             AND payment_method_id = (
               SELECT payment_method_id FROM payment_methods
               WHERE user_id = $1
               ORDER BY created_at DESC
               LIMIT 1
             )`, [req.user.user_id]);
            }
            await client.query('COMMIT');
            return ok(res, 200, { message: 'Payment method deleted successfully' });
        });
    }
    catch (error) {
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
// PUT set payment method as default
app.put('/api/payment-methods/:id/default', authenticate_token, async (req, res) => {
    try {
        const payment_method_id = req.params.id;
        await with_client(async (client) => {
            await client.query('BEGIN');
            // Check if payment method exists and belongs to user
            const pm_res = await client.query('SELECT payment_method_id FROM payment_methods WHERE payment_method_id = $1 AND user_id = $2', [payment_method_id, req.user.user_id]);
            if (pm_res.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json(createErrorResponse('Payment method not found', null, 'NOT_FOUND', req.request_id));
            }
            // Unset all defaults for this user
            await client.query('UPDATE payment_methods SET is_default = false WHERE user_id = $1', [req.user.user_id]);
            // Set this payment method as default
            await client.query('UPDATE payment_methods SET is_default = true WHERE payment_method_id = $1 AND user_id = $2', [payment_method_id, req.user.user_id]);
            await client.query('COMMIT');
            // Return the updated payment method
            const updated_res = await pool.query(`SELECT payment_method_id, user_id, card_type, last_four_digits, expiry_month, expiry_year, cardholder_name, is_default, created_at
         FROM payment_methods
         WHERE payment_method_id = $1 AND user_id = $2`, [payment_method_id, req.user.user_id]);
            const pm = updated_res.rows[0];
            return ok(res, 200, {
                payment_method_id: pm.payment_method_id,
                user_id: pm.user_id,
                card_type: pm.card_type,
                last_four_digits: pm.last_four_digits,
                expiry_month: pm.expiry_month,
                expiry_year: pm.expiry_year,
                cardholder_name: pm.cardholder_name,
                is_default: pm.is_default,
                created_at: pm.created_at,
            });
        });
    }
    catch (error) {
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
/**
 * NEWSLETTER
 */
app.post('/api/newsletter/subscribe', async (req, res) => {
    try {
        const body = createNewsletterSubscriberInputSchema.parse(req.body);
        const email = body.email.toLowerCase().trim();
        const existing = await pool.query('SELECT * FROM newsletter_subscribers WHERE email = $1', [email]);
        if (existing.rows.length === 0) {
            await pool.query(`INSERT INTO newsletter_subscribers (subscriber_id, email, subscribed_at, status, user_id)
         VALUES ($1,$2,$3,'subscribed',$4)`, [gen_id('sub'), email, now_iso(), body.user_id ?? null]);
            send_email_mock({ to: email, subject: 'Welcome to Salama Lama Newsletter', body: 'Thanks for subscribing!' }).catch(() => { });
            return ok(res, 200, { message: 'Successfully subscribed to newsletter' });
        }
        const status = existing.rows[0].status;
        if (status === 'subscribed') {
            return res.status(400).json(createErrorResponse("This email is already subscribed", null, 'ALREADY_SUBSCRIBED', req.request_id));
        }
        await pool.query('UPDATE newsletter_subscribers SET status = $1, subscribed_at = $2 WHERE email = $3', ['subscribed', now_iso(), email]);
        return ok(res, 200, { message: 'Successfully subscribed to newsletter' });
    }
    catch (error) {
        if (error instanceof z.ZodError)
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
/**
 * CONTACT MESSAGES
 * Public endpoint for contact form submissions
 */
// POST /api/contact - Submit a contact message (public)
app.post('/api/contact', async (req, res) => {
    try {
        const input = createContactMessageInputSchema.parse(req.body);
        const message_id = gen_id('msg');
        const created_at = now_iso();
        const ip_address = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
        const user_agent = req.headers['user-agent'] || null;
        await pool.query(`INSERT INTO contact_messages (
        message_id, name, email, phone, subject, message,
        status, ip_address, user_agent, created_at, read_at, archived_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`, [
            message_id,
            input.name.trim(),
            input.email.toLowerCase().trim(),
            input.phone?.trim() || null,
            input.subject.trim(),
            input.message.trim(),
            'new',
            ip_address,
            user_agent,
            created_at,
            null,
            null,
        ]);
        // Notify admin via WebSocket
        io.to('admin').emit('new_contact_message', {
            event: 'new_contact_message',
            data: {
                message_id,
                name: input.name.trim(),
                email: input.email.toLowerCase().trim(),
                subject: input.subject.trim(),
                created_at,
            },
            timestamp: now_iso(),
        });
        // Send confirmation email to customer (mocked)
        send_email_mock({
            to: input.email.toLowerCase().trim(),
            subject: 'We received your message - Salama Lama',
            body: `Hi ${input.name},\n\nThank you for contacting us! We've received your message and will get back to you within 24-48 hours.\n\nSubject: ${input.subject}\n\nBest regards,\nSalama Lama Team`,
        }).catch(() => { });
        // Notify admin via email (mocked)
        send_email_mock({
            to: 'admin@coffeeshop.ie',
            subject: `New Contact Form Submission: ${input.subject}`,
            body: `New contact message received:\n\nFrom: ${input.name}\nEmail: ${input.email}\nPhone: ${input.phone || 'N/A'}\nSubject: ${input.subject}\n\nMessage:\n${input.message}`,
        }).catch(() => { });
        return ok(res, 201, {
            message: 'Message received. We\'ll get back to you soon!',
            data: { id: message_id },
        });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        }
        console.error('Contact form submission error:', error);
        return res.status(500).json(createErrorResponse('Failed to submit message. Please try again.', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
// GET /api/admin/contact-messages - List contact messages (admin only)
app.get('/api/admin/contact-messages', authenticate_token, require_role(['admin', 'staff']), async (req, res) => {
    try {
        const search = parse_query(searchContactMessageInputSchema, req.query);
        const where = [];
        const params = [];
        if (search.status) {
            params.push(search.status);
            where.push(`status = $${params.length}`);
        }
        if (search.q) {
            params.push(`%${search.q}%`);
            where.push(`(name ILIKE $${params.length} OR email ILIKE $${params.length} OR subject ILIKE $${params.length} OR message ILIKE $${params.length})`);
        }
        const where_sql = where.length ? `WHERE ${where.join(' AND ')}` : '';
        // Get total count
        const count_res = await pool.query(`SELECT COUNT(*)::int as count FROM contact_messages ${where_sql}`, params);
        const total = count_res.rows[0]?.count ?? 0;
        // Get messages
        const sort_by_map = {
            created_at: 'created_at',
            email: 'email',
            subject: 'subject',
        };
        const sort_by = sort_by_map[search.sort_by] || 'created_at';
        const sort_order = search.sort_order === 'asc' ? 'ASC' : 'DESC';
        params.push(search.limit);
        params.push(search.offset);
        const messages_res = await pool.query(`SELECT * FROM contact_messages ${where_sql}
       ORDER BY ${sort_by} ${sort_order}
       LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
        const messages = messages_res.rows.map(row => contactMessageSchema.parse({
            ...row,
            phone: row.phone ?? null,
            ip_address: row.ip_address ?? null,
            user_agent: row.user_agent ?? null,
            read_at: row.read_at ?? null,
            archived_at: row.archived_at ?? null,
        }));
        return ok(res, 200, {
            messages,
            total,
            limit: search.limit,
            offset: search.offset,
        });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        }
        console.error('Error fetching contact messages:', error);
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
// GET /api/admin/contact-messages/:message_id - Get single contact message (admin only)
app.get('/api/admin/contact-messages/:message_id', authenticate_token, require_role(['admin', 'staff']), async (req, res) => {
    try {
        const { message_id } = req.params;
        const result = await pool.query('SELECT * FROM contact_messages WHERE message_id = $1', [message_id]);
        if (result.rows.length === 0) {
            return res.status(404).json(createErrorResponse('Message not found', null, 'NOT_FOUND', req.request_id));
        }
        const row = result.rows[0];
        const message = contactMessageSchema.parse({
            ...row,
            phone: row.phone ?? null,
            ip_address: row.ip_address ?? null,
            user_agent: row.user_agent ?? null,
            read_at: row.read_at ?? null,
            archived_at: row.archived_at ?? null,
        });
        // Auto-mark as read when viewed
        if (row.status === 'new') {
            await pool.query('UPDATE contact_messages SET status = $1, read_at = $2 WHERE message_id = $3', ['read', now_iso(), message_id]);
            message.status = 'read';
            message.read_at = now_iso();
        }
        return ok(res, 200, { message });
    }
    catch (error) {
        console.error('Error fetching contact message:', error);
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
// PATCH /api/admin/contact-messages/:message_id - Update contact message status (admin only)
app.patch('/api/admin/contact-messages/:message_id', authenticate_token, require_role(['admin', 'staff']), async (req, res) => {
    try {
        const { message_id } = req.params;
        const input = updateContactMessageInputSchema.parse({ ...req.body, message_id });
        // Check if message exists
        const existing = await pool.query('SELECT * FROM contact_messages WHERE message_id = $1', [message_id]);
        if (existing.rows.length === 0) {
            return res.status(404).json(createErrorResponse('Message not found', null, 'NOT_FOUND', req.request_id));
        }
        const updates = [];
        const params = [];
        if (input.status === 'read') {
            params.push('read');
            updates.push(`status = $${params.length}`);
            if (!existing.rows[0].read_at) {
                params.push(now_iso());
                updates.push(`read_at = $${params.length}`);
            }
        }
        else if (input.status === 'archived') {
            params.push('archived');
            updates.push(`status = $${params.length}`);
            params.push(now_iso());
            updates.push(`archived_at = $${params.length}`);
        }
        else if (input.status === 'new') {
            params.push('new');
            updates.push(`status = $${params.length}`);
        }
        params.push(message_id);
        await pool.query(`UPDATE contact_messages SET ${updates.join(', ')} WHERE message_id = $${params.length}`, params);
        // Fetch updated message
        const updated = await pool.query('SELECT * FROM contact_messages WHERE message_id = $1', [message_id]);
        const row = updated.rows[0];
        const message = contactMessageSchema.parse({
            ...row,
            phone: row.phone ?? null,
            ip_address: row.ip_address ?? null,
            user_agent: row.user_agent ?? null,
            read_at: row.read_at ?? null,
            archived_at: row.archived_at ?? null,
        });
        // Log activity
        await log_activity({
            user_id: req.user.user_id,
            action_type: 'update',
            entity_type: 'contact_message',
            entity_id: message_id,
            description: `Updated contact message status to ${input.status}`,
            changes: { status: { from: existing.rows[0].status, to: input.status } },
            ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress || null,
            user_agent: req.headers['user-agent'] || null,
        });
        return ok(res, 200, { message });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        }
        console.error('Error updating contact message:', error);
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
// GET /api/admin/notifications/summary - Get notification counts for admin (admin only)
app.get('/api/admin/notifications/summary', authenticate_token, require_role(['admin', 'staff']), async (req, res) => {
    try {
        // Get new contact messages count
        const contact_res = await pool.query("SELECT COUNT(*)::int as count FROM contact_messages WHERE status = 'new'");
        const contact_new_count = contact_res.rows[0]?.count ?? 0;
        // Get new catering inquiries count
        const catering_res = await pool.query("SELECT COUNT(*)::int as count FROM catering_inquiries WHERE status = 'new'");
        const catering_new_count = catering_res.rows[0]?.count ?? 0;
        // Get pending orders count (orders that need attention)
        const orders_res = await pool.query("SELECT COUNT(*)::int as count FROM orders WHERE status IN ('received', 'preparing')");
        const orders_pending_count = orders_res.rows[0]?.count ?? 0;
        return ok(res, 200, {
            contact_new_count,
            catering_new_count,
            orders_pending_count,
            total_new: contact_new_count + catering_new_count,
        });
    }
    catch (error) {
        console.error('Error fetching notification summary:', error);
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
/**
 * CATERING
 */
app.get('/api/catering/info', async (req, res) => {
    try {
        const info = await get_setting('catering_info', null);
        if (info) {
            return ok(res, 200, info);
        }
        return ok(res, 200, {
            description: 'We cater events of all sizes across Dublin.',
            event_types: ['corporate', 'wedding', 'birthday', 'festival', 'meeting'],
            packages: [
                { name: 'Standard', description: 'Perfect for small gatherings', min_guests: 15, price_per_person: 15.0 },
                { name: 'Premium', description: 'Great for corporate events', min_guests: 30, price_per_person: 20.0 },
            ],
        });
    }
    catch (error) {
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
const catering_upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, storage_catering_attachments_dir),
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname || '').slice(0, 10);
            cb(null, `${Date.now()}_${nanoid(8)}${ext}`);
        },
    }),
    limits: { fileSize: 10 * 1024 * 1024, files: 3 },
});
app.post('/api/catering/inquiry', (req, res, next) => {
    const ct = req.headers['content-type'] || '';
    if (ct.includes('multipart/form-data')) {
        return catering_upload.array('attachments', 3)(req, res, next);
    }
    return express.json({ limit: '10mb' })(req, res, next);
}, async (req, res) => {
    try {
        let payload_raw = req.body;
        // If multipart, fields are strings; coerce where needed.
        if (req.files && Array.isArray(req.files)) {
            // Attach files as URLs.
            const urls = req.files.map((f) => `/storage/catering_attachments/${encodeURIComponent(f.filename)}`);
            payload_raw = { ...payload_raw, attached_files: urls };
        }
        // Trim email field to handle whitespace
        if (payload_raw.contact_email !== undefined && typeof payload_raw.contact_email === 'string') {
            payload_raw.contact_email = payload_raw.contact_email.trim();
        }
        if (payload_raw.guest_count !== undefined)
            payload_raw.guest_count = Number(payload_raw.guest_count);
        if (payload_raw.guest_count_min !== undefined && payload_raw.guest_count_min !== null && payload_raw.guest_count_min !== '')
            payload_raw.guest_count_min = Number(payload_raw.guest_count_min);
        if (payload_raw.guest_count_max !== undefined && payload_raw.guest_count_max !== null && payload_raw.guest_count_max !== '')
            payload_raw.guest_count_max = Number(payload_raw.guest_count_max);
        if (payload_raw.marketing_opt_in !== undefined)
            payload_raw.marketing_opt_in = payload_raw.marketing_opt_in === true || payload_raw.marketing_opt_in === 'true';
        // dietary_requirements can come as comma-separated string.
        if (typeof payload_raw.dietary_requirements === 'string' && payload_raw.dietary_requirements.includes(',')) {
            payload_raw.dietary_requirements = payload_raw.dietary_requirements.split(',').map((x) => x.trim()).filter(Boolean);
        }
        const input = createCateringInquiryInputSchema.parse(payload_raw);
        await with_client(async (client) => {
            await client.query('BEGIN');
            const inquiry_id = gen_id('ci');
            const inquiry_number = `CAT-${String(Math.floor(Date.now() / 1000)).slice(-6)}-${nanoid(4).toUpperCase()}`;
            const ts = now_iso();
            await client.query(`INSERT INTO catering_inquiries (
          inquiry_id, inquiry_number, user_id,
          contact_name, contact_email, contact_phone, company_name,
          event_type, event_type_other, event_date, event_start_time, event_end_time,
          event_location_address, event_location_city, event_location_postal_code, event_location_type,
          guest_count, guest_count_min, guest_count_max,
          dietary_requirements, dietary_notes, menu_preferences, preferred_package,
          budget_range, additional_details, attached_files, marketing_opt_in,
          status, admin_notes, submitted_at, updated_at
        ) VALUES (
          $1,$2,$3,
          $4,$5,$6,$7,
          $8,$9,$10,$11,$12,
          $13,$14,$15,$16,
          $17,$18,$19,
          $20::jsonb,$21,$22,$23,
          $24,$25,$26::jsonb,$27,
          $28,$29,$30,$31
        )`, [
                inquiry_id,
                inquiry_number,
                input.user_id ?? null,
                input.contact_name,
                input.contact_email,
                input.contact_phone,
                input.company_name ?? null,
                input.event_type,
                input.event_type_other ?? null,
                input.event_date,
                input.event_start_time,
                input.event_end_time,
                input.event_location_address,
                input.event_location_city,
                input.event_location_postal_code,
                input.event_location_type,
                input.guest_count,
                input.guest_count_min ?? null,
                input.guest_count_max ?? null,
                input.dietary_requirements ? JSON.stringify(input.dietary_requirements) : null,
                input.dietary_notes ?? null,
                input.menu_preferences ?? null,
                input.preferred_package ?? null,
                input.budget_range ?? null,
                input.additional_details ?? null,
                input.attached_files ? JSON.stringify(input.attached_files) : JSON.stringify([]),
                input.marketing_opt_in ?? false,
                'new',
                null,
                ts,
                ts,
            ]);
            await client.query('COMMIT');
            // Notify admin via WS.
            io.to('admin').emit('new_catering_inquiry', {
                event: 'new_catering_inquiry',
                data: {
                    inquiry_id,
                    inquiry_number,
                    contact_name: input.contact_name,
                    contact_email: input.contact_email,
                    contact_phone: input.contact_phone,
                    event_type: input.event_type,
                    event_date: input.event_date,
                    guest_count: input.guest_count,
                    budget_range: input.budget_range ?? null,
                    submitted_at: ts,
                },
                timestamp: now_iso(),
            });
            // Send confirmation email.
            send_email_mock({
                to: input.contact_email,
                subject: `Catering inquiry received (${inquiry_number})`,
                body: `Thanks for your inquiry. Reference: ${inquiry_number}`,
            }).catch(() => { });
            return ok(res, 201, { message: 'Inquiry submitted successfully', inquiry_id, inquiry_number });
        });
    }
    catch (error) {
        if (error instanceof z.ZodError)
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
app.get('/api/catering/inquiries', authenticate_token, async (req, res) => {
    try {
        const schema = z.object({ status: z.string().optional() });
        const { status } = parse_query(schema, req.query);
        const params = [req.user.user_id];
        let where = 'WHERE user_id = $1';
        if (status) {
            params.push(status);
            where += ` AND status = $${params.length}`;
        }
        const inq_res = await pool.query(`SELECT * FROM catering_inquiries ${where} ORDER BY submitted_at DESC`, params);
        const inquiry_ids = inq_res.rows.map((r) => r.inquiry_id);
        const quotes_res = inquiry_ids.length
            ? await pool.query('SELECT * FROM catering_quotes WHERE inquiry_id = ANY($1) ORDER BY created_at DESC', [inquiry_ids])
            : { rows: [] };
        const quotes_by_inquiry = new Map();
        for (const q of quotes_res.rows) {
            if (!quotes_by_inquiry.has(q.inquiry_id))
                quotes_by_inquiry.set(q.inquiry_id, []);
            quotes_by_inquiry.get(q.inquiry_id).push({
                ...q,
                subtotal: Number(q.subtotal),
                tax_amount: Number(q.tax_amount),
                grand_total: Number(q.grand_total),
                line_items: q.line_items ?? [],
                additional_fees: q.additional_fees ?? null,
                terms: q.terms ?? null,
                quote_pdf_url: q.quote_pdf_url ?? null,
                sent_at: q.sent_at ?? null,
                accepted_at: q.accepted_at ?? null,
            });
        }
        const inquiries = inq_res.rows.map((r) => {
            const parsed = cateringInquirySchema.parse({
                ...r,
                user_id: r.user_id ?? null,
                company_name: r.company_name ?? null,
                event_type_other: r.event_type_other ?? null,
                guest_count_min: r.guest_count_min ?? null,
                guest_count_max: r.guest_count_max ?? null,
                dietary_requirements: r.dietary_requirements ?? null,
                dietary_notes: r.dietary_notes ?? null,
                menu_preferences: r.menu_preferences ?? null,
                preferred_package: r.preferred_package ?? null,
                budget_range: r.budget_range ?? null,
                additional_details: r.additional_details ?? null,
                attached_files: r.attached_files ?? null,
                admin_notes: r.admin_notes ?? null,
            });
            return {
                ...parsed,
                quotes: (quotes_by_inquiry.get(parsed.inquiry_id) || []).map((q) => cateringQuoteSchema.parse(q)),
            };
        });
        return ok(res, 200, { inquiries });
    }
    catch (error) {
        if (error instanceof z.ZodError)
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
/**
 * INVOICE DOWNLOAD
 */
app.get('/api/invoices/:id/download', authenticate_token, async (req, res) => {
    try {
        const invoice_id = req.params.id;
        const inv_res = await pool.query('SELECT * FROM invoices WHERE invoice_id = $1', [invoice_id]);
        if (inv_res.rows.length === 0) {
            return res.status(404).json(createErrorResponse('Invoice not found', null, 'NOT_FOUND', req.request_id));
        }
        const inv = inv_res.rows[0];
        if (inv.user_id !== req.user.user_id && req.user.role !== 'admin') {
            return res.status(403).json(createErrorResponse('Insufficient permissions', null, 'AUTH_FORBIDDEN', req.request_id));
        }
        let url = inv.invoice_pdf_url;
        if (!url) {
            url = await generate_invoice_pdf({ invoice_id });
        }
        if (!url) {
            return res.status(500).json(createErrorResponse('Unable to generate invoice', null, 'INVOICE_GENERATION_FAILED', req.request_id));
        }
        // If local, stream file. If external, redirect.
        if (url.startsWith('/storage/')) {
            const file_path = path.join(storage_dir, url.replace('/storage/', ''));
            if (!fs.existsSync(file_path)) {
                // Attempt regeneration.
                const regenerated_url = await generate_invoice_pdf({ invoice_id });
                if (regenerated_url && regenerated_url.startsWith('/storage/')) {
                    const fp2 = path.join(storage_dir, regenerated_url.replace('/storage/', ''));
                    return res.download(fp2);
                }
                return res.status(404).json(createErrorResponse('Invoice file not found', null, 'NOT_FOUND', req.request_id));
            }
            return res.download(file_path);
        }
        return res.redirect(url);
    }
    catch (error) {
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
/**
 * LOYALTY
 */
// Get full loyalty account info (used by frontend dashboard)
app.get('/api/loyalty', authenticate_token, async (req, res) => {
    try {
        const la_res = await pool.query('SELECT * FROM loyalty_accounts WHERE user_id = $1', [req.user.user_id]);
        if (la_res.rows.length === 0) {
            return ok(res, 200, {
                loyalty_account_id: null,
                user_id: req.user.user_id,
                current_points_balance: 0,
                total_points_earned: 0,
                total_points_redeemed: 0,
                total_points_expired: 0,
                referral_count: 0,
                spin_wheel_available_count: 0,
                next_spin_available_at: null,
                created_at: now_iso(),
            });
        }
        const la = {
            ...la_res.rows[0],
            current_points_balance: Number(la_res.rows[0].current_points_balance),
            total_points_earned: Number(la_res.rows[0].total_points_earned),
            total_points_redeemed: Number(la_res.rows[0].total_points_redeemed),
            total_points_expired: Number(la_res.rows[0].total_points_expired),
            referral_count: Number(la_res.rows[0].referral_count),
            spin_wheel_available_count: Number(la_res.rows[0].spin_wheel_available_count),
        };
        return ok(res, 200, la);
    }
    catch (error) {
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
app.get('/api/loyalty/balance', authenticate_token, async (req, res) => {
    try {
        const la_res = await pool.query('SELECT * FROM loyalty_accounts WHERE user_id = $1', [req.user.user_id]);
        if (la_res.rows.length === 0)
            return ok(res, 200, { current_points_balance: 0, total_points_earned: 0, total_points_redeemed: 0 });
        const la = loyaltyAccountSchema.parse({
            ...la_res.rows[0],
            current_points_balance: Number(la_res.rows[0].current_points_balance),
            total_points_earned: Number(la_res.rows[0].total_points_earned),
            total_points_redeemed: Number(la_res.rows[0].total_points_redeemed),
            total_points_expired: Number(la_res.rows[0].total_points_expired),
            referral_count: Number(la_res.rows[0].referral_count),
            spin_wheel_available_count: Number(la_res.rows[0].spin_wheel_available_count),
        });
        return ok(res, 200, { loyalty_account: la });
    }
    catch (error) {
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
// Get points transaction history
app.get('/api/loyalty/points/history', authenticate_token, async (req, res) => {
    try {
        const schema = z.object({
            limit: z.number().int().positive().max(100).default(50),
            offset: z.number().int().nonnegative().default(0),
        });
        const { limit, offset } = parse_query(schema, req.query);
        const la_res = await pool.query('SELECT loyalty_account_id FROM loyalty_accounts WHERE user_id = $1', [req.user.user_id]);
        if (la_res.rows.length === 0) {
            return ok(res, 200, { transactions: [], total: 0 });
        }
        const loyalty_account_id = la_res.rows[0].loyalty_account_id;
        const count_res = await pool.query('SELECT COUNT(*)::int as count FROM points_transactions WHERE loyalty_account_id = $1', [loyalty_account_id]);
        const total = count_res.rows[0]?.count ?? 0;
        const txns_res = await pool.query(`SELECT * FROM points_transactions 
       WHERE loyalty_account_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`, [loyalty_account_id, limit, offset]);
        const transactions = txns_res.rows.map((t) => ({
            ...t,
            points_amount: Number(t.points_amount),
            running_balance: Number(t.running_balance),
        }));
        return ok(res, 200, { transactions, total });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        }
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
// Get redeemed rewards
app.get('/api/loyalty/redeemed-rewards', authenticate_token, async (req, res) => {
    try {
        const la_res = await pool.query('SELECT loyalty_account_id FROM loyalty_accounts WHERE user_id = $1', [req.user.user_id]);
        if (la_res.rows.length === 0) {
            return ok(res, 200, { redeemed_rewards: [] });
        }
        const loyalty_account_id = la_res.rows[0].loyalty_account_id;
        const rewards_res = await pool.query(`SELECT * FROM redeemed_rewards 
       WHERE loyalty_account_id = $1 
       ORDER BY redeemed_at DESC`, [loyalty_account_id]);
        const redeemed_rewards = rewards_res.rows.map((r) => ({
            ...r,
            points_deducted: Number(r.points_deducted),
        }));
        return ok(res, 200, { redeemed_rewards });
    }
    catch (error) {
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
// Get referral info
app.get('/api/loyalty/referral', authenticate_token, async (req, res) => {
    try {
        const user_res = await pool.query('SELECT referral_code FROM users WHERE user_id = $1', [req.user.user_id]);
        const referral_code = user_res.rows[0]?.referral_code || '';
        const la_res = await pool.query('SELECT referral_count FROM loyalty_accounts WHERE user_id = $1', [req.user.user_id]);
        const referral_count = la_res.rows.length > 0 ? Number(la_res.rows[0].referral_count) : 0;
        // Count successful referrals (users who actually signed up and have loyalty accounts)
        const successful_res = await pool.query('SELECT COUNT(*)::int as count FROM users WHERE referred_by_user_id = $1', [req.user.user_id]);
        const successful_referrals = successful_res.rows[0]?.count ?? 0;
        // Calculate points earned from referrals
        // Assuming referral points are tracked in points_transactions with reason containing "referral"
        const points_res = await pool.query(`SELECT COALESCE(SUM(points_amount), 0)::int as total
       FROM points_transactions pt
       JOIN loyalty_accounts la ON pt.loyalty_account_id = la.loyalty_account_id
       WHERE la.user_id = $1 AND pt.reason ILIKE '%referral%'`, [req.user.user_id]);
        const total_points_earned = points_res.rows[0]?.total ?? 0;
        const referral_link = `${FRONTEND_URL}/register?ref=${referral_code}`;
        return ok(res, 200, {
            referral_code,
            referral_link,
            referral_count,
            successful_referrals,
            total_points_earned,
        });
    }
    catch (error) {
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
app.get('/api/loyalty/rewards', authenticate_token, async (req, res) => {
    try {
        const rewards_res = await pool.query("SELECT * FROM rewards WHERE status = 'active' ORDER BY sort_order ASC, points_cost ASC");
        const rewards = rewards_res.rows.map((r) => rewardSchema.parse({
            ...r,
            points_cost: Number(r.points_cost),
            expiry_days_after_redemption: r.expiry_days_after_redemption ?? null,
            stock_limit: r.stock_limit ?? null,
            stock_remaining: r.stock_remaining ?? null,
            reward_value: r.reward_value ?? {},
            image_url: r.image_url ?? null,
            availability_status: r.availability_status ?? null,
            sort_order: Number(r.sort_order),
            created_at: r.created_at,
            updated_at: r.updated_at,
        }));
        return ok(res, 200, { rewards });
    }
    catch (error) {
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
app.get('/api/loyalty/badges', authenticate_token, async (req, res) => {
    try {
        const all_badges_res = await pool.query('SELECT * FROM badges WHERE is_active = true ORDER BY sort_order ASC, name ASC');
        const la_res = await pool.query('SELECT loyalty_account_id FROM loyalty_accounts WHERE user_id = $1', [req.user.user_id]);
        const loyalty_account_id = la_res.rows[0]?.loyalty_account_id;
        const user_badges_res = loyalty_account_id
            ? await pool.query('SELECT badge_id, earned_at FROM user_badges WHERE loyalty_account_id = $1', [loyalty_account_id])
            : { rows: [] };
        const earned_map = new Map(user_badges_res.rows.map((r) => [r.badge_id, r.earned_at]));
        const badges = all_badges_res.rows.map((b) => {
            const parsed = badgeSchema.parse({
                ...b,
                unlock_criteria: b.unlock_criteria ?? {},
                is_active: b.is_active,
                sort_order: Number(b.sort_order),
            });
            return { ...parsed, earned_at: earned_map.get(parsed.badge_id) || null, is_earned: earned_map.has(parsed.badge_id) };
        });
        // Split into earned and locked for frontend
        const earned = badges.filter((b) => b.is_earned);
        const locked = badges.filter((b) => !b.is_earned);
        return ok(res, 200, { badges, earned, locked });
    }
    catch (error) {
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
// Redeem reward - alternative URL structure for frontend compatibility
app.post('/api/loyalty/rewards/:reward_id/redeem', authenticate_token, async (req, res) => {
    try {
        const reward_id = req.params.reward_id;
        await with_client(async (client) => {
            await client.query('BEGIN');
            const la_res = await client.query('SELECT * FROM loyalty_accounts WHERE user_id = $1 FOR UPDATE', [req.user.user_id]);
            if (la_res.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(400).json(createErrorResponse('Loyalty account not found', null, 'LOYALTY_NOT_FOUND', req.request_id));
            }
            const la = la_res.rows[0];
            const current_points_balance = Number(la.current_points_balance);
            const reward_res = await client.query('SELECT * FROM rewards WHERE reward_id = $1 AND status = $2 FOR UPDATE', [reward_id, 'active']);
            if (reward_res.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json(createErrorResponse('Reward not found', null, 'NOT_FOUND', req.request_id));
            }
            const reward = reward_res.rows[0];
            const points_cost = Number(reward.points_cost);
            if (current_points_balance < points_cost) {
                await client.query('ROLLBACK');
                return res.status(400).json(createErrorResponse('Insufficient points', null, 'INSUFFICIENT_POINTS', req.request_id));
            }
            if (reward.stock_limit !== null && reward.stock_remaining !== null) {
                const remaining = Number(reward.stock_remaining);
                if (remaining <= 0) {
                    await client.query('ROLLBACK');
                    return res.status(400).json(createErrorResponse('Reward is out of stock', null, 'REWARD_OUT_OF_STOCK', req.request_id));
                }
                await client.query('UPDATE rewards SET stock_remaining = stock_remaining - 1, updated_at = $1 WHERE reward_id = $2', [now_iso(), reward_id]);
            }
            const next_balance = current_points_balance - points_cost;
            await client.query('UPDATE loyalty_accounts SET current_points_balance = $1, total_points_redeemed = total_points_redeemed + $2 WHERE loyalty_account_id = $3', [next_balance, points_cost, la.loyalty_account_id]);
            const reward_code = `${reward.name}`.toUpperCase().replace(/[^A-Z0-9]+/g, '').slice(0, 8) + `-${nanoid(6).toUpperCase()}`;
            const expires_at = reward.expiry_days_after_redemption
                ? new Date(Date.now() + Number(reward.expiry_days_after_redemption) * 86400000).toISOString()
                : null;
            const rr_id = gen_id('rr');
            await client.query(`INSERT INTO redeemed_rewards (
          redeemed_reward_id, loyalty_account_id, reward_id, reward_code,
          points_deducted, redeemed_at, expires_at, usage_status, used_in_order_id, used_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,'unused',NULL,NULL)`, [rr_id, la.loyalty_account_id, reward_id, ensure_upper(reward_code), points_cost, now_iso(), expires_at]);
            await client.query(`INSERT INTO points_transactions (
          transaction_id, loyalty_account_id, transaction_type, points_amount,
          order_id, reason, adjusted_by_user_id, running_balance, created_at, expires_at
        ) VALUES ($1,$2,'redeemed',$3,NULL,$4,NULL,$5,$6,NULL)`, [gen_id('pt'), la.loyalty_account_id, -points_cost, `Redeemed: ${reward.name}`, next_balance, now_iso()]);
            await client.query('COMMIT');
            send_email_mock({
                to: req.user.email,
                subject: 'Reward redeemed',
                body: `You redeemed ${reward.name}. Your code: ${ensure_upper(reward_code)}${expires_at ? ` (expires ${expires_at})` : ''}`,
            }).catch(() => { });
            // Return format expected by frontend
            return ok(res, 200, {
                redeemed_reward_id: rr_id,
                loyalty_account_id: la.loyalty_account_id,
                reward_id,
                reward_code: ensure_upper(reward_code),
                points_deducted: points_cost,
                redeemed_at: now_iso(),
                expires_at,
                usage_status: 'unused',
                used_in_order_id: null,
                used_at: null,
            });
        });
    }
    catch (error) {
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
app.post('/api/loyalty/redeem', authenticate_token, async (req, res) => {
    try {
        const schema = z.object({ reward_id: z.string() });
        const { reward_id } = schema.parse(req.body);
        await with_client(async (client) => {
            await client.query('BEGIN');
            const la_res = await client.query('SELECT * FROM loyalty_accounts WHERE user_id = $1 FOR UPDATE', [req.user.user_id]);
            if (la_res.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(400).json(createErrorResponse('Loyalty account not found', null, 'LOYALTY_NOT_FOUND', req.request_id));
            }
            const la = la_res.rows[0];
            const current_points_balance = Number(la.current_points_balance);
            const reward_res = await client.query('SELECT * FROM rewards WHERE reward_id = $1 AND status = $2 FOR UPDATE', [reward_id, 'active']);
            if (reward_res.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json(createErrorResponse('Reward not found', null, 'NOT_FOUND', req.request_id));
            }
            const reward = reward_res.rows[0];
            const points_cost = Number(reward.points_cost);
            if (current_points_balance < points_cost) {
                await client.query('ROLLBACK');
                return res.status(400).json(createErrorResponse('Insufficient points', null, 'INSUFFICIENT_POINTS', req.request_id));
            }
            if (reward.stock_limit !== null && reward.stock_remaining !== null) {
                const remaining = Number(reward.stock_remaining);
                if (remaining <= 0) {
                    await client.query('ROLLBACK');
                    return res.status(400).json(createErrorResponse('Reward is out of stock', null, 'REWARD_OUT_OF_STOCK', req.request_id));
                }
                await client.query('UPDATE rewards SET stock_remaining = stock_remaining - 1, updated_at = $1 WHERE reward_id = $2', [now_iso(), reward_id]);
            }
            const next_balance = current_points_balance - points_cost;
            await client.query('UPDATE loyalty_accounts SET current_points_balance = $1, total_points_redeemed = total_points_redeemed + $2 WHERE loyalty_account_id = $3', [next_balance, points_cost, la.loyalty_account_id]);
            const reward_code = `${reward.name}`.toUpperCase().replace(/[^A-Z0-9]+/g, '').slice(0, 8) + `-${nanoid(6).toUpperCase()}`;
            const expires_at = reward.expiry_days_after_redemption
                ? new Date(Date.now() + Number(reward.expiry_days_after_redemption) * 86400000).toISOString()
                : null;
            const rr_id = gen_id('rr');
            await client.query(`INSERT INTO redeemed_rewards (
          redeemed_reward_id, loyalty_account_id, reward_id, reward_code,
          points_deducted, redeemed_at, expires_at, usage_status, used_in_order_id, used_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,'unused',NULL,NULL)`, [rr_id, la.loyalty_account_id, reward_id, ensure_upper(reward_code), points_cost, now_iso(), expires_at]);
            await client.query(`INSERT INTO points_transactions (
          transaction_id, loyalty_account_id, transaction_type, points_amount,
          order_id, reason, adjusted_by_user_id, running_balance, created_at, expires_at
        ) VALUES ($1,$2,'redeemed',$3,NULL,$4,NULL,$5,$6,NULL)`, [gen_id('pt'), la.loyalty_account_id, -points_cost, `Redeemed: ${reward.name}`, next_balance, now_iso()]);
            await client.query('COMMIT');
            send_email_mock({
                to: req.user.email,
                subject: 'Reward redeemed',
                body: `You redeemed ${reward.name}. Your code: ${ensure_upper(reward_code)}${expires_at ? ` (expires ${expires_at})` : ''}`,
            }).catch(() => { });
            return ok(res, 200, {
                message: 'Reward redeemed',
                reward_code: ensure_upper(reward_code),
                expires_at,
                points_deducted: points_cost,
                new_points_balance: next_balance,
            });
        });
    }
    catch (error) {
        if (error instanceof z.ZodError)
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
/**
 * STAFF
 */
app.get('/api/staff/dashboard', authenticate_token, require_role(['staff', 'admin']), async (req, res) => {
    try {
        // Today metrics.
        const today_prefix = new Date().toISOString().slice(0, 10);
        const totals_res = await pool.query(`SELECT
         COUNT(*)::int as total_orders,
         COUNT(*) FILTER (WHERE status IN ('preparing','ready','out_for_delivery','received'))::int as in_progress,
         COUNT(*) FILTER (WHERE status = 'completed')::int as completed
       FROM orders
       WHERE created_at LIKE $1 || '%'`, [today_prefix]);
        const next_orders_res = await pool.query(`SELECT order_id, order_number, order_type, status, total_amount, customer_name, collection_time_slot, delivery_address_snapshot, created_at
       FROM orders
       WHERE status IN ('received','preparing','ready','out_for_delivery')
       ORDER BY created_at ASC
       LIMIT 5`);
        const low_stock_res = await pool.query(`SELECT item_id, name, current_stock, low_stock_threshold
       FROM menu_items
       WHERE stock_tracked = true AND low_stock_threshold IS NOT NULL AND current_stock <= low_stock_threshold
       ORDER BY current_stock ASC
       LIMIT 10`);
        return ok(res, 200, {
            metrics: {
                total_orders_today: totals_res.rows[0]?.total_orders ?? 0,
                orders_in_progress: totals_res.rows[0]?.in_progress ?? 0,
                orders_completed_today: totals_res.rows[0]?.completed ?? 0,
            },
            next_orders: next_orders_res.rows.map((o) => ({
                order_id: o.order_id,
                order_number: o.order_number,
                order_type: o.order_type,
                status: o.status,
                total_amount: Number(o.total_amount),
                customer_name: o.customer_name,
                collection_time_slot: o.collection_time_slot ?? null,
                delivery_address_snapshot: o.delivery_address_snapshot ?? null,
                created_at: o.created_at,
            })),
            alerts: {
                low_stock_items: low_stock_res.rows.map((i) => ({
                    item_id: i.item_id,
                    item_name: i.name,
                    current_stock: Number(i.current_stock ?? 0),
                    low_stock_threshold: Number(i.low_stock_threshold ?? 0),
                })),
            },
        });
    }
    catch (error) {
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
app.get('/api/staff/orders', authenticate_token, require_role(['staff', 'admin']), async (req, res) => {
    try {
        const q = parse_query(searchOrderInputSchema, req.query);
        const where = ['1=1'];
        const params = [];
        if (q.status) {
            params.push(q.status);
            where.push(`status = $${params.length}`);
        }
        if (q.order_type) {
            params.push(q.order_type);
            where.push(`order_type = $${params.length}`);
        }
        if (q.payment_status) {
            params.push(q.payment_status);
            where.push(`payment_status = $${params.length}`);
        }
        if (q.date_from) {
            params.push(q.date_from);
            where.push(`created_at >= $${params.length}`);
        }
        if (q.date_to) {
            params.push(q.date_to);
            where.push(`created_at <= $${params.length}`);
        }
        params.push(q.limit);
        params.push(q.offset);
        // Use sort_by and sort_order from query parameters
        const validSortColumns = ['created_at', 'updated_at', 'total_amount', 'order_number'];
        const sortColumn = validSortColumns.includes(q.sort_by) ? q.sort_by : 'created_at';
        const sortOrder = q.sort_order === 'desc' ? 'DESC' : 'ASC';
        const rows = await pool.query(`SELECT * FROM orders
       WHERE ${where.join(' AND ')}
       ORDER BY ${sortColumn} ${sortOrder}
       LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
        // Fetch order items for each order
        const ordersWithItems = await Promise.all(rows.rows.map(async (r) => {
            const itemsRes = await pool.query(`SELECT order_item_id, item_id, item_name, quantity, unit_price, selected_customizations
           FROM order_items
           WHERE order_id = $1
           ORDER BY order_item_id`, [r.order_id]);
            return {
                order_id: r.order_id,
                order_number: r.order_number,
                order_type: r.order_type,
                status: r.status,
                customer_name: r.customer_name,
                customer_phone: r.customer_phone,
                collection_time_slot: r.collection_time_slot ?? null,
                delivery_address_snapshot: r.delivery_address_snapshot ?? null,
                special_instructions: r.special_instructions ?? null,
                total_amount: Number(r.total_amount),
                created_at: r.created_at,
                updated_at: r.updated_at,
                items: itemsRes.rows.map((item) => ({
                    order_item_id: item.order_item_id,
                    item_id: item.item_id,
                    item_name: item.item_name,
                    quantity: item.quantity,
                    unit_price: Number(item.unit_price),
                    selected_customizations: item.selected_customizations ?? null,
                })),
            };
        }));
        return ok(res, 200, {
            orders: ordersWithItems,
            limit: q.limit,
            offset: q.offset,
        });
    }
    catch (error) {
        if (error instanceof z.ZodError)
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
// Get individual order details for staff
app.get('/api/staff/orders/:id', authenticate_token, require_role(['staff', 'admin']), async (req, res) => {
    try {
        const order_id = req.params.id;
        const order_res = await pool.query('SELECT * FROM orders WHERE order_id = $1', [order_id]);
        if (order_res.rows.length === 0)
            return res.status(404).json(createErrorResponse('Order not found', null, 'NOT_FOUND', req.request_id));
        const items_res = await pool.query('SELECT * FROM order_items WHERE order_id = $1 ORDER BY item_name ASC', [order_id]);
        const status_res = await pool.query('SELECT * FROM order_status_history WHERE order_id = $1 ORDER BY changed_at ASC', [order_id]);
        return ok(res, 200, {
            ...coerce_numbers({
                ...order_res.rows[0],
                delivery_fee: order_res.rows[0].delivery_fee === null || order_res.rows[0].delivery_fee === undefined ? null : Number(order_res.rows[0].delivery_fee),
                subtotal: Number(order_res.rows[0].subtotal),
                discount_amount: Number(order_res.rows[0].discount_amount),
                tax_amount: Number(order_res.rows[0].tax_amount),
                total_amount: Number(order_res.rows[0].total_amount),
            }, ['subtotal', 'discount_amount', 'tax_amount', 'total_amount', 'delivery_fee']),
            items: items_res.rows.map((r) => ({
                order_item_id: r.order_item_id,
                item_id: r.item_id,
                item_name: r.item_name,
                quantity: Number(r.quantity),
                unit_price: Number(r.unit_price),
                line_total: Number(r.line_total),
                selected_customizations: r.selected_customizations ?? null,
            })),
            status_history: status_res.rows,
        });
    }
    catch (error) {
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
app.put('/api/staff/orders/:id/status', authenticate_token, require_role(['staff', 'manager', 'admin']), require_permission('manage_orders'), async (req, res) => {
    try {
        const order_id = req.params.id;
        const input = updateOrderInputSchema.parse({ ...req.body, order_id });
        await with_client(async (client) => {
            await client.query('BEGIN');
            const ord_res = await client.query('SELECT order_id, order_number, user_id, status, order_type FROM orders WHERE order_id = $1 FOR UPDATE', [order_id]);
            if (ord_res.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json(createErrorResponse('Order not found', null, 'NOT_FOUND', req.request_id));
            }
            const ord = ord_res.rows[0];
            const old_status = ord.status;
            const new_status = input.status ?? old_status;
            // Enforce basic status transition rules.
            const allowed_transitions = {
                received: ['preparing', 'cancelled'],
                preparing: ord.order_type === 'delivery' ? ['out_for_delivery', 'cancelled'] : ['ready', 'cancelled'],
                ready: ['completed', 'cancelled'],
                out_for_delivery: ['completed', 'cancelled'],
                completed: [],
                cancelled: [],
            };
            if (new_status !== old_status) {
                const allowed = allowed_transitions[old_status] || [];
                if (!allowed.includes(new_status)) {
                    await client.query('ROLLBACK');
                    return res.status(400).json(createErrorResponse('Invalid status transition', null, 'INVALID_STATUS_TRANSITION', req.request_id, { from: old_status, to: new_status }));
                }
            }
            await client.query('UPDATE orders SET status = $1, updated_at = $2, completed_at = CASE WHEN $1 = \'completed\' THEN $2 ELSE completed_at END WHERE order_id = $3', [
                new_status,
                now_iso(),
                order_id,
            ]);
            await client.query(`INSERT INTO order_status_history (history_id, order_id, status, changed_by_user_id, changed_at, notes)
         VALUES ($1,$2,$3,$4,$5,$6)`, [gen_id('osh'), order_id, new_status, req.user.user_id, now_iso(), input.internal_notes ?? null]);
            await client.query('COMMIT');
            emit_order_status_updated({
                order_id: ord.order_id,
                order_number: ord.order_number,
                user_id: ord.user_id,
                old_status,
                new_status,
                changed_by_user: req.user,
            });
            // Notifications (mocked).
            if (new_status === 'ready' || new_status === 'out_for_delivery' || new_status === 'completed') {
                const user_res = await pool.query('SELECT customer_email, customer_phone FROM orders WHERE order_id = $1', [order_id]);
                const email = user_res.rows[0]?.customer_email;
                const phone = user_res.rows[0]?.customer_phone;
                if (email)
                    send_email_mock({ to: email, subject: `Order ${ord.order_number} update`, body: `Status updated: ${new_status}` }).catch(() => { });
                if (phone)
                    send_sms_mock({ to: phone, body: `Order ${ord.order_number}: ${new_status}` }).catch(() => { });
            }
            return ok(res, 200, { message: 'Order status updated', order_id, status: new_status });
        });
    }
    catch (error) {
        if (error instanceof z.ZodError)
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
app.get('/api/staff/stock', authenticate_token, require_role(['staff', 'admin']), async (req, res) => {
    try {
        const rows = await pool.query(`SELECT mi.item_id, mi.name, mi.category_id, c.name as category_name,
              mi.stock_tracked, mi.current_stock, mi.low_stock_threshold,
              mi.is_active, mi.image_url
       FROM menu_items mi
       JOIN categories c ON c.category_id = mi.category_id
       ORDER BY c.sort_order ASC, mi.sort_order ASC, mi.name ASC`);
        return ok(res, 200, {
            items: rows.rows.map((r) => ({
                item_id: r.item_id,
                name: r.name,
                category_id: r.category_id,
                category_name: r.category_name,
                stock_tracked: r.stock_tracked,
                current_stock: r.current_stock === null || r.current_stock === undefined ? null : Number(r.current_stock),
                low_stock_threshold: r.low_stock_threshold === null || r.low_stock_threshold === undefined ? null : Number(r.low_stock_threshold),
                is_active: r.is_active,
                image_url: r.image_url,
                status: !r.stock_tracked
                    ? 'not_tracked'
                    : (Number(r.current_stock ?? 0) <= 0)
                        ? 'out_of_stock'
                        : (r.low_stock_threshold !== null && Number(r.current_stock) <= Number(r.low_stock_threshold))
                            ? 'low_stock'
                            : 'ok',
            })),
        });
    }
    catch (error) {
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
app.put('/api/staff/stock/:itemId', authenticate_token, require_role(['staff', 'manager', 'admin']), async (req, res) => {
    try {
        const item_id = req.params.itemId;
        const body = admin_stock_update_schema.parse({
            ...req.body,
            quantity: Number(req.body?.quantity),
        });
        await with_client(async (client) => {
            await client.query('BEGIN');
            const mi_res = await client.query('SELECT stock_tracked, current_stock FROM menu_items WHERE item_id = $1 FOR UPDATE', [item_id]);
            if (mi_res.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json(createErrorResponse('Item not found', null, 'NOT_FOUND', req.request_id));
            }
            const mi = mi_res.rows[0];
            if (!mi.stock_tracked) {
                await client.query('ROLLBACK');
                return res.status(400).json(createErrorResponse('Stock is not tracked for this item', null, 'STOCK_NOT_TRACKED', req.request_id));
            }
            const prev = Number(mi.current_stock ?? 0);
            let next = prev;
            if (body.change_type === 'restock')
                next = prev + Math.abs(body.quantity);
            if (body.change_type === 'waste')
                next = Math.max(0, prev - Math.abs(body.quantity));
            if (body.change_type === 'sale')
                next = Math.max(0, prev - Math.abs(body.quantity));
            if (body.change_type === 'adjustment')
                next = Math.max(0, prev + body.quantity);
            await client.query('UPDATE menu_items SET current_stock = $1, updated_at = $2 WHERE item_id = $3', [next, now_iso(), item_id]);
            await client.query(`INSERT INTO stock_history (history_id, item_id, change_type, previous_stock, new_stock, quantity_changed, reason, notes, changed_by_user_id, changed_at, related_order_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NULL)`, [gen_id('sh'), item_id, body.change_type, prev, next, next - prev, body.reason ?? null, body.notes ?? null, req.user.user_id, now_iso()]);
            await client.query('COMMIT');
            maybe_emit_low_stock(item_id).catch(() => { });
            return ok(res, 200, { message: 'Stock updated', item_id, previous_stock: prev, new_stock: next });
        });
    }
    catch (error) {
        if (error instanceof z.ZodError)
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
app.get('/api/staff/reports/daily', authenticate_token, require_role(['staff', 'admin']), require_permission('view_reports'), async (req, res) => {
    try {
        const today_prefix = new Date().toISOString().slice(0, 10);
        const orders_res = await pool.query(`SELECT
         COUNT(*)::int as total_orders,
         COALESCE(SUM(total_amount), 0) as total_revenue,
         COALESCE(AVG(total_amount), 0) as avg_order_value
       FROM orders
       WHERE created_at LIKE $1 || '%' AND payment_status = 'paid'`, [today_prefix]);
        const popular_res = await pool.query(`SELECT item_name, SUM(quantity)::int as qty
       FROM order_items oi
       JOIN orders o ON o.order_id = oi.order_id
       WHERE o.created_at LIKE $1 || '%' AND o.payment_status = 'paid'
       GROUP BY item_name
       ORDER BY qty DESC
       LIMIT 1`, [today_prefix]);
        return ok(res, 200, {
            date: today_prefix,
            total_orders: orders_res.rows[0]?.total_orders ?? 0,
            total_revenue: Number(orders_res.rows[0]?.total_revenue ?? 0),
            average_order_value: Number(orders_res.rows[0]?.avg_order_value ?? 0),
            most_popular_item: popular_res.rows[0] ? { item_name: popular_res.rows[0].item_name, quantity_sold: popular_res.rows[0].qty } : null,
        });
    }
    catch (error) {
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
/**
 * ADMIN
 */
app.get('/api/admin/dashboard', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        // Parse date range parameter
        const range_schema = z.object({
            date_range: z.enum(['today', 'yesterday', 'last_7_days', 'last_30_days', 'this_month']).default('today'),
        });
        const { date_range } = parse_query(range_schema, req.query);
        // Calculate date range based on parameter
        const now = new Date();
        let date_from;
        let date_to = now.toISOString().slice(0, 10);
        switch (date_range) {
            case 'today':
                date_from = date_to;
                break;
            case 'yesterday':
                const yesterday = new Date(now);
                yesterday.setDate(yesterday.getDate() - 1);
                date_from = yesterday.toISOString().slice(0, 10);
                date_to = date_from;
                break;
            case 'last_7_days':
                const week_ago = new Date(now);
                week_ago.setDate(week_ago.getDate() - 6);
                date_from = week_ago.toISOString().slice(0, 10);
                break;
            case 'last_30_days':
                const month_ago = new Date(now);
                month_ago.setDate(month_ago.getDate() - 29);
                date_from = month_ago.toISOString().slice(0, 10);
                break;
            case 'this_month':
                date_from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
                break;
            default:
                date_from = date_to;
        }
        // Get orders summary for the date range
        // Include all orders except cancelled/failed (matches the Recent Orders table logic)
        const summary_res = await pool.query(`SELECT
         COUNT(*)::int as orders_today,
         COALESCE(SUM(total_amount), 0) as revenue_today,
         COUNT(*) FILTER (WHERE order_type = 'collection')::int as collection_count,
         COUNT(*) FILTER (WHERE order_type = 'delivery')::int as delivery_count
       FROM orders
       WHERE DATE(created_at) >= $1
         AND DATE(created_at) <= $2
         AND status NOT IN ('cancelled', 'failed')`, [date_from, date_to]);
        const new_customers_res = await pool.query(`SELECT COUNT(*)::int as new_customers
       FROM users
       WHERE role = 'customer' 
         AND DATE(created_at) >= $1
         AND DATE(created_at) <= $2`, [date_from, date_to]);
        const low_stock_res = await pool.query(`SELECT COUNT(*)::int as low_stock_count
       FROM menu_items
       WHERE stock_tracked = true AND low_stock_threshold IS NOT NULL AND current_stock <= low_stock_threshold`);
        const catering_new_res = await pool.query(`SELECT COUNT(*)::int as new_inquiries
       FROM catering_inquiries
       WHERE status = 'new'`);
        const recent_orders_res = await pool.query(`SELECT order_id, order_number, customer_name, order_type, total_amount, status, created_at
       FROM orders
       ORDER BY created_at DESC
       LIMIT 10`);
        // Calculate percentages safely
        const orders_today = summary_res.rows[0]?.orders_today ?? 0;
        const collection_count = summary_res.rows[0]?.collection_count ?? 0;
        const delivery_count = summary_res.rows[0]?.delivery_count ?? 0;
        const collection_percentage = orders_today > 0 ? (collection_count / orders_today) * 100 : 0;
        const delivery_percentage = orders_today > 0 ? (delivery_count / orders_today) * 100 : 0;
        return ok(res, 200, {
            // Flat structure for easy frontend consumption
            orders_today: orders_today,
            revenue_today: Number(summary_res.rows[0]?.revenue_today ?? 0),
            new_customers_today: new_customers_res.rows[0]?.new_customers ?? 0,
            collection_count: collection_count,
            delivery_count: delivery_count,
            // Breakdown with percentages
            orders_breakdown: {
                collection_count: collection_count,
                delivery_count: delivery_count,
                collection_percentage: Math.round(collection_percentage * 100) / 100,
                delivery_percentage: Math.round(delivery_percentage * 100) / 100,
            },
            // Also include nested today for backwards compatibility
            today: {
                orders_today: orders_today,
                revenue_today: Number(summary_res.rows[0]?.revenue_today ?? 0),
                new_customers_today: new_customers_res.rows[0]?.new_customers ?? 0,
                collection_count: collection_count,
                delivery_count: delivery_count,
            },
            alerts: {
                low_stock_items: low_stock_res.rows[0]?.low_stock_count ?? 0,
                new_catering_inquiries: catering_new_res.rows[0]?.new_inquiries ?? 0,
            },
            recent_orders: recent_orders_res.rows.map((o) => ({
                order_id: o.order_id,
                order_number: o.order_number,
                customer_name: o.customer_name,
                order_type: o.order_type,
                total_amount: Number(o.total_amount),
                status: o.status,
                created_at: o.created_at,
            })),
        });
    }
    catch (error) {
        console.error('[Admin Dashboard] Error:', error);
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
// Admin dashboard alerts (for notifications)
app.get('/api/admin/dashboard/alerts', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const low_stock_res = await pool.query(`SELECT item_id, name as item_name, current_stock, low_stock_threshold
       FROM menu_items
       WHERE stock_tracked = true AND low_stock_threshold IS NOT NULL AND current_stock <= low_stock_threshold
       ORDER BY current_stock ASC
       LIMIT 10`);
        const catering_new_res = await pool.query(`SELECT COUNT(*)::int as new_inquiries
       FROM catering_inquiries
       WHERE status = 'new'`);
        return ok(res, 200, {
            low_stock_items_count: low_stock_res.rows.length,
            new_catering_inquiries_count: catering_new_res.rows[0]?.new_inquiries ?? 0,
            low_stock_items: low_stock_res.rows.map(item => ({
                item_id: item.item_id,
                item_name: item.item_name,
                current_stock: Number(item.current_stock),
                low_stock_threshold: Number(item.low_stock_threshold),
            })),
        });
    }
    catch (error) {
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
// Admin dashboard revenue trend endpoint
app.get('/api/admin/dashboard/revenue-trend', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        // Parse date range parameter
        const range_schema = z.object({
            range: z.enum(['today', 'yesterday', 'last_7_days', 'last_30_days', 'this_month']).default('last_7_days'),
        });
        const { range } = parse_query(range_schema, req.query);
        // Calculate date range based on parameter
        const now = new Date();
        let date_from;
        let date_to = now.toISOString().slice(0, 10);
        switch (range) {
            case 'today':
                date_from = date_to;
                break;
            case 'yesterday':
                const yesterday = new Date(now);
                yesterday.setDate(yesterday.getDate() - 1);
                date_from = yesterday.toISOString().slice(0, 10);
                date_to = date_from;
                break;
            case 'last_7_days':
                const week_ago = new Date(now);
                week_ago.setDate(week_ago.getDate() - 6);
                date_from = week_ago.toISOString().slice(0, 10);
                break;
            case 'last_30_days':
                const month_ago = new Date(now);
                month_ago.setDate(month_ago.getDate() - 29);
                date_from = month_ago.toISOString().slice(0, 10);
                break;
            case 'this_month':
                date_from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
                break;
            default:
                date_from = new Date(now.setDate(now.getDate() - 6)).toISOString().slice(0, 10);
        }
        // Query revenue by day - only paid orders, exclude cancelled
        const revenue_by_day = await pool.query(`SELECT DATE(created_at) as date, 
              COALESCE(SUM(total_amount), 0) as revenue,
              COUNT(*)::int as order_count
       FROM orders
       WHERE payment_status = 'paid'
         AND status NOT IN ('cancelled', 'failed')
         AND DATE(created_at) >= $1
         AND DATE(created_at) <= $2
       GROUP BY DATE(created_at)
       ORDER BY date ASC`, [date_from, date_to]);
        // Generate all dates in range to ensure continuous data
        const revenue_trend = [];
        const start_date = new Date(date_from);
        const end_date = new Date(date_to);
        // Create a map of existing data
        const data_map = new Map();
        for (const row of revenue_by_day.rows) {
            const date_key = typeof row.date === 'string' ? row.date.slice(0, 10) : row.date.toISOString().slice(0, 10);
            data_map.set(date_key, {
                revenue: Number(row.revenue || 0),
                order_count: Number(row.order_count || 0),
            });
        }
        // Fill in all dates
        for (let d = new Date(start_date); d <= end_date; d.setDate(d.getDate() + 1)) {
            const date_str = d.toISOString().slice(0, 10);
            const data = data_map.get(date_str) || { revenue: 0, order_count: 0 };
            revenue_trend.push({
                date: date_str,
                revenue: data.revenue,
                order_count: data.order_count,
            });
        }
        // Calculate summary
        const total_revenue = revenue_trend.reduce((sum, d) => sum + d.revenue, 0);
        const total_orders = revenue_trend.reduce((sum, d) => sum + d.order_count, 0);
        return ok(res, 200, {
            range,
            date_from,
            date_to,
            revenue_trend,
            summary: {
                total_revenue,
                total_orders,
                average_daily_revenue: revenue_trend.length > 0 ? total_revenue / revenue_trend.length : 0,
            },
        });
    }
    catch (error) {
        console.error('[Admin Dashboard Revenue Trend] Error:', error);
        if (error instanceof z.ZodError) {
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        }
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
// Admin content settings endpoints (for editable dashboard content)
app.get('/api/admin/content-settings', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        // Check if content_settings table exists, create if not
        await pool.query(`
      CREATE TABLE IF NOT EXISTS content_settings (
        setting_id TEXT PRIMARY KEY,
        setting_key TEXT UNIQUE NOT NULL,
        setting_value TEXT NOT NULL,
        setting_category TEXT NOT NULL DEFAULT 'dashboard',
        description TEXT,
        updated_at TEXT NOT NULL,
        updated_by_user_id TEXT,
        FOREIGN KEY (updated_by_user_id) REFERENCES users(user_id)
      )
    `);
        // Insert default content settings if they don't exist
        const defaults = [
            { key: 'dashboard_title_revenue_trend', value: 'Revenue Trend', category: 'dashboard', description: 'Title for the revenue trend chart' },
            { key: 'dashboard_title_quick_actions', value: 'Quick Actions', category: 'dashboard', description: 'Title for quick actions section' },
            { key: 'dashboard_title_recent_orders', value: 'Recent Orders', category: 'dashboard', description: 'Title for recent orders section' },
            { key: 'dashboard_title_pending_alerts', value: 'Pending Alerts', category: 'dashboard', description: 'Title for alerts section' },
            { key: 'dashboard_label_orders_today', value: 'Orders Today', category: 'dashboard', description: 'Label for orders KPI' },
            { key: 'dashboard_label_revenue_today', value: 'Revenue Today', category: 'dashboard', description: 'Label for revenue KPI' },
            { key: 'dashboard_label_new_customers', value: 'New Customers', category: 'dashboard', description: 'Label for new customers KPI' },
            { key: 'dashboard_label_order_types', value: 'Order Types', category: 'dashboard', description: 'Label for order types KPI' },
            { key: 'quick_action_add_menu_item', value: 'Add Menu Item', category: 'dashboard', description: 'Label for Add Menu Item button' },
            { key: 'quick_action_create_discount', value: 'Create Discount', category: 'dashboard', description: 'Label for Create Discount button' },
            { key: 'quick_action_view_analytics', value: 'View Analytics', category: 'dashboard', description: 'Label for View Analytics button' },
        ];
        for (const d of defaults) {
            await pool.query(`INSERT INTO content_settings (setting_id, setting_key, setting_value, setting_category, description, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (setting_key) DO NOTHING`, [gen_id('cs'), d.key, d.value, d.category, d.description, now_iso()]);
        }
        // Fetch all content settings
        const category = req.query.category;
        const query = category
            ? `SELECT * FROM content_settings WHERE setting_category = $1 ORDER BY setting_key`
            : `SELECT * FROM content_settings ORDER BY setting_category, setting_key`;
        const params = category ? [category] : [];
        const result = await pool.query(query, params);
        // Transform to key-value map for easy consumption
        const settings = {};
        const settings_list = result.rows.map(row => {
            settings[row.setting_key] = row.setting_value;
            return {
                setting_id: row.setting_id,
                setting_key: row.setting_key,
                setting_value: row.setting_value,
                setting_category: row.setting_category,
                description: row.description,
                updated_at: row.updated_at,
            };
        });
        return ok(res, 200, { settings, settings_list });
    }
    catch (error) {
        console.error('[Admin Content Settings GET] Error:', error);
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
app.put('/api/admin/content-settings', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const update_schema = z.object({
            settings: z.array(z.object({
                setting_key: z.string().min(1),
                setting_value: z.string(),
            })),
        });
        const { settings } = update_schema.parse(req.body);
        const user_id = req.user?.user_id;
        const timestamp = now_iso();
        // Update each setting
        const updated = [];
        for (const s of settings) {
            const result = await pool.query(`UPDATE content_settings 
         SET setting_value = $1, updated_at = $2, updated_by_user_id = $3
         WHERE setting_key = $4
         RETURNING setting_key`, [s.setting_value, timestamp, user_id, s.setting_key]);
            if (result.rows.length > 0) {
                updated.push(s.setting_key);
            }
        }
        return ok(res, 200, {
            message: 'Content settings updated successfully',
            updated_count: updated.length,
            updated_keys: updated,
        });
    }
    catch (error) {
        console.error('[Admin Content Settings PUT] Error:', error);
        if (error instanceof z.ZodError) {
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        }
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
// Admin menu items list
app.get('/api/admin/menu/items', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        // Prevent caching of admin data
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        const search = parse_query(searchMenuItemInputSchema, req.query);
        const { items, total } = await fetch_menu_items({ for_admin: true, search });
        return ok(res, 200, { items, total, limit: search.limit, offset: search.offset });
    }
    catch (error) {
        if (error instanceof z.ZodError)
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
// Admin get single menu item
app.get('/api/admin/menu/items/:id', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        // Prevent caching of admin data
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        const item_id = req.params.id;
        const result = await pool.query('SELECT * FROM menu_items WHERE item_id = $1', [item_id]);
        if (result.rows.length === 0) {
            return res.status(404).json(createErrorResponse('Menu item not found', null, 'NOT_FOUND', req.request_id));
        }
        // Return the item with proper number coercion and standard response wrapper
        const item = menuItemSchema.parse(coerce_numbers(result.rows[0], ['price', 'current_stock', 'low_stock_threshold', 'sort_order']));
        return ok(res, 200, { item });
    }
    catch (error) {
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
// Admin create menu item
app.post('/api/admin/menu/items', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const input = createMenuItemInputSchema.parse(req.body);
        const item_id = gen_id('item');
        const ts = now_iso();
        await pool.query(`INSERT INTO menu_items (
        item_id, name, description, category_id, price, image_url, image_urls, dietary_tags,
        is_limited_edition, limited_edition_end_date, is_active,
        available_for_collection, available_for_delivery,
        stock_tracked, current_stock, low_stock_threshold, sort_order,
        is_featured, meta_description, image_alt_text,
        created_at, updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,
        $9,$10,$11,
        $12,$13,
        $14,$15,$16,$17,
        $18,$19,$20,
        $21,$22
      )`, [
            item_id,
            input.name,
            input.description ?? null,
            input.category_id,
            input.price,
            input.image_url ?? null,
            input.image_urls ? JSON.stringify(input.image_urls) : null,
            input.dietary_tags ? JSON.stringify(input.dietary_tags) : null,
            input.is_limited_edition ?? false,
            input.limited_edition_end_date ?? null,
            input.is_active ?? true,
            input.available_for_collection ?? true,
            input.available_for_delivery ?? true,
            input.stock_tracked ?? false,
            input.current_stock ?? null,
            input.low_stock_threshold ?? null,
            input.sort_order ?? 0,
            input.is_featured ?? false,
            input.meta_description ?? null,
            input.image_alt_text ?? null,
            ts,
            ts,
        ]);
        // Log activity
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
        return ok(res, 201, { item_id });
    }
    catch (error) {
        if (error instanceof z.ZodError)
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
// Admin update menu item
app.put('/api/admin/menu/items/:id', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const item_id = req.params.id;
        // First, check if the item exists
        const existing = await pool.query('SELECT item_id FROM menu_items WHERE item_id = $1', [item_id]);
        if (existing.rows.length === 0) {
            return res.status(404).json(createErrorResponse('Menu item not found', null, 'NOT_FOUND', req.request_id));
        }
        const input = updateMenuItemInputSchema.parse({ ...req.body, item_id });
        // CRITICAL: Log the incoming price to verify it's received correctly
        if ('price' in input) {
            console.log(`[admin/menu/items/:id PUT] Updating price for ${item_id}: ${input.price} (type: ${typeof input.price})`);
        }
        const fields = [];
        const params = [];
        const set_jsonb = new Set(['image_urls', 'dietary_tags']);
        for (const [k, v] of Object.entries(input)) {
            if (k === 'item_id')
                continue;
            if (v === undefined)
                continue;
            // Handle JSONB fields - need to serialize arrays
            if (set_jsonb.has(k)) {
                params.push(v === null ? null : JSON.stringify(v));
                fields.push(`${k} = $${params.length}::jsonb`);
            }
            else if (k === 'price') {
                // CRITICAL: Explicitly cast price to NUMERIC to ensure proper storage
                params.push(Number(v));
                fields.push(`${k} = $${params.length}::NUMERIC(10,2)`);
            }
            else {
                params.push(v);
                fields.push(`${k} = $${params.length}`);
            }
        }
        if (fields.length === 0) {
            return res.status(400).json(createErrorResponse('No fields to update', null, 'NO_UPDATES', req.request_id));
        }
        params.push(now_iso());
        fields.push(`updated_at = $${params.length}`);
        params.push(item_id);
        // Log the SQL query for debugging
        console.log(`[admin/menu/items/:id PUT] SQL: UPDATE menu_items SET ${fields.join(', ')} WHERE item_id = $${params.length}`);
        console.log(`[admin/menu/items/:id PUT] Params:`, params);
        const upd = await pool.query(`UPDATE menu_items SET ${fields.join(', ')} WHERE item_id = $${params.length} RETURNING *`, params);
        if (upd.rows.length === 0) {
            return res.status(404).json(createErrorResponse('Menu item not found', null, 'NOT_FOUND', req.request_id));
        }
        // CRITICAL: Verify the update persisted by reading back from DB
        const verify = await pool.query('SELECT item_id, name, price FROM menu_items WHERE item_id = $1', [item_id]);
        if (verify.rows.length > 0) {
            console.log(`[admin/menu/items/:id PUT] VERIFICATION - DB shows price: ${verify.rows[0].price} (type: ${typeof verify.rows[0].price})`);
        }
        // Return the full updated item with proper number coercion
        const updated_row = upd.rows[0];
        const updated_item = menuItemSchema.parse(coerce_numbers({
            ...updated_row,
            image_urls: updated_row.image_urls ?? null,
            dietary_tags: updated_row.dietary_tags ?? null,
            price: Number(updated_row.price),
        }, ['price', 'current_stock', 'low_stock_threshold', 'sort_order']));
        // CRITICAL: Log the final returned price to verify it's correct
        console.log(`[admin/menu/items/:id PUT] Successfully updated item ${item_id}`);
        console.log(`[admin/menu/items/:id PUT] Final price in response: ${updated_item.price} (type: ${typeof updated_item.price})`);
        console.log(`[admin/menu/items/:id PUT] DB returned price: ${updated_row.price} (type: ${typeof updated_row.price})`);
        // Log activity
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
        return ok(res, 200, { item: updated_item });
    }
    catch (error) {
        if (error instanceof z.ZodError)
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        console.error('[admin/menu/items/:id PUT] Error:', error);
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
// Admin delete menu item (soft delete - marks as inactive)
app.delete('/api/admin/menu/items/:id', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const item_id = req.params.id;
        // Get current item details before soft delete
        const current = await pool.query('SELECT * FROM menu_items WHERE item_id = $1', [item_id]);
        if (current.rows.length === 0) {
            return res.status(404).json(createErrorResponse('Menu item not found', null, 'NOT_FOUND', req.request_id));
        }
        // Soft delete: mark as inactive instead of hard delete
        const updated = await pool.query('UPDATE menu_items SET is_active = false, updated_at = $1 WHERE item_id = $2 RETURNING item_id, name', [now_iso(), item_id]);
        // Log the soft delete activity
        await pool.query(`INSERT INTO activity_logs (log_id, user_id, action_type, entity_type, entity_id, description, changes, ip_address, user_agent, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, [
            gen_id('log'),
            req.user?.user_id,
            'delete',
            'menu_item',
            item_id,
            `Deactivated menu item: ${updated.rows[0].name}`,
            JSON.stringify({ is_active: { from: current.rows[0].is_active, to: false } }),
            req.ip,
            req.headers['user-agent'],
            now_iso(),
        ]);
        return ok(res, 200, { message: 'Menu item deactivated successfully', item_id: updated.rows[0].item_id });
    }
    catch (error) {
        console.error('[admin/menu/items/:id DELETE] Error:', error);
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
// Admin categories CRUD
app.get('/api/admin/categories', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const rows = await pool.query('SELECT * FROM categories ORDER BY sort_order ASC, name ASC');
        const categories = rows.rows.map((r) => categorySchema.parse({
            ...r,
            description: r.description ?? null,
            sort_order: Number(r.sort_order),
        }));
        return ok(res, 200, { categories });
    }
    catch (error) {
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
app.post('/api/admin/categories', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const input = createCategoryInputSchema.parse(req.body);
        const category_id = gen_id('cat');
        await pool.query('INSERT INTO categories (category_id, name, description, sort_order, created_at) VALUES ($1,$2,$3,$4,$5)', [category_id, input.name, input.description ?? null, input.sort_order ?? 0, now_iso()]);
        return ok(res, 201, { category_id });
    }
    catch (error) {
        if (error instanceof z.ZodError)
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        // Unique name conflict
        if (String(error?.message || '').includes('duplicate key')) {
            return res.status(409).json(createErrorResponse('Category name already exists', error, 'CATEGORY_EXISTS', req.request_id));
        }
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
app.put('/api/admin/categories/:id', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const category_id = req.params.id;
        const input = updateCategoryInputSchema.parse({ ...req.body, category_id });
        const fields = [];
        const params = [];
        for (const [k, v] of Object.entries(input)) {
            if (k === 'category_id')
                continue;
            if (v === undefined)
                continue;
            params.push(v);
            fields.push(`${k} = $${params.length}`);
        }
        if (fields.length === 0)
            return res.status(400).json(createErrorResponse('No fields to update', null, 'NO_UPDATES', req.request_id));
        params.push(category_id);
        const upd = await pool.query(`UPDATE categories SET ${fields.join(', ')} WHERE category_id = $${params.length} RETURNING category_id`, params);
        if (upd.rows.length === 0)
            return res.status(404).json(createErrorResponse('Category not found', null, 'NOT_FOUND', req.request_id));
        return ok(res, 200, { category_id });
    }
    catch (error) {
        if (error instanceof z.ZodError)
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
app.delete('/api/admin/categories/:id', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const category_id = req.params.id;
        const count = await pool.query('SELECT COUNT(*)::int as count FROM menu_items WHERE category_id = $1', [category_id]);
        if ((count.rows[0]?.count ?? 0) > 0) {
            return res.status(400).json(createErrorResponse('Cannot delete category with existing items', null, 'CATEGORY_NOT_EMPTY', req.request_id));
        }
        const del = await pool.query('DELETE FROM categories WHERE category_id = $1 RETURNING category_id', [category_id]);
        if (del.rows.length === 0)
            return res.status(404).json(createErrorResponse('Category not found', null, 'NOT_FOUND', req.request_id));
        return ok(res, 200, { message: 'Category deleted' });
    }
    catch (error) {
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
// Alias routes for frontend compatibility (/api/admin/menu/categories -> /api/admin/categories)
app.get('/api/admin/menu/categories', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const rows = await pool.query('SELECT * FROM categories ORDER BY sort_order ASC, name ASC');
        const categories = rows.rows.map((r) => categorySchema.parse({
            ...r,
            description: r.description ?? null,
            sort_order: Number(r.sort_order),
        }));
        return ok(res, 200, { categories });
    }
    catch (error) {
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
app.post('/api/admin/menu/categories', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const input = createCategoryInputSchema.parse(req.body);
        const category_id = gen_id('cat');
        await pool.query('INSERT INTO categories (category_id, name, description, sort_order, created_at) VALUES ($1,$2,$3,$4,$5)', [category_id, input.name, input.description ?? null, input.sort_order ?? 0, now_iso()]);
        return ok(res, 201, { category_id });
    }
    catch (error) {
        if (error instanceof z.ZodError)
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        if (String(error?.message || '').includes('duplicate key')) {
            return res.status(409).json(createErrorResponse('Category name already exists', error, 'CATEGORY_EXISTS', req.request_id));
        }
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
app.put('/api/admin/menu/categories/:id', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const category_id = req.params.id;
        const input = updateCategoryInputSchema.parse({ ...req.body, category_id });
        const fields = [];
        const params = [];
        for (const [k, v] of Object.entries(input)) {
            if (k === 'category_id')
                continue;
            if (v === undefined)
                continue;
            params.push(v);
            fields.push(`${k} = $${params.length}`);
        }
        if (fields.length === 0)
            return res.status(400).json(createErrorResponse('No fields to update', null, 'NO_UPDATES', req.request_id));
        params.push(category_id);
        const upd = await pool.query(`UPDATE categories SET ${fields.join(', ')} WHERE category_id = $${params.length} RETURNING category_id`, params);
        if (upd.rows.length === 0)
            return res.status(404).json(createErrorResponse('Category not found', null, 'NOT_FOUND', req.request_id));
        return ok(res, 200, { category_id });
    }
    catch (error) {
        if (error instanceof z.ZodError)
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
app.delete('/api/admin/menu/categories/:id', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const category_id = req.params.id;
        const count = await pool.query('SELECT COUNT(*)::int as count FROM menu_items WHERE category_id = $1', [category_id]);
        if ((count.rows[0]?.count ?? 0) > 0) {
            return res.status(400).json(createErrorResponse('Cannot delete category with existing items', null, 'CATEGORY_NOT_EMPTY', req.request_id));
        }
        const del = await pool.query('DELETE FROM categories WHERE category_id = $1 RETURNING category_id', [category_id]);
        if (del.rows.length === 0)
            return res.status(404).json(createErrorResponse('Category not found', null, 'NOT_FOUND', req.request_id));
        return ok(res, 200, { message: 'Category deleted' });
    }
    catch (error) {
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
// ============================================
// MENU BUILDER ENDPOINTS (Public)
// ============================================
/**
 * Get builder configuration (public).
 * Returns whether builder is enabled and which category IDs trigger it.
 */
app.get('/api/menu/builder-config', async (req, res) => {
    try {
        const config_res = await pool.query('SELECT * FROM builder_config LIMIT 1');
        if (config_res.rows.length === 0) {
            return ok(res, 200, {
                config: {
                    enabled: false,
                    builder_category_ids: [],
                    include_base_item_price: false,
                },
            });
        }
        const config = config_res.rows[0];
        return ok(res, 200, {
            config: {
                config_id: config.config_id,
                enabled: config.enabled,
                builder_category_ids: config.builder_category_ids || [],
                include_base_item_price: config.include_base_item_price,
            },
        });
    }
    catch (error) {
        console.error('get builder config error', error);
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
/**
 * Get builder steps with their items (public).
 * Returns all builder steps and their selectable items.
 */
app.get('/api/menu/builder-steps', async (req, res) => {
    try {
        // Get builder config first
        const config_res = await pool.query('SELECT * FROM builder_config LIMIT 1');
        if (config_res.rows.length === 0 || !config_res.rows[0].enabled) {
            return ok(res, 200, { steps: [], config: null });
        }
        const config = config_res.rows[0];
        // Get all steps
        const steps_res = await pool.query(`SELECT * FROM builder_steps WHERE config_id = $1 ORDER BY sort_order ASC`, [config.config_id]);
        // Get all step items with menu item details
        const step_ids = steps_res.rows.map((s) => s.step_id);
        let step_items_map = new Map();
        if (step_ids.length > 0) {
            const items_res = await pool.query(`SELECT bsi.*, mi.name, mi.description, mi.price, mi.image_url, mi.is_active
         FROM builder_step_items bsi
         JOIN menu_items mi ON bsi.item_id = mi.item_id
         WHERE bsi.step_id = ANY($1) AND bsi.is_active = true AND mi.is_active = true
         ORDER BY bsi.sort_order ASC`, [step_ids]);
            for (const item of items_res.rows) {
                if (!step_items_map.has(item.step_id)) {
                    step_items_map.set(item.step_id, []);
                }
                step_items_map.get(item.step_id).push({
                    step_item_id: item.step_item_id,
                    item_id: item.item_id,
                    name: item.name,
                    description: item.description,
                    price: Number(item.price),
                    override_price: item.override_price !== null ? Number(item.override_price) : null,
                    image_url: item.image_url,
                    sort_order: item.sort_order,
                    is_active: item.is_active,
                });
            }
        }
        const steps = steps_res.rows.map((step) => ({
            step_id: step.step_id,
            step_name: step.step_name,
            step_key: step.step_key,
            step_type: step.step_type,
            is_required: step.is_required,
            min_selections: step.min_selections,
            max_selections: step.max_selections,
            sort_order: step.sort_order,
            items: step_items_map.get(step.step_id) || [],
        }));
        return ok(res, 200, {
            config: {
                config_id: config.config_id,
                enabled: config.enabled,
                builder_category_ids: config.builder_category_ids || [],
                include_base_item_price: config.include_base_item_price,
            },
            steps,
        });
    }
    catch (error) {
        console.error('get builder steps error', error);
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
// ============================================
// MENU BUILDER ENDPOINTS (Admin)
// ============================================
/**
 * Get builder configuration (admin).
 */
app.get('/api/admin/menu/builder-config', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const config_res = await pool.query('SELECT * FROM builder_config LIMIT 1');
        if (config_res.rows.length === 0) {
            return ok(res, 200, {
                config: null,
            });
        }
        const config = config_res.rows[0];
        // Get steps count
        const steps_res = await pool.query('SELECT COUNT(*)::int as count FROM builder_steps WHERE config_id = $1', [config.config_id]);
        return ok(res, 200, {
            config: {
                config_id: config.config_id,
                enabled: config.enabled,
                builder_category_ids: config.builder_category_ids || [],
                include_base_item_price: config.include_base_item_price,
                created_at: config.created_at,
                updated_at: config.updated_at,
                steps_count: steps_res.rows[0]?.count || 0,
            },
        });
    }
    catch (error) {
        console.error('admin get builder config error', error);
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
/**
 * Update builder configuration (admin).
 */
app.put('/api/admin/menu/builder-config', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const update_schema = z.object({
            enabled: z.boolean().optional(),
            builder_category_ids: z.array(z.string()).optional(),
            include_base_item_price: z.boolean().optional(),
        });
        const input = update_schema.parse(req.body);
        await with_client(async (client) => {
            await client.query('BEGIN');
            // Check if config exists
            const existing = await client.query('SELECT config_id FROM builder_config LIMIT 1');
            if (existing.rows.length === 0) {
                // Create new config
                const config_id = gen_id('bc');
                await client.query(`INSERT INTO builder_config (config_id, enabled, builder_category_ids, include_base_item_price, created_at, updated_at)
           VALUES ($1, $2, $3::jsonb, $4, $5, $6)`, [
                    config_id,
                    input.enabled ?? true,
                    JSON.stringify(input.builder_category_ids ?? []),
                    input.include_base_item_price ?? false,
                    now_iso(),
                    now_iso(),
                ]);
                await client.query('COMMIT');
                return ok(res, 201, { message: 'Builder config created', config_id });
            }
            // Update existing config
            const config_id = existing.rows[0].config_id;
            const updates = [];
            const params = [];
            if (input.enabled !== undefined) {
                params.push(input.enabled);
                updates.push(`enabled = $${params.length}`);
            }
            if (input.builder_category_ids !== undefined) {
                params.push(JSON.stringify(input.builder_category_ids));
                updates.push(`builder_category_ids = $${params.length}::jsonb`);
            }
            if (input.include_base_item_price !== undefined) {
                params.push(input.include_base_item_price);
                updates.push(`include_base_item_price = $${params.length}`);
            }
            if (updates.length > 0) {
                params.push(now_iso());
                updates.push(`updated_at = $${params.length}`);
                params.push(config_id);
                await client.query(`UPDATE builder_config SET ${updates.join(', ')} WHERE config_id = $${params.length}`, params);
            }
            await client.query('COMMIT');
            // Log activity
            await log_activity({
                user_id: req.user.user_id,
                action_type: 'update',
                entity_type: 'builder_config',
                entity_id: config_id,
                description: 'Updated menu builder configuration',
                changes: input,
                ip_address: req.ip,
                user_agent: req.headers['user-agent'],
            });
            return ok(res, 200, { message: 'Builder config updated', config_id });
        });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        }
        console.error('admin update builder config error', error);
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
/**
 * Get all builder steps with items (admin).
 */
app.get('/api/admin/menu/builder-steps', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        // Get config
        const config_res = await pool.query('SELECT config_id FROM builder_config LIMIT 1');
        if (config_res.rows.length === 0) {
            return ok(res, 200, { steps: [] });
        }
        const config_id = config_res.rows[0].config_id;
        // Get all steps
        const steps_res = await pool.query(`SELECT * FROM builder_steps WHERE config_id = $1 ORDER BY sort_order ASC`, [config_id]);
        // Get all step items
        const step_ids = steps_res.rows.map((s) => s.step_id);
        let step_items_map = new Map();
        if (step_ids.length > 0) {
            const items_res = await pool.query(`SELECT bsi.*, mi.name, mi.description, mi.price, mi.image_url, mi.is_active as item_is_active
         FROM builder_step_items bsi
         JOIN menu_items mi ON bsi.item_id = mi.item_id
         WHERE bsi.step_id = ANY($1)
         ORDER BY bsi.sort_order ASC`, [step_ids]);
            for (const item of items_res.rows) {
                if (!step_items_map.has(item.step_id)) {
                    step_items_map.set(item.step_id, []);
                }
                step_items_map.get(item.step_id).push({
                    step_item_id: item.step_item_id,
                    item_id: item.item_id,
                    name: item.name,
                    description: item.description,
                    original_price: Number(item.price),
                    override_price: item.override_price !== null ? Number(item.override_price) : null,
                    effective_price: item.override_price !== null ? Number(item.override_price) : Number(item.price),
                    image_url: item.image_url,
                    sort_order: item.sort_order,
                    is_active: item.is_active,
                    item_is_active: item.item_is_active,
                });
            }
        }
        const steps = steps_res.rows.map((step) => ({
            step_id: step.step_id,
            config_id: step.config_id,
            step_name: step.step_name,
            step_key: step.step_key,
            step_type: step.step_type,
            is_required: step.is_required,
            min_selections: step.min_selections,
            max_selections: step.max_selections,
            sort_order: step.sort_order,
            created_at: step.created_at,
            items: step_items_map.get(step.step_id) || [],
        }));
        return ok(res, 200, { steps });
    }
    catch (error) {
        console.error('admin get builder steps error', error);
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
/**
 * Create or update a builder step (admin).
 */
app.post('/api/admin/menu/builder-steps', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const step_schema = z.object({
            step_id: z.string().optional(), // If provided, update existing
            step_name: z.string().min(1).max(100),
            step_key: z.string().min(1).max(50),
            step_type: z.enum(['single', 'multiple']),
            is_required: z.boolean(),
            min_selections: z.number().int().nonnegative(),
            max_selections: z.number().int().positive().nullable(),
            sort_order: z.number().int().nonnegative(),
        });
        const input = step_schema.parse(req.body);
        await with_client(async (client) => {
            await client.query('BEGIN');
            // Get or create config
            let config_res = await client.query('SELECT config_id FROM builder_config LIMIT 1');
            let config_id;
            if (config_res.rows.length === 0) {
                config_id = gen_id('bc');
                await client.query(`INSERT INTO builder_config (config_id, enabled, builder_category_ids, include_base_item_price, created_at, updated_at)
           VALUES ($1, true, '[]'::jsonb, false, $2, $3)`, [config_id, now_iso(), now_iso()]);
            }
            else {
                config_id = config_res.rows[0].config_id;
            }
            if (input.step_id) {
                // Update existing step
                await client.query(`UPDATE builder_steps SET
            step_name = $1, step_key = $2, step_type = $3, is_required = $4,
            min_selections = $5, max_selections = $6, sort_order = $7
           WHERE step_id = $8`, [
                    input.step_name,
                    input.step_key,
                    input.step_type,
                    input.is_required,
                    input.min_selections,
                    input.max_selections,
                    input.sort_order,
                    input.step_id,
                ]);
                await client.query('COMMIT');
                return ok(res, 200, { message: 'Builder step updated', step_id: input.step_id });
            }
            else {
                // Create new step
                const step_id = gen_id('bs');
                await client.query(`INSERT INTO builder_steps (step_id, config_id, step_name, step_key, step_type, is_required, min_selections, max_selections, sort_order, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, [
                    step_id,
                    config_id,
                    input.step_name,
                    input.step_key,
                    input.step_type,
                    input.is_required,
                    input.min_selections,
                    input.max_selections,
                    input.sort_order,
                    now_iso(),
                ]);
                await client.query('COMMIT');
                return ok(res, 201, { message: 'Builder step created', step_id });
            }
        });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        }
        console.error('admin create/update builder step error', error);
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
/**
 * Delete a builder step (admin).
 */
app.delete('/api/admin/menu/builder-steps/:stepId', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const step_id = req.params.stepId;
        const del = await pool.query('DELETE FROM builder_steps WHERE step_id = $1 RETURNING step_id', [step_id]);
        if (del.rows.length === 0) {
            return res.status(404).json(createErrorResponse('Step not found', null, 'NOT_FOUND', req.request_id));
        }
        return ok(res, 200, { message: 'Builder step deleted', step_id });
    }
    catch (error) {
        console.error('admin delete builder step error', error);
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
/**
 * Add or update a step item (admin).
 */
app.post('/api/admin/menu/builder-step-items', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const item_schema = z.object({
            step_item_id: z.string().optional(), // If provided, update existing
            step_id: z.string(),
            item_id: z.string(),
            override_price: z.number().nonnegative().nullable().optional(),
            sort_order: z.number().int().nonnegative(),
            is_active: z.boolean().default(true),
        });
        const input = item_schema.parse(req.body);
        await with_client(async (client) => {
            await client.query('BEGIN');
            // Verify step exists
            const step_res = await client.query('SELECT step_id FROM builder_steps WHERE step_id = $1', [input.step_id]);
            if (step_res.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json(createErrorResponse('Step not found', null, 'NOT_FOUND', req.request_id));
            }
            // Verify menu item exists
            const item_res = await client.query('SELECT item_id FROM menu_items WHERE item_id = $1', [input.item_id]);
            if (item_res.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json(createErrorResponse('Menu item not found', null, 'NOT_FOUND', req.request_id));
            }
            if (input.step_item_id) {
                // Update existing
                await client.query(`UPDATE builder_step_items SET
            step_id = $1, item_id = $2, override_price = $3, sort_order = $4, is_active = $5
           WHERE step_item_id = $6`, [input.step_id, input.item_id, input.override_price ?? null, input.sort_order, input.is_active, input.step_item_id]);
                await client.query('COMMIT');
                return ok(res, 200, { message: 'Step item updated', step_item_id: input.step_item_id });
            }
            else {
                // Check for duplicate
                const dup_res = await client.query('SELECT step_item_id FROM builder_step_items WHERE step_id = $1 AND item_id = $2', [input.step_id, input.item_id]);
                if (dup_res.rows.length > 0) {
                    await client.query('ROLLBACK');
                    return res.status(409).json(createErrorResponse('Item already exists in this step', null, 'DUPLICATE_ENTRY', req.request_id));
                }
                // Create new
                const step_item_id = gen_id('bsi');
                await client.query(`INSERT INTO builder_step_items (step_item_id, step_id, item_id, override_price, sort_order, is_active, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`, [step_item_id, input.step_id, input.item_id, input.override_price ?? null, input.sort_order, input.is_active, now_iso()]);
                await client.query('COMMIT');
                return ok(res, 201, { message: 'Step item created', step_item_id });
            }
        });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        }
        console.error('admin create/update step item error', error);
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
/**
 * Delete a step item (admin).
 */
app.delete('/api/admin/menu/builder-step-items/:stepItemId', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const step_item_id = req.params.stepItemId;
        const del = await pool.query('DELETE FROM builder_step_items WHERE step_item_id = $1 RETURNING step_item_id', [step_item_id]);
        if (del.rows.length === 0) {
            return res.status(404).json(createErrorResponse('Step item not found', null, 'NOT_FOUND', req.request_id));
        }
        return ok(res, 200, { message: 'Step item deleted', step_item_id });
    }
    catch (error) {
        console.error('admin delete step item error', error);
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
/**
 * Bulk update step items for a step (admin).
 * Useful for reordering or toggling active state.
 */
app.put('/api/admin/menu/builder-steps/:stepId/items', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const step_id = req.params.stepId;
        const items_schema = z.object({
            items: z.array(z.object({
                step_item_id: z.string(),
                sort_order: z.number().int().nonnegative().optional(),
                is_active: z.boolean().optional(),
                override_price: z.number().nonnegative().nullable().optional(),
            })),
        });
        const { items } = items_schema.parse(req.body);
        await with_client(async (client) => {
            await client.query('BEGIN');
            for (const item of items) {
                const updates = [];
                const params = [];
                if (item.sort_order !== undefined) {
                    params.push(item.sort_order);
                    updates.push(`sort_order = $${params.length}`);
                }
                if (item.is_active !== undefined) {
                    params.push(item.is_active);
                    updates.push(`is_active = $${params.length}`);
                }
                if (item.override_price !== undefined) {
                    params.push(item.override_price);
                    updates.push(`override_price = $${params.length}`);
                }
                if (updates.length > 0) {
                    params.push(item.step_item_id);
                    params.push(step_id);
                    await client.query(`UPDATE builder_step_items SET ${updates.join(', ')} WHERE step_item_id = $${params.length - 1} AND step_id = $${params.length}`, params);
                }
            }
            await client.query('COMMIT');
            return ok(res, 200, { message: 'Step items updated', count: items.length });
        });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        }
        console.error('admin bulk update step items error', error);
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
// Admin stock overview
app.get('/api/admin/stock', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const rows = await pool.query(`SELECT mi.item_id, mi.name, mi.category_id, c.name as category_name,
              mi.stock_tracked, mi.current_stock, mi.low_stock_threshold, mi.updated_at
       FROM menu_items mi
       JOIN categories c ON c.category_id = mi.category_id
       ORDER BY mi.stock_tracked DESC, mi.current_stock ASC NULLS LAST, mi.name ASC`);
        const items = rows.rows.map((r) => ({
            item_id: r.item_id,
            name: r.name,
            category_id: r.category_id,
            category_name: r.category_name,
            stock_tracked: r.stock_tracked,
            current_stock: r.current_stock === null || r.current_stock === undefined ? null : Number(r.current_stock),
            low_stock_threshold: r.low_stock_threshold === null || r.low_stock_threshold === undefined ? null : Number(r.low_stock_threshold),
            last_updated: r.updated_at,
            stock_status: !r.stock_tracked
                ? 'not_tracked'
                : (Number(r.current_stock ?? 0) <= 0)
                    ? 'out_of_stock'
                    : (r.low_stock_threshold !== null && Number(r.current_stock) <= Number(r.low_stock_threshold))
                        ? 'low_stock'
                        : 'ok',
        }));
        const total_items_tracked = items.filter((i) => i.stock_tracked).length;
        const low_stock_count = items.filter((i) => i.stock_tracked && i.stock_status === 'low_stock').length;
        const out_of_stock_count = items.filter((i) => i.stock_tracked && i.stock_status === 'out_of_stock').length;
        return ok(res, 200, {
            total_items_tracked,
            low_stock_count,
            out_of_stock_count,
            items
        });
    }
    catch (error) {
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
app.put('/api/admin/stock/:itemId', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const item_id = req.params.itemId;
        const body = admin_stock_update_schema.parse({
            ...req.body,
            quantity: Number(req.body?.quantity),
        });
        await with_client(async (client) => {
            await client.query('BEGIN');
            const mi_res = await client.query('SELECT stock_tracked, current_stock FROM menu_items WHERE item_id = $1 FOR UPDATE', [item_id]);
            if (mi_res.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json(createErrorResponse('Item not found', null, 'NOT_FOUND', req.request_id));
            }
            const mi = mi_res.rows[0];
            if (!mi.stock_tracked) {
                await client.query('ROLLBACK');
                return res.status(400).json(createErrorResponse('Stock is not tracked for this item', null, 'STOCK_NOT_TRACKED', req.request_id));
            }
            const prev = Number(mi.current_stock ?? 0);
            let next = prev;
            if (body.change_type === 'restock')
                next = prev + Math.abs(body.quantity);
            if (body.change_type === 'waste')
                next = Math.max(0, prev - Math.abs(body.quantity));
            if (body.change_type === 'sale')
                next = Math.max(0, prev - Math.abs(body.quantity));
            if (body.change_type === 'adjustment')
                next = Math.max(0, prev + body.quantity);
            await client.query('UPDATE menu_items SET current_stock = $1, updated_at = $2 WHERE item_id = $3', [next, now_iso(), item_id]);
            await client.query(`INSERT INTO stock_history (history_id, item_id, change_type, previous_stock, new_stock, quantity_changed, reason, notes, changed_by_user_id, changed_at, related_order_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NULL)`, [gen_id('sh'), item_id, body.change_type, prev, next, next - prev, body.reason ?? null, body.notes ?? null, req.user.user_id, now_iso()]);
            await client.query('COMMIT');
            maybe_emit_low_stock(item_id).catch(() => { });
            return ok(res, 200, { message: 'Stock updated', item_id, previous_stock: prev, new_stock: next });
        });
    }
    catch (error) {
        if (error instanceof z.ZodError)
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
app.get('/api/admin/stock/:itemId/history', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const item_id = req.params.itemId;
        const q_schema = z.object({ limit: z.number().int().positive().default(50), offset: z.number().int().nonnegative().default(0) });
        const q = parse_query(q_schema, req.query);
        const rows = await pool.query(`SELECT * FROM stock_history WHERE item_id = $1 ORDER BY changed_at DESC LIMIT $2 OFFSET $3`, [item_id, q.limit, q.offset]);
        return ok(res, 200, {
            history: rows.rows.map((r) => ({
                history_id: r.history_id,
                item_id: r.item_id,
                change_type: r.change_type,
                previous_stock: Number(r.previous_stock),
                new_stock: Number(r.new_stock),
                quantity_changed: Number(r.quantity_changed),
                reason: r.reason ?? null,
                notes: r.notes ?? null,
                changed_by_user_id: r.changed_by_user_id,
                changed_at: r.changed_at,
                related_order_id: r.related_order_id ?? null,
            })),
            limit: q.limit,
            offset: q.offset,
        });
    }
    catch (error) {
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
// Admin orders list/detail/update/refund/cancel
app.get('/api/admin/orders', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const q = parse_query(searchOrderInputSchema, req.query);
        const where = ['1=1'];
        const params = [];
        if (q.query) {
            params.push(`%${q.query}%`);
            where.push(`(order_number ILIKE $${params.length} OR customer_name ILIKE $${params.length} OR customer_email ILIKE $${params.length})`);
        }
        if (q.status) {
            params.push(q.status);
            where.push(`status = $${params.length}`);
        }
        if (q.order_type) {
            params.push(q.order_type);
            where.push(`order_type = $${params.length}`);
        }
        if (q.payment_status) {
            params.push(q.payment_status);
            where.push(`payment_status = $${params.length}`);
        }
        if (q.date_from) {
            params.push(q.date_from);
            where.push(`created_at >= $${params.length}`);
        }
        if (q.date_to) {
            params.push(q.date_to);
            where.push(`created_at <= $${params.length}`);
        }
        const count_res = await pool.query(`SELECT COUNT(*)::int as count FROM orders WHERE ${where.join(' AND ')}`, params);
        params.push(q.limit);
        params.push(q.offset);
        const sort_by_map = {
            created_at: 'created_at',
            updated_at: 'updated_at',
            total_amount: 'total_amount',
            order_number: 'order_number',
        };
        const sort_by = sort_by_map[q.sort_by] || 'created_at';
        const sort_order = q.sort_order === 'asc' ? 'ASC' : 'DESC';
        const rows = await pool.query(`SELECT * FROM orders
       WHERE ${where.join(' AND ')}
       ORDER BY ${sort_by} ${sort_order}
       LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
        return ok(res, 200, {
            orders: rows.rows.map((r) => ({
                order_id: r.order_id,
                order_number: r.order_number,
                user_id: r.user_id,
                customer_name: r.customer_name,
                order_type: r.order_type,
                status: r.status,
                total_amount: Number(r.total_amount),
                payment_status: r.payment_status,
                created_at: r.created_at,
            })),
            total: count_res.rows[0]?.count ?? 0,
            limit: q.limit,
            offset: q.offset,
        });
    }
    catch (error) {
        if (error instanceof z.ZodError)
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
app.get('/api/admin/orders/:id', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const order_id = req.params.id;
        const order_res = await pool.query('SELECT * FROM orders WHERE order_id = $1', [order_id]);
        if (order_res.rows.length === 0)
            return res.status(404).json(createErrorResponse('Order not found', null, 'NOT_FOUND', req.request_id));
        const items_res = await pool.query('SELECT * FROM order_items WHERE order_id = $1 ORDER BY item_name ASC', [order_id]);
        const status_res = await pool.query('SELECT * FROM order_status_history WHERE order_id = $1 ORDER BY changed_at ASC', [order_id]);
        return ok(res, 200, {
            order: orderSchema.parse(coerce_numbers({
                ...order_res.rows[0],
                delivery_fee: order_res.rows[0].delivery_fee === null || order_res.rows[0].delivery_fee === undefined ? null : Number(order_res.rows[0].delivery_fee),
                subtotal: Number(order_res.rows[0].subtotal),
                discount_amount: Number(order_res.rows[0].discount_amount),
                tax_amount: Number(order_res.rows[0].tax_amount),
                total_amount: Number(order_res.rows[0].total_amount),
                refund_amount: order_res.rows[0].refund_amount === null || order_res.rows[0].refund_amount === undefined ? null : Number(order_res.rows[0].refund_amount),
            }, ['subtotal', 'discount_amount', 'tax_amount', 'total_amount', 'delivery_fee', 'refund_amount'])),
            items: items_res.rows.map((r) => ({
                order_item_id: r.order_item_id,
                item_name: r.item_name,
                quantity: Number(r.quantity),
                unit_price: Number(r.unit_price),
                line_total: Number(r.line_total),
                selected_customizations: r.selected_customizations ?? null,
            })),
            status_history: status_res.rows,
        });
    }
    catch (error) {
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
/*
  Admin endpoint to update order status
  This allows staff/admin to move orders through the workflow
*/
app.patch('/api/admin/orders/:id/status', authenticate_token, require_role(['admin', 'staff']), async (req, res) => {
    try {
        const order_id = req.params.id;
        const status_schema = z.object({
            status: z.enum(['received', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled']),
            notes: z.string().max(500).optional(),
        });
        const body = status_schema.parse(req.body);
        await with_client(async (client) => {
            await client.query('BEGIN');
            // Get current order
            const order_res = await client.query('SELECT order_id, order_number, ticket_number, user_id, status FROM orders WHERE order_id = $1 FOR UPDATE', [order_id]);
            if (order_res.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json(createErrorResponse('Order not found', null, 'NOT_FOUND', req.request_id));
            }
            const order = order_res.rows[0];
            const old_status = order.status;
            // Update order status
            await client.query('UPDATE orders SET status = $1, updated_at = $2 WHERE order_id = $3', [body.status, now_iso(), order_id]);
            // If completed, set completed_at
            if (body.status === 'completed' && old_status !== 'completed') {
                await client.query('UPDATE orders SET completed_at = $1 WHERE order_id = $2', [now_iso(), order_id]);
            }
            // Add status history entry
            await client.query(`INSERT INTO order_status_history (history_id, order_id, status, changed_by_user_id, changed_at, notes)
         VALUES ($1, $2, $3, $4, $5, $6)`, [gen_id('osh'), order_id, body.status, req.user.user_id, now_iso(), body.notes ?? null]);
            // Log activity
            await log_activity({
                user_id: req.user.user_id,
                action_type: 'update',
                entity_type: 'order',
                entity_id: order_id,
                description: `Updated order ${order.order_number} status from ${old_status} to ${body.status}`,
                changes: { status: { from: old_status, to: body.status } },
                ip_address: req.ip,
                user_agent: req.headers['user-agent'] || null,
            });
            await client.query('COMMIT');
            // Emit WebSocket event for real-time updates
            emit_order_status_updated({
                order_id,
                order_number: order.order_number,
                user_id: order.user_id,
                old_status,
                new_status: body.status,
                changed_by_user: req.user,
            });
            // Send notifications (mocked)
            const cust_res = await pool.query('SELECT customer_email, customer_phone FROM orders WHERE order_id = $1', [order_id]);
            if (cust_res.rows.length > 0) {
                const cust = cust_res.rows[0];
                send_email_mock({
                    to: cust.customer_email,
                    subject: `Order ${order.ticket_number} Status Update`,
                    body: `Your order is now ${body.status}. Track at: /track/${order.ticket_number}`,
                }).catch(() => { });
            }
            return ok(res, 200, {
                order_id,
                order_number: order.order_number,
                ticket_number: order.ticket_number,
                old_status,
                new_status: body.status,
                message: 'Order status updated successfully',
            });
        });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        }
        console.error('Update order status error:', error);
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
app.put('/api/admin/orders/:id', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const order_id = req.params.id;
        const input = updateOrderInputSchema.parse({ ...req.body, order_id });
        await with_client(async (client) => {
            await client.query('BEGIN');
            const ord_res = await client.query('SELECT order_id, order_number, user_id, status FROM orders WHERE order_id = $1 FOR UPDATE', [order_id]);
            if (ord_res.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json(createErrorResponse('Order not found', null, 'NOT_FOUND', req.request_id));
            }
            const ord = ord_res.rows[0];
            const old_status = ord.status;
            const fields = [];
            const params = [];
            for (const [k, v] of Object.entries(input)) {
                if (k === 'order_id')
                    continue;
                if (v === undefined)
                    continue;
                params.push(v);
                fields.push(`${k} = $${params.length}`);
            }
            if (fields.length === 0) {
                await client.query('ROLLBACK');
                return res.status(400).json(createErrorResponse('No fields to update', null, 'NO_UPDATES', req.request_id));
            }
            params.push(now_iso());
            fields.push(`updated_at = $${params.length}`);
            params.push(order_id);
            await client.query(`UPDATE orders SET ${fields.join(', ')} WHERE order_id = $${params.length}`, params);
            if (input.status && input.status !== old_status) {
                await client.query(`INSERT INTO order_status_history (history_id, order_id, status, changed_by_user_id, changed_at, notes)
           VALUES ($1,$2,$3,$4,$5,$6)`, [gen_id('osh'), order_id, input.status, req.user.user_id, now_iso(), input.internal_notes ?? null]);
            }
            await client.query('COMMIT');
            if (input.status && input.status !== old_status) {
                emit_order_status_updated({
                    order_id: ord.order_id,
                    order_number: ord.order_number,
                    user_id: ord.user_id,
                    old_status,
                    new_status: input.status,
                    changed_by_user: req.user,
                });
            }
            return ok(res, 200, { message: 'Order updated', order_id });
        });
    }
    catch (error) {
        if (error instanceof z.ZodError)
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
app.post('/api/admin/orders/:id/refund', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const order_id = req.params.id;
        const body = admin_order_refund_schema.parse({
            ...req.body,
            refund_amount: Number(req.body?.refund_amount),
        });
        await with_client(async (client) => {
            await client.query('BEGIN');
            const ord_res = await client.query('SELECT order_id, order_number, user_id, payment_status, sumup_transaction_id, total_amount FROM orders WHERE order_id = $1 FOR UPDATE', [order_id]);
            if (ord_res.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json(createErrorResponse('Order not found', null, 'NOT_FOUND', req.request_id));
            }
            const ord = ord_res.rows[0];
            if (ord.payment_status !== 'paid' || !ord.sumup_transaction_id) {
                await client.query('ROLLBACK');
                return res.status(400).json(createErrorResponse('Order is not refundable', null, 'REFUND_NOT_ALLOWED', req.request_id));
            }
            const refund = await sumup_refund_mock({ transaction_id: ord.sumup_transaction_id, amount: body.refund_amount, reason: body.refund_reason ?? 'Refund issued by admin' });
            if (!refund.success) {
                await client.query('ROLLBACK');
                return res.status(400).json(createErrorResponse('Refund failed', null, 'REFUND_FAILED', req.request_id));
            }
            await client.query(`UPDATE orders
         SET payment_status = 'refunded', status = 'refunded', refund_amount = $1, refund_reason = $2, refunded_at = $3, updated_at = $3
         WHERE order_id = $4`, [body.refund_amount, body.refund_reason ?? 'Refund issued by admin', now_iso(), order_id]);
            await client.query(`INSERT INTO order_status_history (history_id, order_id, status, changed_by_user_id, changed_at, notes)
         VALUES ($1,$2,'refunded',$3,$4,$5)`, [gen_id('osh'), order_id, req.user.user_id, now_iso(), body.refund_reason ?? 'Refund issued']);
            await client.query('COMMIT');
            io.to('staff').emit('order_status_updated', {
                event: 'order_status_updated',
                data: { order_id, order_number: ord.order_number, old_status: ord.status, new_status: 'refunded' },
                timestamp: now_iso(),
            });
            io.to(`customer_${ord.user_id}`).emit('order_status_updated', {
                event: 'order_status_updated',
                data: { order_id, order_number: ord.order_number, new_status: 'refunded', message: 'Your order has been refunded.' },
                timestamp: now_iso(),
            });
            return ok(res, 200, { message: 'Refund processed', refund_id: refund.refund_id });
        });
    }
    catch (error) {
        if (error instanceof z.ZodError)
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
app.post('/api/admin/orders/:id/cancel', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const order_id = req.params.id;
        const body = admin_order_cancel_schema.parse({
            ...req.body,
            refund_amount: req.body?.refund_amount === undefined || req.body?.refund_amount === null ? null : Number(req.body.refund_amount),
        });
        await with_client(async (client) => {
            await client.query('BEGIN');
            const ord_res = await client.query('SELECT * FROM orders WHERE order_id = $1 FOR UPDATE', [order_id]);
            if (ord_res.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json(createErrorResponse('Order not found', null, 'NOT_FOUND', req.request_id));
            }
            const ord = ord_res.rows[0];
            const cancelled_at = now_iso();
            if (body.issue_refund && ord.payment_status === 'paid' && ord.sumup_transaction_id) {
                const amount_to_refund = body.refund_amount ?? Number(ord.total_amount);
                const refund = await sumup_refund_mock({ transaction_id: ord.sumup_transaction_id, amount: amount_to_refund, reason: body.refund_reason ?? body.cancellation_reason });
                if (!refund.success) {
                    await client.query('ROLLBACK');
                    return res.status(400).json(createErrorResponse('Refund failed', null, 'REFUND_FAILED', req.request_id));
                }
                await client.query(`UPDATE orders
           SET status = 'cancelled', cancelled_at = $1, cancellation_reason = $2,
               payment_status = 'refunded', refund_amount = $3, refund_reason = $4, refunded_at = $1,
               updated_at = $1
           WHERE order_id = $5`, [cancelled_at, body.cancellation_reason, amount_to_refund, body.refund_reason ?? body.cancellation_reason, order_id]);
            }
            else {
                await client.query(`UPDATE orders
           SET status = 'cancelled', cancelled_at = $1, cancellation_reason = $2, updated_at = $1
           WHERE order_id = $3`, [cancelled_at, body.cancellation_reason, order_id]);
            }
            await client.query(`INSERT INTO order_status_history (history_id, order_id, status, changed_by_user_id, changed_at, notes)
         VALUES ($1,$2,'cancelled',$3,$4,$5)`, [gen_id('osh'), order_id, req.user.user_id, cancelled_at, body.cancellation_reason]);
            await client.query('COMMIT');
            io.to('staff').emit('order_cancelled', {
                event: 'order_cancelled',
                data: {
                    order_id,
                    order_number: ord.order_number,
                    cancelled_by: 'admin',
                    cancellation_reason: body.cancellation_reason,
                    cancelled_at,
                },
                timestamp: now_iso(),
            });
            io.to(`customer_${ord.user_id}`).emit('order_cancelled', {
                event: 'order_cancelled',
                data: {
                    order_id,
                    order_number: ord.order_number,
                    refund_amount: body.issue_refund ? (body.refund_amount ?? Number(ord.total_amount)) : null,
                    message: 'Your order has been cancelled by the restaurant.',
                },
                timestamp: now_iso(),
            });
            return ok(res, 200, { message: 'Order cancelled' });
        });
    }
    catch (error) {
        if (error instanceof z.ZodError)
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
// Admin delivery settings
app.get('/api/admin/delivery/settings', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const delivery_enabled = await get_setting('delivery_enabled', true);
        const minimum_order_delivery = await get_setting('minimum_order_delivery', 0);
        const free_delivery_threshold = await get_setting('free_delivery_threshold', null);
        const order_prep_time_delivery = await get_setting('order_prep_time_delivery', 30);
        const zones_res = await pool.query('SELECT * FROM delivery_zones ORDER BY priority DESC, zone_name ASC');
        const zones = zones_res.rows.map((zrow) => ({
            zone_id: zrow.zone_id,
            zone_name: zrow.zone_name,
            zone_type: zrow.zone_type,
            zone_boundaries: zrow.zone_boundaries,
            delivery_fee: Number(zrow.delivery_fee),
            minimum_order_value: zrow.minimum_order_value === null || zrow.minimum_order_value === undefined ? null : Number(zrow.minimum_order_value),
            estimated_delivery_time: Number(zrow.estimated_delivery_time),
            is_active: zrow.is_active,
            priority: Number(zrow.priority),
            created_at: zrow.created_at,
            updated_at: zrow.updated_at,
        }));
        return ok(res, 200, {
            delivery_enabled: delivery_enabled !== false,
            minimum_order_delivery: Number(minimum_order_delivery ?? 0),
            free_delivery_threshold: free_delivery_threshold === null ? null : Number(free_delivery_threshold),
            order_prep_time_delivery: Number(order_prep_time_delivery ?? 30),
            zones,
        });
    }
    catch (error) {
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
app.put('/api/admin/delivery/settings', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const body = admin_delivery_settings_update_schema.parse(req.body);
        await with_client(async (client) => {
            await client.query('BEGIN');
            if (body.delivery_enabled !== undefined) {
                await upsert_setting(client, { setting_key: 'delivery_enabled', setting_value: body.delivery_enabled, setting_type: 'boolean', updated_by_user_id: req.user.user_id });
            }
            if (body.minimum_order_delivery !== undefined) {
                await upsert_setting(client, { setting_key: 'minimum_order_delivery', setting_value: body.minimum_order_delivery, setting_type: 'number', updated_by_user_id: req.user.user_id });
            }
            if (body.free_delivery_threshold !== undefined) {
                await upsert_setting(client, { setting_key: 'free_delivery_threshold', setting_value: body.free_delivery_threshold, setting_type: 'number', updated_by_user_id: req.user.user_id });
            }
            if (body.order_prep_time_delivery !== undefined) {
                await upsert_setting(client, { setting_key: 'order_prep_time_delivery', setting_value: body.order_prep_time_delivery, setting_type: 'number', updated_by_user_id: req.user.user_id });
            }
            if (body.zones) {
                for (const zc of body.zones) {
                    if (zc.zone_id) {
                        await client.query(`UPDATE delivery_zones
               SET zone_name = $1, zone_type = $2, zone_boundaries = $3::jsonb,
                   delivery_fee = $4, minimum_order_value = $5, estimated_delivery_time = $6,
                   is_active = $7, priority = $8, updated_at = $9
               WHERE zone_id = $10`, [
                            zc.zone_name,
                            zc.zone_type,
                            JSON.stringify(zc.zone_boundaries),
                            zc.delivery_fee,
                            zc.minimum_order_value ?? null,
                            zc.estimated_delivery_time,
                            zc.is_active,
                            zc.priority,
                            now_iso(),
                            zc.zone_id,
                        ]);
                    }
                    else {
                        const zone_id = gen_id('zone');
                        const ts = now_iso();
                        await client.query(`INSERT INTO delivery_zones (
                 zone_id, zone_name, zone_type, zone_boundaries,
                 delivery_fee, minimum_order_value, estimated_delivery_time,
                 is_active, priority, created_at, updated_at
               ) VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9,$10,$11)`, [
                            zone_id,
                            zc.zone_name,
                            zc.zone_type,
                            JSON.stringify(zc.zone_boundaries),
                            zc.delivery_fee,
                            zc.minimum_order_value ?? null,
                            zc.estimated_delivery_time,
                            zc.is_active,
                            zc.priority,
                            ts,
                            ts,
                        ]);
                    }
                }
            }
            await client.query('COMMIT');
        });
        return ok(res, 200, { message: 'Delivery settings updated' });
    }
    catch (error) {
        if (error instanceof z.ZodError)
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
// Admin delivery zones - individual zone management
app.post('/api/admin/delivery/zones', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const schema = z.object({
            zone_name: z.string(),
            zone_type: z.enum(['polygon', 'radius', 'postal_code']),
            zone_boundaries: z.record(z.any()),
            delivery_fee: z.number(),
            minimum_order_value: z.number().nullable().optional(),
            estimated_delivery_time: z.number(),
            is_active: z.boolean(),
            priority: z.number(),
        });
        const body = schema.parse(req.body);
        const zone_id = gen_id('zone');
        const ts = now_iso();
        await pool.query(`INSERT INTO delivery_zones (
         zone_id, zone_name, zone_type, zone_boundaries,
         delivery_fee, minimum_order_value, estimated_delivery_time,
         is_active, priority, created_at, updated_at
       ) VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9,$10,$11)`, [
            zone_id,
            body.zone_name,
            body.zone_type,
            JSON.stringify(body.zone_boundaries),
            body.delivery_fee,
            body.minimum_order_value ?? null,
            body.estimated_delivery_time,
            body.is_active,
            body.priority,
            ts,
            ts,
        ]);
        return ok(res, 201, { zone_id });
    }
    catch (error) {
        if (error instanceof z.ZodError)
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
app.put('/api/admin/delivery/zones/:zoneId', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const schema = z.object({
            zone_name: z.string().optional(),
            zone_type: z.enum(['polygon', 'radius', 'postal_code']).optional(),
            zone_boundaries: z.record(z.any()).optional(),
            delivery_fee: z.number().optional(),
            minimum_order_value: z.number().nullable().optional(),
            estimated_delivery_time: z.number().optional(),
            is_active: z.boolean().optional(),
            priority: z.number().optional(),
        });
        const body = schema.parse(req.body);
        const { zoneId } = req.params;
        // Check if zone exists
        const check = await pool.query('SELECT zone_id FROM delivery_zones WHERE zone_id = $1', [zoneId]);
        if (check.rows.length === 0) {
            return res.status(404).json(createErrorResponse('Delivery zone not found', null, 'NOT_FOUND', req.request_id));
        }
        const updates = [];
        const values = [];
        let paramCount = 1;
        if (body.zone_name !== undefined) {
            updates.push(`zone_name = $${paramCount++}`);
            values.push(body.zone_name);
        }
        if (body.zone_type !== undefined) {
            updates.push(`zone_type = $${paramCount++}`);
            values.push(body.zone_type);
        }
        if (body.zone_boundaries !== undefined) {
            updates.push(`zone_boundaries = $${paramCount++}::jsonb`);
            values.push(JSON.stringify(body.zone_boundaries));
        }
        if (body.delivery_fee !== undefined) {
            updates.push(`delivery_fee = $${paramCount++}`);
            values.push(body.delivery_fee);
        }
        if (body.minimum_order_value !== undefined) {
            updates.push(`minimum_order_value = $${paramCount++}`);
            values.push(body.minimum_order_value);
        }
        if (body.estimated_delivery_time !== undefined) {
            updates.push(`estimated_delivery_time = $${paramCount++}`);
            values.push(body.estimated_delivery_time);
        }
        if (body.is_active !== undefined) {
            updates.push(`is_active = $${paramCount++}`);
            values.push(body.is_active);
        }
        if (body.priority !== undefined) {
            updates.push(`priority = $${paramCount++}`);
            values.push(body.priority);
        }
        if (updates.length > 0) {
            updates.push(`updated_at = $${paramCount++}`);
            values.push(now_iso());
            values.push(zoneId);
            await pool.query(`UPDATE delivery_zones SET ${updates.join(', ')} WHERE zone_id = $${paramCount}`, values);
        }
        return ok(res, 200, { message: 'Delivery zone updated' });
    }
    catch (error) {
        if (error instanceof z.ZodError)
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
app.delete('/api/admin/delivery/zones/:zoneId', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const { zoneId } = req.params;
        const result = await pool.query('DELETE FROM delivery_zones WHERE zone_id = $1', [zoneId]);
        if (result.rowCount === 0) {
            return res.status(404).json(createErrorResponse('Delivery zone not found', null, 'NOT_FOUND', req.request_id));
        }
        return ok(res, 200, { message: 'Delivery zone deleted' });
    }
    catch (error) {
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
// Validate delivery address (accessible to customers during checkout)
app.post('/api/admin/delivery/validate-address', authenticate_token, async (req, res) => {
    try {
        const schema = z.object({
            address: z.string().min(1),
            postal_code: z.string().min(1),
        });
        const { address, postal_code } = schema.parse(req.body);
        // Use geocode function to get coordinates
        const coords = await geocode_address_mock({
            address_line1: address,
            city: 'Dublin',
            postal_code: postal_code,
        });
        // Find delivery zone for coordinates
        const zone = await find_delivery_zone(coords.latitude, coords.longitude);
        if (!zone) {
            return ok(res, 200, {
                valid: false,
                message: "Delivery not available to this address",
                delivery_fee: 0,
                estimated_delivery_time: null,
                zone_id: null,
            });
        }
        return ok(res, 200, {
            valid: true,
            message: "Delivery available",
            delivery_fee: zone.delivery_fee,
            estimated_delivery_time: zone.estimated_delivery_time,
            zone_id: zone.zone_id,
            zone_name: zone.zone_name,
        });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        }
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
// Admin discounts
app.get('/api/admin/discounts', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const schema = z.object({ limit: z.number().int().positive().default(50), offset: z.number().int().nonnegative().default(0) });
        const q = parse_query(schema, req.query);
        const rows = await pool.query('SELECT * FROM discount_codes ORDER BY created_at DESC LIMIT $1 OFFSET $2', [q.limit, q.offset]);
        const discounts = rows.rows.map((r) => discountCodeSchema.parse({
            ...coerce_numbers(r, ['discount_value', 'minimum_order_value']),
            discount_value: Number(r.discount_value),
            minimum_order_value: r.minimum_order_value === null || r.minimum_order_value === undefined ? null : Number(r.minimum_order_value),
            applicable_order_types: r.applicable_order_types ?? null,
            applicable_category_ids: r.applicable_category_ids ?? null,
            applicable_item_ids: r.applicable_item_ids ?? null,
            total_usage_limit: r.total_usage_limit ?? null,
            per_customer_usage_limit: r.per_customer_usage_limit ?? null,
            total_used_count: Number(r.total_used_count),
            valid_until: r.valid_until ?? null,
            internal_notes: r.internal_notes ?? null,
        }));
        return ok(res, 200, { discounts, limit: q.limit, offset: q.offset });
    }
    catch (error) {
        if (error instanceof z.ZodError)
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
app.post('/api/admin/discounts', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const input = createDiscountCodeInputSchema.parse({
            ...req.body,
            code: ensure_upper(req.body?.code),
            discount_value: Number(req.body?.discount_value),
            minimum_order_value: req.body?.minimum_order_value === undefined || req.body?.minimum_order_value === null ? null : Number(req.body.minimum_order_value),
        });
        const code_id = gen_id('dc');
        const ts = now_iso();
        await pool.query(`INSERT INTO discount_codes (
        code_id, code, discount_type, discount_value,
        applicable_order_types, applicable_category_ids, applicable_item_ids,
        minimum_order_value, total_usage_limit, per_customer_usage_limit,
        total_used_count, valid_from, valid_until, status,
        internal_notes, created_at, updated_at
      ) VALUES (
        $1,$2,$3,$4,
        $5::jsonb,$6::jsonb,$7::jsonb,
        $8,$9,$10,
        0,$11,$12,$13,
        $14,$15,$16
      )`, [
            code_id,
            input.code,
            input.discount_type,
            input.discount_value,
            input.applicable_order_types ? JSON.stringify(input.applicable_order_types) : null,
            input.applicable_category_ids ? JSON.stringify(input.applicable_category_ids) : null,
            input.applicable_item_ids ? JSON.stringify(input.applicable_item_ids) : null,
            input.minimum_order_value ?? null,
            input.total_usage_limit ?? null,
            input.per_customer_usage_limit ?? null,
            input.valid_from,
            input.valid_until ?? null,
            input.status,
            input.internal_notes ?? null,
            ts,
            ts,
        ]);
        // Log activity
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
        return ok(res, 201, { code_id });
    }
    catch (error) {
        if (error instanceof z.ZodError)
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        if (String(error?.message || '').includes('duplicate key')) {
            return res.status(409).json(createErrorResponse('Discount code already exists', error, 'DISCOUNT_CODE_EXISTS', req.request_id));
        }
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
app.get('/api/admin/discounts/:id', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const code_id = req.params.id;
        const row = await pool.query('SELECT * FROM discount_codes WHERE code_id = $1', [code_id]);
        if (row.rows.length === 0)
            return res.status(404).json(createErrorResponse('Discount not found', null, 'NOT_FOUND', req.request_id));
        const rawData = row.rows[0];
        const discount = discountCodeSchema.parse({
            ...coerce_numbers(rawData, ['discount_value', 'minimum_order_value']),
            discount_value: Number(rawData.discount_value),
            minimum_order_value: rawData.minimum_order_value === null || rawData.minimum_order_value === undefined ? null : Number(rawData.minimum_order_value),
            applicable_order_types: Array.isArray(rawData.applicable_order_types) ? rawData.applicable_order_types : (rawData.applicable_order_types ? [rawData.applicable_order_types] : []),
            applicable_category_ids: Array.isArray(rawData.applicable_category_ids) ? rawData.applicable_category_ids : (rawData.applicable_category_ids ? [rawData.applicable_category_ids] : []),
            applicable_item_ids: Array.isArray(rawData.applicable_item_ids) ? rawData.applicable_item_ids : (rawData.applicable_item_ids ? [rawData.applicable_item_ids] : []),
            total_usage_limit: rawData.total_usage_limit ?? null,
            per_customer_usage_limit: rawData.per_customer_usage_limit ?? null,
            total_used_count: Number(rawData.total_used_count),
            valid_until: rawData.valid_until ?? null,
            internal_notes: rawData.internal_notes ?? null,
        });
        return ok(res, 200, discount);
    }
    catch (error) {
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
app.put('/api/admin/discounts/:id', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const code_id = req.params.id;
        const input = updateDiscountCodeInputSchema.parse({
            ...req.body,
            code_id,
            discount_value: req.body?.discount_value === undefined ? undefined : Number(req.body.discount_value),
            minimum_order_value: req.body?.minimum_order_value === undefined ? undefined : req.body.minimum_order_value === null ? null : Number(req.body.minimum_order_value),
            total_usage_limit: req.body?.total_usage_limit === undefined ? undefined : req.body.total_usage_limit === null ? null : Number(req.body.total_usage_limit),
            per_customer_usage_limit: req.body?.per_customer_usage_limit === undefined ? undefined : req.body.per_customer_usage_limit === null ? null : Number(req.body.per_customer_usage_limit),
        });
        const fields = [];
        const params = [];
        for (const [k, v] of Object.entries(input)) {
            if (k === 'code_id')
                continue;
            if (v === undefined)
                continue;
            params.push(v);
            fields.push(`${k} = $${params.length}`);
        }
        params.push(now_iso());
        fields.push(`updated_at = $${params.length}`);
        params.push(code_id);
        const upd = await pool.query(`UPDATE discount_codes SET ${fields.join(', ')} WHERE code_id = $${params.length} RETURNING code_id, code`, params);
        if (upd.rows.length === 0)
            return res.status(404).json(createErrorResponse('Discount not found', null, 'NOT_FOUND', req.request_id));
        // Log activity
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
        return ok(res, 200, { code_id });
    }
    catch (error) {
        if (error instanceof z.ZodError)
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
app.delete('/api/admin/discounts/:id', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const code_id = req.params.id;
        const del = await pool.query('DELETE FROM discount_codes WHERE code_id = $1 RETURNING code_id', [code_id]);
        if (del.rows.length === 0)
            return res.status(404).json(createErrorResponse('Discount not found', null, 'NOT_FOUND', req.request_id));
        return ok(res, 200, { message: 'Discount deleted' });
    }
    catch (error) {
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
// Get discount usage analytics
app.get('/api/admin/discounts/:id/usage', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const code_id = req.params.id;
        // First verify the discount code exists
        const discount_res = await pool.query('SELECT code, discount_type, discount_value, total_used_count FROM discount_codes WHERE code_id = $1', [code_id]);
        if (discount_res.rows.length === 0) {
            return res.status(404).json(createErrorResponse('Discount not found', null, 'NOT_FOUND', req.request_id));
        }
        const discount = discount_res.rows[0];
        // Get usage details with customer and order information
        const usage_res = await pool.query(`SELECT 
        du.usage_id,
        du.user_id,
        du.order_id,
        du.discount_amount_applied,
        du.used_at,
        u.email as customer_email,
        u.first_name || ' ' || u.last_name as customer_name,
        o.order_number,
        o.total_amount as order_total,
        o.status as order_status
      FROM discount_usage du
      JOIN users u ON du.user_id = u.user_id
      JOIN orders o ON du.order_id = o.order_id
      WHERE du.code_id = $1
      ORDER BY du.used_at DESC`, [code_id]);
        // Calculate summary statistics
        const total_usage_count = usage_res.rows.length;
        const total_discount_given = usage_res.rows.reduce((sum, row) => sum + Number(row.discount_amount_applied), 0);
        const total_order_value = usage_res.rows.reduce((sum, row) => sum + Number(row.order_total), 0);
        // Format usage details
        const usage_details = usage_res.rows.map((row) => ({
            usage_id: row.usage_id,
            user_id: row.user_id,
            customer_email: row.customer_email,
            customer_name: row.customer_name,
            order_id: row.order_id,
            order_number: row.order_number,
            order_total: Number(row.order_total),
            order_status: row.order_status,
            discount_amount_applied: Number(row.discount_amount_applied),
            used_at: row.used_at,
        }));
        return ok(res, 200, {
            code: discount.code,
            discount_type: discount.discount_type,
            discount_value: Number(discount.discount_value),
            summary: {
                total_usage_count,
                total_discount_given: Number(total_discount_given.toFixed(2)),
                total_order_value: Number(total_order_value.toFixed(2)),
                average_order_value: total_usage_count > 0 ? Number((total_order_value / total_usage_count).toFixed(2)) : 0,
                average_discount_per_use: total_usage_count > 0 ? Number((total_discount_given / total_usage_count).toFixed(2)) : 0,
            },
            usage_details,
        });
    }
    catch (error) {
        console.error('Error fetching discount usage:', error);
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
// Admin customers
app.get('/api/admin/customers', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const q = parse_query(z.object({
            query: z.string().optional(),
            limit: z.number().int().positive().default(20),
            offset: z.number().int().nonnegative().default(0),
        }), req.query);
        const params = [];
        const where = ["role = 'customer'"];
        if (q.query) {
            params.push(`%${q.query}%`);
            where.push(`(email ILIKE $${params.length} OR first_name ILIKE $${params.length} OR last_name ILIKE $${params.length} OR phone ILIKE $${params.length})`);
        }
        params.push(q.limit);
        params.push(q.offset);
        const rows = await pool.query(`SELECT user_id, email, phone, first_name, last_name, role, email_verified, status, created_at
       FROM users
       WHERE ${where.join(' AND ')}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
        return ok(res, 200, { customers: rows.rows });
    }
    catch (error) {
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
app.get('/api/admin/customers/:id', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const user_id = req.params.id;
        const user_res = await pool.query('SELECT * FROM users WHERE user_id = $1 AND role = $2', [user_id, 'customer']);
        if (user_res.rows.length === 0)
            return res.status(404).json(createErrorResponse('Customer not found', null, 'NOT_FOUND', req.request_id));
        const la_res = await pool.query('SELECT * FROM loyalty_accounts WHERE user_id = $1', [user_id]);
        const orders_res = await pool.query('SELECT COUNT(*)::int as total_orders, COALESCE(SUM(total_amount),0) as total_spend FROM orders WHERE user_id = $1 AND payment_status = $2', [user_id, 'paid']);
        return ok(res, 200, {
            customer: userSchema.parse({
                ...user_res.rows[0],
                profile_photo_url: user_res.rows[0].profile_photo_url ?? null,
                last_login_at: user_res.rows[0].last_login_at ?? null,
                dietary_preferences: user_res.rows[0].dietary_preferences ?? null,
                first_order_discount_code: user_res.rows[0].first_order_discount_code ?? null,
                referral_code: user_res.rows[0].referral_code ?? null,
                referred_by_user_id: user_res.rows[0].referred_by_user_id ?? null,
                staff_permissions: user_res.rows[0].staff_permissions ?? null,
            }),
            loyalty_account: la_res.rows.length ? loyaltyAccountSchema.parse({
                ...la_res.rows[0],
                current_points_balance: Number(la_res.rows[0].current_points_balance),
                total_points_earned: Number(la_res.rows[0].total_points_earned),
                total_points_redeemed: Number(la_res.rows[0].total_points_redeemed),
                total_points_expired: Number(la_res.rows[0].total_points_expired),
                referral_count: Number(la_res.rows[0].referral_count),
                spin_wheel_available_count: Number(la_res.rows[0].spin_wheel_available_count),
            }) : null,
            stats: {
                total_orders: orders_res.rows[0]?.total_orders ?? 0,
                total_spend: Number(orders_res.rows[0]?.total_spend ?? 0),
            },
        });
    }
    catch (error) {
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
app.put('/api/admin/customers/:id/points', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const user_id = req.params.id;
        const body = admin_customers_points_schema.parse(req.body);
        await with_client(async (client) => {
            await client.query('BEGIN');
            const la_res = await client.query('SELECT loyalty_account_id, current_points_balance FROM loyalty_accounts WHERE user_id = $1 FOR UPDATE', [user_id]);
            if (la_res.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json(createErrorResponse('Loyalty account not found', null, 'NOT_FOUND', req.request_id));
            }
            const la = la_res.rows[0];
            const prev_balance = Number(la.current_points_balance);
            const delta = body.action === 'add' ? body.points : -body.points;
            const next_balance = prev_balance + delta;
            await client.query('UPDATE loyalty_accounts SET current_points_balance = $1 WHERE loyalty_account_id = $2', [next_balance, la.loyalty_account_id]);
            await client.query(`INSERT INTO points_transactions (
          transaction_id, loyalty_account_id, transaction_type, points_amount,
          order_id, reason, adjusted_by_user_id, running_balance, created_at, expires_at
        ) VALUES ($1,$2,'manual_adjustment',$3,NULL,$4,$5,$6,$7,NULL)`, [gen_id('pt'), la.loyalty_account_id, delta, body.reason, req.user.user_id, next_balance, now_iso()]);
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
            return ok(res, 200, { message: 'Points updated', previous_balance: prev_balance, new_balance: next_balance });
        });
    }
    catch (error) {
        if (error instanceof z.ZodError)
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
// Admin customer status update (suspend/activate)
app.put('/api/admin/customers/:id/status', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const user_id = req.params.id;
        const body = z.object({
            status: z.enum(['active', 'suspended']),
            reason: z.string().min(1).max(500),
        }).parse(req.body);
        // Verify customer exists and is a customer role
        const user_res = await pool.query('SELECT user_id, first_name, last_name, email, status FROM users WHERE user_id = $1 AND role = $2', [user_id, 'customer']);
        if (user_res.rows.length === 0) {
            return res.status(404).json(createErrorResponse('Customer not found', null, 'NOT_FOUND', req.request_id));
        }
        const customer = user_res.rows[0];
        const previous_status = customer.status;
        // If already at requested status, return success (idempotent)
        if (previous_status === body.status) {
            return ok(res, 200, {
                message: `Account is already ${body.status}`,
                status: body.status,
                user_id: user_id,
            });
        }
        // Update status
        await pool.query('UPDATE users SET status = $1 WHERE user_id = $2', [body.status, user_id]);
        const customer_name = `${customer.first_name} ${customer.last_name}`;
        // Log activity
        await log_activity({
            user_id: req.user.user_id,
            action_type: 'update',
            entity_type: 'user',
            entity_id: user_id,
            description: `${body.status === 'suspended' ? 'Suspended' : 'Activated'} customer account: ${customer_name}`,
            changes: {
                previous_status,
                new_status: body.status,
                reason: body.reason,
            },
            ip_address: req.ip,
            user_agent: req.headers['user-agent'],
        });
        return ok(res, 200, {
            message: `Account ${body.status === 'suspended' ? 'suspended' : 'activated'} successfully`,
            status: body.status,
            user_id: user_id,
        });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        }
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
// Admin staff accounts
app.get('/api/admin/staff', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const rows = await pool.query("SELECT user_id, email, phone, first_name, last_name, role, status, last_login_at, created_at, staff_permissions FROM users WHERE role IN ('staff','admin') ORDER BY created_at DESC");
        return ok(res, 200, { staff: rows.rows.map((u) => ({
                user_id: u.user_id,
                email: u.email,
                phone: u.phone,
                first_name: u.first_name,
                last_name: u.last_name,
                role: u.role,
                status: u.status,
                last_login_at: u.last_login_at ?? null,
                created_at: u.created_at,
                staff_permissions: u.staff_permissions ?? null,
            })) });
    }
    catch (error) {
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
app.post('/api/admin/staff', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const schema = createUserInputSchema.extend({
            role: z.enum(['staff', 'admin']),
            staff_permissions: z.record(z.boolean()).nullable().optional()
        });
        const input = schema.parse(req.body);
        const user_id = gen_id('user');
        const created_at = now_iso();
        await pool.query(`INSERT INTO users (
        user_id, email, phone, password_hash, first_name, last_name, role,
        profile_photo_url, email_verified, status, created_at,
        last_login_at, marketing_opt_in, order_notifications_email,
        order_notifications_sms, marketing_emails, marketing_sms,
        newsletter_subscribed, dietary_preferences, first_order_discount_code,
        first_order_discount_used, referral_code, referred_by_user_id, staff_permissions
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,
        NULL,true,'active',$8,
        NULL,false,true,
        false,false,false,
        false,NULL,NULL,
        false,NULL,NULL,$9::jsonb
      )`, [
            user_id,
            input.email.toLowerCase().trim(),
            input.phone.trim(),
            input.password,
            input.first_name.trim(),
            input.last_name.trim(),
            input.role,
            created_at,
            input.staff_permissions ? JSON.stringify(input.staff_permissions) : JSON.stringify({}),
        ]);
        send_email_mock({
            to: input.email.toLowerCase().trim(),
            subject: 'Staff account created',
            body: `Your staff account has been created. Email: ${input.email}. Password: ${input.password}`,
        }).catch(() => { });
        return ok(res, 201, { user_id });
    }
    catch (error) {
        if (error instanceof z.ZodError)
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        if (String(error?.message || '').includes('duplicate key')) {
            return res.status(409).json(createErrorResponse('Email or phone already exists', error, 'USER_ALREADY_EXISTS', req.request_id));
        }
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
app.put('/api/admin/staff/:id', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const user_id = req.params.id;
        const schema = z.object({
            first_name: z.string().min(1).max(100).optional(),
            last_name: z.string().min(1).max(100).optional(),
            phone: z.string().min(10).max(20).optional(),
            status: z.enum(['active', 'inactive', 'suspended']).optional(),
            staff_permissions: z.record(z.boolean()).nullable().optional(),
            role: z.enum(['staff', 'admin']).optional(),
            password: z.string().min(1).optional(),
        });
        const input = schema.parse(req.body);
        const fields = [];
        const params = [];
        for (const [k, v] of Object.entries(input)) {
            if (v === undefined)
                continue;
            params.push(v);
            if (k === 'staff_permissions') {
                fields.push(`${k} = $${params.length}::jsonb`);
            }
            else if (k === 'password') {
                fields.push(`password_hash = $${params.length}`);
            }
            else {
                fields.push(`${k} = $${params.length}`);
            }
        }
        if (fields.length === 0)
            return res.status(400).json(createErrorResponse('No fields to update', null, 'NO_UPDATES', req.request_id));
        params.push(user_id);
        const upd = await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE user_id = $${params.length} AND role IN ('staff','admin') RETURNING user_id`, params);
        if (upd.rows.length === 0)
            return res.status(404).json(createErrorResponse('Staff user not found', null, 'NOT_FOUND', req.request_id));
        return ok(res, 200, { user_id });
    }
    catch (error) {
        if (error instanceof z.ZodError)
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
app.delete('/api/admin/staff/:id', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const user_id = req.params.id;
        const del = await pool.query("DELETE FROM users WHERE user_id = $1 AND role IN ('staff','admin') RETURNING user_id", [user_id]);
        if (del.rows.length === 0)
            return res.status(404).json(createErrorResponse('Staff user not found', null, 'NOT_FOUND', req.request_id));
        return ok(res, 200, { message: 'Staff account deleted' });
    }
    catch (error) {
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
// Admin catering inquiries
app.get('/api/admin/catering/inquiries', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const q = parse_query(searchCateringInquiryInputSchema, req.query);
        const where = ['1=1'];
        const params = [];
        if (q.query) {
            params.push(`%${q.query}%`);
            where.push(`(inquiry_number ILIKE $${params.length} OR contact_name ILIKE $${params.length} OR contact_email ILIKE $${params.length})`);
        }
        if (q.status) {
            params.push(q.status);
            where.push(`status = $${params.length}`);
        }
        if (q.event_type) {
            params.push(q.event_type);
            where.push(`event_type = $${params.length}`);
        }
        if (q.date_from) {
            params.push(q.date_from);
            where.push(`submitted_at >= $${params.length}`);
        }
        if (q.date_to) {
            params.push(q.date_to);
            where.push(`submitted_at <= $${params.length}`);
        }
        params.push(q.limit);
        params.push(q.offset);
        const rows = await pool.query(`SELECT * FROM catering_inquiries WHERE ${where.join(' AND ')}
       ORDER BY submitted_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
        return ok(res, 200, { inquiries: rows.rows });
    }
    catch (error) {
        if (error instanceof z.ZodError)
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
app.get('/api/admin/catering/inquiries/:id', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const inquiry_id = req.params.id;
        const inq_res = await pool.query('SELECT * FROM catering_inquiries WHERE inquiry_id = $1', [inquiry_id]);
        if (inq_res.rows.length === 0)
            return res.status(404).json(createErrorResponse('Inquiry not found', null, 'NOT_FOUND', req.request_id));
        const quotes = await pool.query('SELECT * FROM catering_quotes WHERE inquiry_id = $1 ORDER BY created_at DESC', [inquiry_id]);
        return ok(res, 200, { inquiry: inq_res.rows[0], quotes: quotes.rows });
    }
    catch (error) {
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
app.put('/api/admin/catering/inquiries/:id', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const inquiry_id = req.params.id;
        const input = updateCateringInquiryInputSchema.parse({ ...req.body, inquiry_id });
        const upd = await pool.query('UPDATE catering_inquiries SET status = $1, admin_notes = $2, updated_at = $3 WHERE inquiry_id = $4 RETURNING inquiry_id', [
            input.status,
            input.admin_notes ?? null,
            now_iso(),
            inquiry_id,
        ]);
        if (upd.rows.length === 0)
            return res.status(404).json(createErrorResponse('Inquiry not found', null, 'NOT_FOUND', req.request_id));
        return ok(res, 200, { message: 'Inquiry updated', inquiry_id });
    }
    catch (error) {
        if (error instanceof z.ZodError)
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
app.post('/api/admin/catering/inquiries/:id/quote', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const inquiry_id = req.params.id;
        const input = createCateringQuoteInputSchema.parse({
            ...req.body,
            inquiry_id,
            subtotal: Number(req.body?.subtotal),
            tax_amount: Number(req.body?.tax_amount),
            grand_total: Number(req.body?.grand_total),
            line_items: Array.isArray(req.body?.line_items) ? req.body.line_items.map((li) => ({
                item: li.item,
                quantity: Number(li.quantity),
                unit_price: Number(li.unit_price),
                total: Number(li.total),
            })) : [],
            additional_fees: req.body?.additional_fees ?? null,
        });
        const inq_res = await pool.query('SELECT inquiry_id, contact_email, inquiry_number FROM catering_inquiries WHERE inquiry_id = $1', [inquiry_id]);
        if (inq_res.rows.length === 0)
            return res.status(404).json(createErrorResponse('Inquiry not found', null, 'NOT_FOUND', req.request_id));
        const quote_id = gen_id('cq');
        const quote_number = `QTE-${String(Math.floor(Date.now() / 1000)).slice(-6)}-${nanoid(4).toUpperCase()}`;
        const ts = now_iso();
        await pool.query(`INSERT INTO catering_quotes (
        quote_id, inquiry_id, quote_number, line_items, subtotal,
        additional_fees, tax_amount, grand_total, valid_until, terms,
        quote_pdf_url, created_at, sent_at, accepted_at
      ) VALUES (
        $1,$2,$3,$4::jsonb,$5,
        $6::jsonb,$7,$8,$9,$10,
        NULL,$11,NULL,NULL
      )`, [
            quote_id,
            inquiry_id,
            quote_number,
            JSON.stringify(input.line_items),
            input.subtotal,
            input.additional_fees ? JSON.stringify(input.additional_fees) : null,
            input.tax_amount,
            input.grand_total,
            input.valid_until,
            input.terms ?? null,
            ts,
        ]);
        await pool.query('UPDATE catering_inquiries SET status = $1, updated_at = $2 WHERE inquiry_id = $3', ['quoted', now_iso(), inquiry_id]);
        const quote_pdf_url = await generate_quote_pdf({ quote_id });
        await pool.query('UPDATE catering_quotes SET quote_pdf_url = $1 WHERE quote_id = $2', [quote_pdf_url, quote_id]);
        // Notify customer (mock).
        send_email_mock({
            to: inq_res.rows[0].contact_email,
            subject: `Catering quote ${quote_number}`,
            body: `Your quote is ready. PDF: ${quote_pdf_url}`,
        }).catch(() => { });
        return ok(res, 201, { quote_id, quote_number, quote_pdf_url });
    }
    catch (error) {
        if (error instanceof z.ZodError)
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        console.error('quote error', error);
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
// Admin invoices
app.get('/api/admin/invoices', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const q_schema = z.object({ limit: z.number().int().positive().default(20), offset: z.number().int().nonnegative().default(0) });
        const q = parse_query(q_schema, req.query);
        const rows = await pool.query('SELECT * FROM invoices ORDER BY created_at DESC LIMIT $1 OFFSET $2', [q.limit, q.offset]);
        // Use safeParse to prevent one bad row from crashing the entire request
        const invoices = [];
        for (const r of rows.rows) {
            const invoiceData = {
                ...coerce_numbers(r, ['subtotal', 'discount_amount', 'delivery_fee', 'tax_amount', 'grand_total']),
                subtotal: Number(r.subtotal),
                discount_amount: Number(r.discount_amount),
                delivery_fee: r.delivery_fee === null || r.delivery_fee === undefined ? null : Number(r.delivery_fee),
                tax_amount: Number(r.tax_amount),
                grand_total: Number(r.grand_total),
                line_items: r.line_items ?? [],
                customer_address: r.customer_address ?? null,
                payment_method: r.payment_method ?? null,
                sumup_transaction_id: r.sumup_transaction_id ?? null,
                due_date: r.due_date ?? null,
                paid_at: r.paid_at ?? null,
                invoice_pdf_url: r.invoice_pdf_url ?? null,
                notes: r.notes ?? null,
                order_id: r.order_id ?? null,
                catering_inquiry_id: r.catering_inquiry_id ?? null,
                user_id: r.user_id ?? null,
            };
            const result = invoiceSchema.safeParse(invoiceData);
            if (result.success) {
                invoices.push(result.data);
            }
            else {
                console.error(`[${req.request_id}] Failed to parse invoice row invoice_id=${r.invoice_id}:`, result.error.issues);
            }
        }
        return ok(res, 200, {
            invoices,
            limit: q.limit,
            offset: q.offset,
        });
    }
    catch (error) {
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
app.get('/api/admin/invoices/:id', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const invoice_id = req.params.id;
        const rows = await pool.query('SELECT * FROM invoices WHERE invoice_id = $1', [invoice_id]);
        if (rows.rows.length === 0)
            return res.status(404).json(createErrorResponse('Invoice not found', null, 'NOT_FOUND', req.request_id));
        const r = rows.rows[0];
        return ok(res, 200, {
            invoice: invoiceSchema.parse({
                ...coerce_numbers(r, ['subtotal', 'discount_amount', 'delivery_fee', 'tax_amount', 'grand_total']),
                subtotal: Number(r.subtotal),
                discount_amount: Number(r.discount_amount),
                delivery_fee: r.delivery_fee === null || r.delivery_fee === undefined ? null : Number(r.delivery_fee),
                tax_amount: Number(r.tax_amount),
                grand_total: Number(r.grand_total),
                line_items: r.line_items ?? [],
                customer_address: r.customer_address ?? null,
                payment_method: r.payment_method ?? null,
                sumup_transaction_id: r.sumup_transaction_id ?? null,
                due_date: r.due_date ?? null,
                paid_at: r.paid_at ?? null,
                invoice_pdf_url: r.invoice_pdf_url ?? null,
                notes: r.notes ?? null,
                order_id: r.order_id ?? null,
                catering_inquiry_id: r.catering_inquiry_id ?? null,
                user_id: r.user_id ?? null,
            }),
        });
    }
    catch (error) {
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
// Create custom invoice (alias for /generate)
app.post('/api/admin/invoices', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const extendedSchema = createInvoiceInputSchema.extend({
            sumup_transaction_id: z.string().nullable().optional(),
            paid_at: z.string().nullable().optional(),
        });
        const input = extendedSchema.parse({
            ...req.body,
            subtotal: Number(req.body?.subtotal),
            discount_amount: req.body?.discount_amount === undefined ? 0 : Number(req.body.discount_amount),
            delivery_fee: req.body?.delivery_fee === undefined || req.body?.delivery_fee === null ? null : Number(req.body.delivery_fee),
            tax_amount: Number(req.body?.tax_amount),
            grand_total: Number(req.body?.grand_total),
            line_items: Array.isArray(req.body?.line_items) ? req.body.line_items.map((li) => ({
                item: li.item,
                quantity: Number(li.quantity),
                unit_price: Number(li.unit_price),
                total: Number(li.total),
            })) : [],
        });
        const invoice_id = gen_id('inv');
        const invoice_number = `INV-${String(Math.floor(Date.now() / 1000)).slice(-6)}-${nanoid(4).toUpperCase()}`;
        const ts = now_iso();
        // Default payment_status if not provided
        const payment_status = input.payment_status || 'pending';
        await pool.query(`INSERT INTO invoices (
        invoice_id, invoice_number, order_id, catering_inquiry_id, user_id,
        customer_name, customer_email, customer_phone, customer_address,
        line_items, subtotal, discount_amount, delivery_fee, tax_amount, grand_total,
        payment_status, payment_method, sumup_transaction_id, issue_date, due_date,
        paid_at, invoice_pdf_url, notes, created_at, updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,
        $6,$7,$8,$9,
        $10::jsonb,$11,$12,$13,$14,$15,
        $16,$17,$18,$19,$20,
        $21,NULL,$22,$23,$24
      )`, [
            invoice_id,
            invoice_number,
            input.order_id ?? null,
            input.catering_inquiry_id ?? null,
            input.user_id,
            input.customer_name,
            input.customer_email,
            input.customer_phone,
            input.customer_address ?? null,
            JSON.stringify(input.line_items),
            input.subtotal,
            input.discount_amount,
            input.delivery_fee ?? null,
            input.tax_amount,
            input.grand_total,
            payment_status,
            input.payment_method ?? null,
            input.sumup_transaction_id ?? null,
            input.issue_date,
            input.due_date ?? null,
            input.paid_at ?? null,
            input.notes ?? null,
            ts,
            ts,
        ]);
        const pdf_url = await generate_invoice_pdf({ invoice_id });
        // Log activity
        await log_activity({
            user_id: req.user.user_id,
            action_type: 'create',
            entity_type: 'invoice',
            entity_id: invoice_id,
            description: `Created custom invoice ${invoice_number}`,
            changes: { invoice_id, invoice_number, customer_name: input.customer_name },
            ip_address: req.ip,
            user_agent: req.headers['user-agent'] || null,
        });
        return ok(res, 201, { invoice_id, invoice_number, invoice_pdf_url: pdf_url });
    }
    catch (error) {
        if (error instanceof z.ZodError)
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
app.post('/api/admin/invoices/generate', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const extendedSchema = createInvoiceInputSchema.extend({
            sumup_transaction_id: z.string().nullable().optional(),
            paid_at: z.string().nullable().optional(),
        });
        const input = extendedSchema.parse({
            ...req.body,
            subtotal: Number(req.body?.subtotal),
            discount_amount: req.body?.discount_amount === undefined ? 0 : Number(req.body.discount_amount),
            delivery_fee: req.body?.delivery_fee === undefined || req.body?.delivery_fee === null ? null : Number(req.body.delivery_fee),
            tax_amount: Number(req.body?.tax_amount),
            grand_total: Number(req.body?.grand_total),
            line_items: Array.isArray(req.body?.line_items) ? req.body.line_items.map((li) => ({
                item: li.item,
                quantity: Number(li.quantity),
                unit_price: Number(li.unit_price),
                total: Number(li.total),
            })) : [],
        });
        const invoice_id = gen_id('inv');
        const invoice_number = `INV-${String(Math.floor(Date.now() / 1000)).slice(-6)}-${nanoid(4).toUpperCase()}`;
        const ts = now_iso();
        await pool.query(`INSERT INTO invoices (
        invoice_id, invoice_number, order_id, catering_inquiry_id, user_id,
        customer_name, customer_email, customer_phone, customer_address,
        line_items, subtotal, discount_amount, delivery_fee, tax_amount, grand_total,
        payment_status, payment_method, sumup_transaction_id, issue_date, due_date,
        paid_at, invoice_pdf_url, notes, created_at, updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,
        $6,$7,$8,$9,
        $10::jsonb,$11,$12,$13,$14,$15,
        $16,$17,$18,$19,$20,
        $21,NULL,$22,$23,$24
      )`, [
            invoice_id,
            invoice_number,
            input.order_id ?? null,
            input.catering_inquiry_id ?? null,
            input.user_id,
            input.customer_name,
            input.customer_email,
            input.customer_phone,
            input.customer_address ?? null,
            JSON.stringify(input.line_items),
            input.subtotal,
            input.discount_amount,
            input.delivery_fee ?? null,
            input.tax_amount,
            input.grand_total,
            input.payment_status,
            input.payment_method ?? null,
            input.sumup_transaction_id ?? null,
            input.issue_date,
            input.due_date ?? null,
            input.paid_at ?? null,
            input.notes ?? null,
            ts,
            ts,
        ]);
        const pdf_url = await generate_invoice_pdf({ invoice_id });
        return ok(res, 201, { invoice_id, invoice_number, invoice_pdf_url: pdf_url });
    }
    catch (error) {
        if (error instanceof z.ZodError)
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
// Send invoice via email
app.post('/api/admin/invoices/:id/send', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const invoice_id = req.params.id;
        const invoice_res = await pool.query('SELECT * FROM invoices WHERE invoice_id = $1', [invoice_id]);
        if (invoice_res.rows.length === 0) {
            return res.status(404).json(createErrorResponse('Invoice not found', null, 'NOT_FOUND', req.request_id));
        }
        const invoice = invoice_res.rows[0];
        // Generate PDF if not exists
        let pdf_url = invoice.invoice_pdf_url;
        if (!pdf_url) {
            pdf_url = await generate_invoice_pdf({ invoice_id });
        }
        // Send email (mocked in dev environment)
        await send_email_mock({
            to: invoice.customer_email,
            subject: `Invoice ${invoice.invoice_number} from Salama Lama Food Truck`,
            body: `Dear ${invoice.customer_name},\n\nPlease find your invoice ${invoice.invoice_number} attached.\n\nAmount Due: €${Number(invoice.grand_total).toFixed(2)}\n\nThank you for your business!`,
        });
        // Log activity
        await log_activity({
            user_id: req.user.user_id,
            action_type: 'send',
            entity_type: 'invoice',
            entity_id: invoice_id,
            description: `Sent invoice ${invoice.invoice_number} to ${invoice.customer_email}`,
            changes: { sent_at: now_iso() },
            ip_address: req.ip,
            user_agent: req.headers['user-agent'] || null,
        });
        return ok(res, 200, { message: 'Invoice sent successfully', invoice_pdf_url: pdf_url });
    }
    catch (error) {
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
// Update invoice (payment status, notes)
app.put('/api/admin/invoices/:id', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const invoice_id = req.params.id;
        // Check invoice exists
        const existing = await pool.query('SELECT * FROM invoices WHERE invoice_id = $1', [invoice_id]);
        if (existing.rows.length === 0) {
            return res.status(404).json(createErrorResponse('Invoice not found', null, 'NOT_FOUND', req.request_id));
        }
        // Validate input
        const updateSchema = z.object({
            payment_status: z.enum(['pending', 'paid', 'overdue', 'cancelled']).optional(),
            notes: z.string().nullable().optional(),
        });
        const input = updateSchema.parse(req.body);
        // Build update query
        const updates = [];
        const values = [];
        let paramIndex = 1;
        if (input.payment_status !== undefined) {
            updates.push(`payment_status = $${paramIndex++}`);
            values.push(input.payment_status);
            // If marking as paid and not already paid, set paid_at
            if (input.payment_status === 'paid' && existing.rows[0].payment_status !== 'paid') {
                updates.push(`paid_at = $${paramIndex++}`);
                values.push(now_iso());
            }
        }
        if (input.notes !== undefined) {
            updates.push(`notes = $${paramIndex++}`);
            values.push(input.notes);
        }
        if (updates.length === 0) {
            // Nothing to update, return current invoice
            const r = existing.rows[0];
            return ok(res, 200, {
                invoice: invoiceSchema.parse({
                    ...coerce_numbers(r, ['subtotal', 'discount_amount', 'delivery_fee', 'tax_amount', 'grand_total']),
                    subtotal: Number(r.subtotal),
                    discount_amount: Number(r.discount_amount),
                    delivery_fee: r.delivery_fee === null || r.delivery_fee === undefined ? null : Number(r.delivery_fee),
                    tax_amount: Number(r.tax_amount),
                    grand_total: Number(r.grand_total),
                    line_items: r.line_items ?? [],
                    customer_address: r.customer_address ?? null,
                    payment_method: r.payment_method ?? null,
                    sumup_transaction_id: r.sumup_transaction_id ?? null,
                    due_date: r.due_date ?? null,
                    paid_at: r.paid_at ?? null,
                    invoice_pdf_url: r.invoice_pdf_url ?? null,
                    notes: r.notes ?? null,
                    order_id: r.order_id ?? null,
                    catering_inquiry_id: r.catering_inquiry_id ?? null,
                    user_id: r.user_id ?? null,
                }),
            });
        }
        // Add updated_at
        updates.push(`updated_at = $${paramIndex++}`);
        values.push(now_iso());
        // Add invoice_id as the final param
        values.push(invoice_id);
        const query = `UPDATE invoices SET ${updates.join(', ')} WHERE invoice_id = $${paramIndex} RETURNING *`;
        const result = await pool.query(query, values);
        const r = result.rows[0];
        // Log activity
        await log_activity({
            user_id: req.user.user_id,
            action_type: 'update',
            entity_type: 'invoice',
            entity_id: invoice_id,
            description: `Updated invoice ${r.invoice_number}`,
            changes: input,
            ip_address: req.ip,
            user_agent: req.headers['user-agent'] || null,
        });
        return ok(res, 200, {
            invoice: invoiceSchema.parse({
                ...coerce_numbers(r, ['subtotal', 'discount_amount', 'delivery_fee', 'tax_amount', 'grand_total']),
                subtotal: Number(r.subtotal),
                discount_amount: Number(r.discount_amount),
                delivery_fee: r.delivery_fee === null || r.delivery_fee === undefined ? null : Number(r.delivery_fee),
                tax_amount: Number(r.tax_amount),
                grand_total: Number(r.grand_total),
                line_items: r.line_items ?? [],
                customer_address: r.customer_address ?? null,
                payment_method: r.payment_method ?? null,
                sumup_transaction_id: r.sumup_transaction_id ?? null,
                due_date: r.due_date ?? null,
                paid_at: r.paid_at ?? null,
                invoice_pdf_url: r.invoice_pdf_url ?? null,
                notes: r.notes ?? null,
                order_id: r.order_id ?? null,
                catering_inquiry_id: r.catering_inquiry_id ?? null,
                user_id: r.user_id ?? null,
            }),
        });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        }
        console.error(`[${req.request_id}] Error updating invoice:`, error);
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
// Download invoice PDF (authenticated)
app.get('/api/admin/invoices/:id/pdf', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const invoice_id = req.params.id;
        // Get invoice
        const invoice_res = await pool.query('SELECT invoice_id, invoice_number, invoice_pdf_url FROM invoices WHERE invoice_id = $1', [invoice_id]);
        if (invoice_res.rows.length === 0) {
            return res.status(404).json(createErrorResponse('Invoice not found', null, 'NOT_FOUND', req.request_id));
        }
        const invoice = invoice_res.rows[0];
        let pdf_url = invoice.invoice_pdf_url;
        // Generate PDF if not exists
        if (!pdf_url) {
            pdf_url = await generate_invoice_pdf({ invoice_id });
        }
        // pdf_url is like /storage/invoices/INV-xxxx.pdf
        // The actual file is at backend/storage/invoices/INV-xxxx.pdf
        const file_path = path.join(__dirname, '..', pdf_url);
        // Check file exists
        if (!fs.existsSync(file_path)) {
            // Try to regenerate
            pdf_url = await generate_invoice_pdf({ invoice_id });
            const new_file_path = path.join(__dirname, '..', pdf_url);
            if (!fs.existsSync(new_file_path)) {
                return res.status(404).json(createErrorResponse('Invoice PDF file not found', null, 'NOT_FOUND', req.request_id));
            }
        }
        const file_name = `${invoice.invoice_number}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${file_name}"`);
        const file_stream = fs.createReadStream(file_path);
        file_stream.pipe(res);
    }
    catch (error) {
        console.error(`[${req.request_id}] Error downloading invoice PDF:`, error);
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
// Admin analytics
app.get('/api/admin/analytics/sales', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const q_schema = z.object({ date_from: z.string().optional(), date_to: z.string().optional() });
        const q = parse_query(q_schema, req.query);
        const where = ["payment_status = 'paid'"];
        const params = [];
        if (q.date_from) {
            params.push(q.date_from);
            where.push(`created_at >= $${params.length}`);
        }
        if (q.date_to) {
            params.push(q.date_to);
            where.push(`created_at <= $${params.length}`);
        }
        const sales = await pool.query(`SELECT
         COUNT(*)::int as orders,
         COALESCE(SUM(total_amount),0) as revenue,
         COALESCE(AVG(total_amount),0) as aov
       FROM orders
       WHERE ${where.join(' AND ')}`, params);
        const by_type = await pool.query(`SELECT order_type, COUNT(*)::int as orders, COALESCE(SUM(total_amount),0) as revenue
       FROM orders
       WHERE ${where.join(' AND ')}
       GROUP BY order_type
       ORDER BY revenue DESC`, params);
        const top_items = await pool.query(`SELECT oi.item_name, SUM(oi.quantity)::int as quantity_sold, COALESCE(SUM(oi.line_total),0) as revenue
       FROM order_items oi
       JOIN orders o ON o.order_id = oi.order_id
       WHERE ${where.map((w) => w.replace(/created_at/g, 'o.created_at').replace(/payment_status/g, 'o.payment_status')).join(' AND ')}
       GROUP BY oi.item_name
       ORDER BY quantity_sold DESC
       LIMIT 10`, params);
        // Revenue by day for trend chart
        const revenue_by_day = await pool.query(`SELECT DATE(created_at) as date, COALESCE(SUM(total_amount),0) as revenue
       FROM orders
       WHERE ${where.join(' AND ')}
       GROUP BY DATE(created_at)
       ORDER BY date ASC`, params);
        return ok(res, 200, {
            summary: {
                orders: sales.rows[0]?.orders ?? 0,
                revenue: Number(sales.rows[0]?.revenue ?? 0),
                average_order_value: Number(sales.rows[0]?.aov ?? 0),
            },
            breakdown_by_type: by_type.rows.map((r) => ({ order_type: r.order_type, orders: r.orders, revenue: Number(r.revenue) })),
            top_items: top_items.rows.map((r) => ({ item_name: r.item_name, quantity_sold: r.quantity_sold, revenue: Number(r.revenue) })),
            revenue_by_day: revenue_by_day.rows.map((r) => ({ date: r.date, revenue: Number(r.revenue) })),
        });
    }
    catch (error) {
        if (error instanceof z.ZodError)
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
app.get('/api/admin/analytics/customers', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const total_customers = await pool.query("SELECT COUNT(*)::int as count FROM users WHERE role = 'customer'");
        const repeat_customers = await pool.query(`SELECT COUNT(*)::int as count
       FROM (
         SELECT user_id FROM orders WHERE payment_status = 'paid' GROUP BY user_id HAVING COUNT(*) > 1
       ) t`);
        // Calculate new customers in the selected date range
        const q_schema = z.object({ date_from: z.string().optional(), date_to: z.string().optional() });
        const q = parse_query(q_schema, req.query);
        const date_where = [];
        const date_params = [];
        if (q.date_from) {
            date_params.push(q.date_from);
            date_where.push(`created_at >= $${date_params.length}`);
        }
        if (q.date_to) {
            date_params.push(q.date_to);
            date_where.push(`created_at <= $${date_params.length}`);
        }
        const new_customers_query = date_where.length > 0
            ? await pool.query(`SELECT COUNT(*)::int as count FROM users WHERE role = 'customer' AND ${date_where.join(' AND ')}`, date_params)
            : { rows: [{ count: total_customers.rows[0]?.count ?? 0 }] };
        const top_customers = await pool.query(`SELECT u.user_id, u.first_name, u.last_name, u.email,
              COUNT(o.order_id)::int as orders,
              COALESCE(SUM(o.total_amount),0) as spend
       FROM users u
       LEFT JOIN orders o ON o.user_id = u.user_id AND o.payment_status = 'paid'
       WHERE u.role = 'customer'
       GROUP BY u.user_id
       ORDER BY spend DESC
       LIMIT 20`);
        // Calculate customer lifetime value
        const clv_query = await pool.query(`SELECT COALESCE(AVG(total_spend), 0) as clv
       FROM (
         SELECT u.user_id, COALESCE(SUM(o.total_amount), 0) as total_spend
         FROM users u
         LEFT JOIN orders o ON o.user_id = u.user_id AND o.payment_status = 'paid'
         WHERE u.role = 'customer'
         GROUP BY u.user_id
       ) customer_totals`);
        // Get loyalty engagement data (check if table exists first)
        let loyalty_engagement;
        try {
            loyalty_engagement = await pool.query(`SELECT 
           COUNT(DISTINCT user_id)::int as active_participants,
           COALESCE(SUM(CASE WHEN transaction_type = 'earned' THEN points ELSE 0 END), 0)::int as points_issued,
           COALESCE(SUM(CASE WHEN transaction_type = 'redeemed' THEN ABS(points) ELSE 0 END), 0)::int as points_redeemed
         FROM loyalty_transactions`);
        }
        catch (e) {
            // Table doesn't exist, provide default values
            loyalty_engagement = { rows: [{ active_participants: 0, points_issued: 0, points_redeemed: 0 }] };
        }
        const total_cust = total_customers.rows[0]?.count ?? 0;
        const repeat_cust = repeat_customers.rows[0]?.count ?? 0;
        const repeat_rate = total_cust > 0 ? repeat_cust / total_cust : 0;
        return ok(res, 200, {
            new_customers: new_customers_query.rows[0]?.count ?? 0,
            repeat_customer_rate: repeat_rate,
            customer_lifetime_value: Number(clv_query.rows[0]?.clv ?? 0),
            top_customers: top_customers.rows.map((r) => ({
                user_id: r.user_id,
                customer_name: `${r.first_name} ${r.last_name}`,
                total_orders: r.orders,
                total_spend: Number(r.spend),
            })),
            loyalty_engagement: {
                active_participants: loyalty_engagement.rows[0]?.active_participants ?? 0,
                points_issued: loyalty_engagement.rows[0]?.points_issued ?? 0,
                points_redeemed: loyalty_engagement.rows[0]?.points_redeemed ?? 0,
            },
        });
    }
    catch (error) {
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
app.get('/api/admin/analytics/time-analysis', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const q_schema = z.object({ date_from: z.string().optional(), date_to: z.string().optional() });
        const q = parse_query(q_schema, req.query);
        const where = ["payment_status = 'paid'"];
        const params = [];
        if (q.date_from) {
            params.push(q.date_from);
            where.push(`created_at >= $${params.length}`);
        }
        if (q.date_to) {
            params.push(q.date_to);
            where.push(`created_at <= $${params.length}`);
        }
        // Peak order hours
        const peak_hours = await pool.query(`SELECT CAST(DATE_PART('hour', created_at::timestamp) AS INTEGER) as hour, COUNT(*)::int as order_count
       FROM orders
       WHERE ${where.join(' AND ')}
       GROUP BY hour
       ORDER BY order_count DESC`, params);
        // Average fulfillment time (in minutes)
        const fulfillment_time = await pool.query(`SELECT COALESCE(AVG(DATE_PART('epoch', (completed_at::timestamp - created_at::timestamp)) / 60), 0)::int as avg_minutes
       FROM orders
       WHERE ${where.join(' AND ')} AND completed_at IS NOT NULL`, params);
        // Orders by day of week
        const orders_by_day = await pool.query(`SELECT TO_CHAR(created_at::timestamp, 'Day') as day, COUNT(*)::int as order_count
       FROM orders
       WHERE ${where.join(' AND ')}
       GROUP BY day, DATE_PART('dow', created_at::timestamp)
       ORDER BY DATE_PART('dow', created_at::timestamp)`, params);
        return ok(res, 200, {
            peak_order_hours: peak_hours.rows.map((r) => ({ hour: r.hour, order_count: r.order_count })),
            average_fulfillment_time: fulfillment_time.rows[0]?.avg_minutes ?? 0,
            orders_by_day_of_week: orders_by_day.rows.map((r) => ({ day: r.day.trim(), order_count: r.order_count })),
        });
    }
    catch (error) {
        if (error instanceof z.ZodError)
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
app.get('/api/admin/analytics/coupons', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const rows = await pool.query(`SELECT dc.code, dc.discount_type, dc.discount_value, dc.total_used_count,
              COALESCE(SUM(du.discount_amount_applied),0) as total_discount_given
       FROM discount_codes dc
       LEFT JOIN discount_usage du ON du.code_id = dc.code_id
       GROUP BY dc.code_id
       ORDER BY total_discount_given DESC`);
        return ok(res, 200, {
            coupons: rows.rows.map((r) => ({
                code: r.code,
                discount_type: r.discount_type,
                discount_value: Number(r.discount_value),
                total_used_count: Number(r.total_used_count),
                total_discount_given: Number(r.total_discount_given),
            })),
        });
    }
    catch (error) {
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
// Admin settings
app.get('/api/admin/settings', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const rows = await pool.query('SELECT * FROM system_settings ORDER BY setting_key ASC');
        const settingsMap = new Map();
        rows.rows.forEach((r) => {
            const setting = systemSettingSchema.parse({
                ...r,
                setting_value: r.setting_value ?? null,
                updated_by_user_id: r.updated_by_user_id ?? null,
            });
            settingsMap.set(setting.setting_key, setting.setting_value);
        });
        // Structure the settings for the frontend
        const structuredSettings = {
            business_info: {
                name: settingsMap.get('store_name') || '',
                phone: settingsMap.get('store_phone') || '',
                email: settingsMap.get('store_email') || '',
                address: settingsMap.get('store_address') || '',
                logo_url: settingsMap.get('store_logo_url') || null,
            },
            operating_hours: {
                weekly_schedule: settingsMap.get('store_hours') || {
                    monday: { open: '11:00', close: '20:00', closed: false },
                    tuesday: { open: '11:00', close: '20:00', closed: false },
                    wednesday: { open: '11:00', close: '20:00', closed: false },
                    thursday: { open: '11:00', close: '20:00', closed: false },
                    friday: { open: '11:00', close: '20:00', closed: false },
                    saturday: { open: '12:00', close: '22:00', closed: false },
                    sunday: { open: '12:00', close: '20:00', closed: false },
                },
                special_hours: settingsMap.get('special_hours') || [],
            },
            tax_settings: {
                vat_rate: settingsMap.get('vat_rate') || 23,
                tax_registration_number: settingsMap.get('tax_registration_number') || null,
                apply_tax_to_all: settingsMap.get('apply_tax_to_all') !== undefined ? settingsMap.get('apply_tax_to_all') : true,
            },
            notification_settings: {
                order_notifications_enabled: settingsMap.get('order_notifications_enabled') !== undefined ? settingsMap.get('order_notifications_enabled') : true,
                notification_emails: settingsMap.get('notification_emails') || [],
                catering_notifications_enabled: settingsMap.get('catering_notifications_enabled') !== undefined ? settingsMap.get('catering_notifications_enabled') : true,
                customer_email_notifications: settingsMap.get('customer_email_notifications') !== undefined ? settingsMap.get('customer_email_notifications') : true,
                customer_sms_notifications: settingsMap.get('customer_sms_notifications') !== undefined ? settingsMap.get('customer_sms_notifications') : false,
            },
            loyalty_settings: {
                earning_rate: settingsMap.get('loyalty_earning_rate') || 1,
                points_expiry_enabled: settingsMap.get('loyalty_points_expiry_enabled') !== undefined ? settingsMap.get('loyalty_points_expiry_enabled') : false,
                points_expiry_months: settingsMap.get('loyalty_points_expiry_months') || 12,
                referral_enabled: settingsMap.get('loyalty_referral_enabled') !== undefined ? settingsMap.get('loyalty_referral_enabled') : true,
                referrer_reward_points: settingsMap.get('loyalty_referrer_reward_points') || 100,
                referee_reward_points: settingsMap.get('loyalty_referee_reward_points') || 50,
                gamification_enabled: settingsMap.get('loyalty_gamification_enabled') !== undefined ? settingsMap.get('loyalty_gamification_enabled') : true,
            },
            payment_settings: {
                sumup_api_key: settingsMap.get('sumup_api_key') || null,
                sumup_merchant_id: settingsMap.get('sumup_merchant_id') || null,
                test_mode_enabled: settingsMap.get('payment_test_mode_enabled') !== undefined ? settingsMap.get('payment_test_mode_enabled') : true,
                saved_methods_enabled: settingsMap.get('payment_saved_methods_enabled') !== undefined ? settingsMap.get('payment_saved_methods_enabled') : true,
            },
            email_settings: {
                email_provider: settingsMap.get('email_provider') || 'sendgrid',
                smtp_host: settingsMap.get('email_smtp_host') || null,
                smtp_port: settingsMap.get('email_smtp_port') || null,
                api_key: settingsMap.get('email_api_key') || null,
                sender_email: settingsMap.get('email_sender_email') || '',
                sender_name: settingsMap.get('email_sender_name') || '',
            },
        };
        return ok(res, 200, structuredSettings);
    }
    catch (error) {
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
app.put('/api/admin/settings', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const schema = z.object({ settings: z.array(createSystemSettingInputSchema) });
        const { settings } = schema.parse(req.body);
        await with_client(async (client) => {
            await client.query('BEGIN');
            for (const s of settings) {
                await upsert_setting(client, {
                    setting_key: s.setting_key,
                    setting_value: s.setting_value,
                    setting_type: s.setting_type,
                    updated_by_user_id: req.user.user_id,
                });
            }
            await client.query('COMMIT');
        });
        return ok(res, 200, { message: 'Settings saved successfully' });
    }
    catch (error) {
        if (error instanceof z.ZodError)
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
// Update business info settings
app.put('/api/admin/settings/business', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const schema = z.object({
            name: z.string().min(1).optional(),
            phone: z.string().min(1).optional(),
            email: z.string().email().optional(),
            address: z.union([z.string(), z.object({
                    line1: z.string(),
                    line2: z.string().nullable().optional(),
                    city: z.string(),
                    postal_code: z.string(),
                })]).optional(),
            logo_url: z.preprocess((val) => (val === '' ? null : val), z.string().url().nullable().optional()),
        });
        const data = schema.parse(req.body);
        await with_client(async (client) => {
            await client.query('BEGIN');
            if (data.name !== undefined) {
                await upsert_setting(client, {
                    setting_key: 'store_name',
                    setting_value: data.name,
                    setting_type: 'string',
                    updated_by_user_id: req.user.user_id,
                });
            }
            if (data.phone !== undefined) {
                await upsert_setting(client, {
                    setting_key: 'store_phone',
                    setting_value: data.phone,
                    setting_type: 'string',
                    updated_by_user_id: req.user.user_id,
                });
            }
            if (data.email !== undefined) {
                await upsert_setting(client, {
                    setting_key: 'store_email',
                    setting_value: data.email,
                    setting_type: 'string',
                    updated_by_user_id: req.user.user_id,
                });
            }
            if (data.address !== undefined) {
                await upsert_setting(client, {
                    setting_key: 'store_address',
                    setting_value: data.address,
                    setting_type: 'json',
                    updated_by_user_id: req.user.user_id,
                });
            }
            if (data.logo_url !== undefined) {
                await upsert_setting(client, {
                    setting_key: 'store_logo_url',
                    setting_value: data.logo_url,
                    setting_type: 'string',
                    updated_by_user_id: req.user.user_id,
                });
            }
            await client.query('COMMIT');
            await log_activity({
                user_id: req.user.user_id,
                action_type: 'update',
                entity_type: 'settings',
                entity_id: 'business_info',
                description: 'Updated business information settings',
                changes: data,
                ip_address: req.ip,
                user_agent: req.headers['user-agent'],
            });
        });
        return ok(res, 200, { message: 'Business information updated successfully' });
    }
    catch (error) {
        if (error instanceof z.ZodError)
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
// Update operating hours settings
app.put('/api/admin/settings/operating-hours', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const schema = z.object({
            weekly_schedule: z.object({
                monday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
                tuesday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
                wednesday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
                thursday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
                friday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
                saturday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
                sunday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
            }).optional(),
            special_hours: z.array(z.object({
                date: z.string(),
                status: z.enum(['closed', 'custom']),
                custom_hours: z.object({
                    open: z.string(),
                    close: z.string(),
                }).nullable(),
            })).optional(),
        });
        const data = schema.parse(req.body);
        await with_client(async (client) => {
            await client.query('BEGIN');
            if (data.weekly_schedule !== undefined) {
                await upsert_setting(client, {
                    setting_key: 'store_hours',
                    setting_value: data.weekly_schedule,
                    setting_type: 'json',
                    updated_by_user_id: req.user.user_id,
                });
            }
            if (data.special_hours !== undefined) {
                await upsert_setting(client, {
                    setting_key: 'special_hours',
                    setting_value: data.special_hours,
                    setting_type: 'json',
                    updated_by_user_id: req.user.user_id,
                });
            }
            await client.query('COMMIT');
            await log_activity({
                user_id: req.user.user_id,
                action_type: 'update',
                entity_type: 'settings',
                entity_id: 'operating_hours',
                description: 'Updated operating hours settings',
                changes: data,
                ip_address: req.ip,
                user_agent: req.headers['user-agent'],
            });
        });
        return ok(res, 200, { message: 'Operating hours updated successfully' });
    }
    catch (error) {
        if (error instanceof z.ZodError)
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
// Update loyalty settings
app.put('/api/admin/settings/loyalty', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const schema = z.object({
            earning_rate: z.number().nonnegative().optional(),
            points_expiry_enabled: z.boolean().optional(),
            points_expiry_months: z.number().int().positive().optional(),
            referral_enabled: z.boolean().optional(),
            referrer_reward_points: z.number().int().nonnegative().optional(),
            referee_reward_points: z.number().int().nonnegative().optional(),
            gamification_enabled: z.boolean().optional(),
        });
        const data = schema.parse(req.body);
        await with_client(async (client) => {
            await client.query('BEGIN');
            if (data.earning_rate !== undefined) {
                await upsert_setting(client, {
                    setting_key: 'loyalty_earning_rate',
                    setting_value: data.earning_rate,
                    setting_type: 'number',
                    updated_by_user_id: req.user.user_id,
                });
            }
            if (data.points_expiry_enabled !== undefined) {
                await upsert_setting(client, {
                    setting_key: 'loyalty_points_expiry_enabled',
                    setting_value: data.points_expiry_enabled,
                    setting_type: 'boolean',
                    updated_by_user_id: req.user.user_id,
                });
            }
            if (data.points_expiry_months !== undefined) {
                await upsert_setting(client, {
                    setting_key: 'loyalty_points_expiry_months',
                    setting_value: data.points_expiry_months,
                    setting_type: 'number',
                    updated_by_user_id: req.user.user_id,
                });
            }
            if (data.referral_enabled !== undefined) {
                await upsert_setting(client, {
                    setting_key: 'loyalty_referral_enabled',
                    setting_value: data.referral_enabled,
                    setting_type: 'boolean',
                    updated_by_user_id: req.user.user_id,
                });
            }
            if (data.referrer_reward_points !== undefined) {
                await upsert_setting(client, {
                    setting_key: 'loyalty_referrer_reward_points',
                    setting_value: data.referrer_reward_points,
                    setting_type: 'number',
                    updated_by_user_id: req.user.user_id,
                });
            }
            if (data.referee_reward_points !== undefined) {
                await upsert_setting(client, {
                    setting_key: 'loyalty_referee_reward_points',
                    setting_value: data.referee_reward_points,
                    setting_type: 'number',
                    updated_by_user_id: req.user.user_id,
                });
            }
            if (data.gamification_enabled !== undefined) {
                await upsert_setting(client, {
                    setting_key: 'loyalty_gamification_enabled',
                    setting_value: data.gamification_enabled,
                    setting_type: 'boolean',
                    updated_by_user_id: req.user.user_id,
                });
            }
            await client.query('COMMIT');
            await log_activity({
                user_id: req.user.user_id,
                action_type: 'update',
                entity_type: 'settings',
                entity_id: 'loyalty_settings',
                description: 'Updated loyalty program settings',
                changes: data,
                ip_address: req.ip,
                user_agent: req.headers['user-agent'],
            });
        });
        return ok(res, 200, { message: 'Loyalty settings updated successfully' });
    }
    catch (error) {
        if (error instanceof z.ZodError)
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
// Get activity logs (admin only)
app.get('/api/admin/activity-logs', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const schema = z.object({
            limit: z.coerce.number().int().positive().default(50),
            offset: z.coerce.number().int().nonnegative().default(0),
            user_id: z.string().optional(),
            action_type: z.string().optional(),
            entity_type: z.string().optional(),
        });
        const q = schema.parse(req.query);
        let query = 'SELECT al.*, u.first_name, u.last_name, u.email FROM activity_logs al LEFT JOIN users u ON al.user_id = u.user_id WHERE 1=1';
        const params = [];
        let paramCount = 0;
        if (q.user_id) {
            paramCount++;
            query += ` AND al.user_id = $${paramCount}`;
            params.push(q.user_id);
        }
        if (q.action_type) {
            paramCount++;
            query += ` AND al.action_type = $${paramCount}`;
            params.push(q.action_type);
        }
        if (q.entity_type) {
            paramCount++;
            query += ` AND al.entity_type = $${paramCount}`;
            params.push(q.entity_type);
        }
        query += ` ORDER BY al.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        params.push(q.limit, q.offset);
        const countQuery = 'SELECT COUNT(*)::int as total FROM activity_logs WHERE 1=1' +
            (q.user_id ? ` AND user_id = '${q.user_id}'` : '') +
            (q.action_type ? ` AND action_type = '${q.action_type}'` : '') +
            (q.entity_type ? ` AND entity_type = '${q.entity_type}'` : '');
        const [rows, countRows] = await Promise.all([
            pool.query(query, params),
            pool.query(countQuery)
        ]);
        const logs = rows.rows.map(r => ({
            log_id: r.log_id,
            user_id: r.user_id,
            user_name: r.first_name && r.last_name ? `${r.first_name} ${r.last_name}` : r.email || 'Unknown User',
            action_type: r.action_type,
            entity_type: r.entity_type,
            entity_id: r.entity_id,
            description: r.description,
            changes: r.changes,
            ip_address: r.ip_address,
            user_agent: r.user_agent,
            created_at: r.created_at,
        }));
        return ok(res, 200, {
            logs,
            total: countRows.rows[0]?.total || 0,
            limit: q.limit,
            offset: q.offset,
        });
    }
    catch (error) {
        if (error instanceof z.ZodError)
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
// Admin upload image
const upload_image = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, storage_uploads_dir),
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname || '').slice(0, 10);
            cb(null, `${Date.now()}_${nanoid(10)}${ext}`);
        },
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
});
app.post('/api/admin/upload/image', authenticate_token, require_role(['admin']), upload_image.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json(createErrorResponse('No file uploaded', null, 'NO_FILE', req.request_id));
        }
        const url = `/storage/uploads/${encodeURIComponent(req.file.filename)}`;
        return ok(res, 201, { url });
    }
    catch (error) {
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
// ============================================================================
// MENU BUILDER API ENDPOINTS
// ============================================================================
// Schema for builder cart add input
const builder_cart_add_input_schema = z.object({
    item_id: z.string(), // The original sub/wrap item being ordered
    quantity: z.number().int().positive().default(1),
    builder_selections: z.object({
        base: z.object({
            item_id: z.string(),
            name: z.string(),
            price: z.number()
        }),
        protein: z.object({
            item_id: z.string(),
            name: z.string(),
            price: z.number()
        }),
        toppings: z.array(z.object({
            item_id: z.string(),
            name: z.string(),
            price: z.number()
        })).default([]),
        sauce: z.object({
            item_id: z.string(),
            name: z.string(),
            price: z.number()
        })
    })
});
// GET /api/menu/builder-config - Public endpoint to fetch builder configuration
app.get('/api/menu/builder-config', async (req, res) => {
    try {
        const config_res = await pool.query('SELECT * FROM builder_config LIMIT 1');
        if (config_res.rows.length === 0) {
            return ok(res, 200, { config: null, enabled: false });
        }
        const config = config_res.rows[0];
        return ok(res, 200, {
            config: {
                config_id: config.config_id,
                enabled: config.enabled,
                builder_category_ids: config.builder_category_ids || [],
                include_base_item_price: config.include_base_item_price,
            }
        });
    }
    catch (error) {
        console.error('Error fetching builder config:', error);
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
// GET /api/menu/builder-steps - Public endpoint to fetch builder steps with items
app.get('/api/menu/builder-steps', async (req, res) => {
    try {
        // Get builder config first
        const config_res = await pool.query('SELECT * FROM builder_config LIMIT 1');
        if (config_res.rows.length === 0 || !config_res.rows[0].enabled) {
            return ok(res, 200, { steps: [], enabled: false });
        }
        const config_id = config_res.rows[0].config_id;
        // Get steps
        const steps_res = await pool.query(`SELECT * FROM builder_steps WHERE config_id = $1 ORDER BY sort_order ASC`, [config_id]);
        if (steps_res.rows.length === 0) {
            return ok(res, 200, { steps: [], enabled: true });
        }
        const step_ids = steps_res.rows.map(s => s.step_id);
        // Get step items with menu item details
        const items_res = await pool.query(`SELECT bsi.*, mi.name, mi.description, mi.price as original_price, mi.image_url, mi.is_active as item_is_active
       FROM builder_step_items bsi
       JOIN menu_items mi ON bsi.item_id = mi.item_id
       WHERE bsi.step_id = ANY($1) AND bsi.is_active = true AND mi.is_active = true
       ORDER BY bsi.sort_order ASC`, [step_ids]);
        // Group items by step
        const items_by_step = new Map();
        for (const item of items_res.rows) {
            if (!items_by_step.has(item.step_id)) {
                items_by_step.set(item.step_id, []);
            }
            items_by_step.get(item.step_id).push({
                step_item_id: item.step_item_id,
                item_id: item.item_id,
                name: item.name,
                description: item.description ?? null,
                original_price: Number(item.original_price),
                override_price: item.override_price !== null ? Number(item.override_price) : null,
                effective_price: item.override_price !== null ? Number(item.override_price) : Number(item.original_price),
                image_url: item.image_url ?? null,
                sort_order: item.sort_order,
                is_active: item.is_active,
            });
        }
        // Build steps response
        const steps = steps_res.rows.map(step => ({
            step_id: step.step_id,
            step_name: step.step_name,
            step_key: step.step_key,
            step_type: step.step_type,
            is_required: step.is_required,
            min_selections: step.min_selections,
            max_selections: step.max_selections,
            sort_order: step.sort_order,
            items: items_by_step.get(step.step_id) || [],
        }));
        return ok(res, 200, { steps, enabled: true });
    }
    catch (error) {
        console.error('Error fetching builder steps:', error);
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
// POST /api/cart/builder - Add a builder item to cart
app.post('/api/cart/builder', authenticate_token_optional, async (req, res) => {
    try {
        const body = builder_cart_add_input_schema.parse(req.body);
        // Get builder config
        const config_res = await pool.query('SELECT * FROM builder_config LIMIT 1');
        if (config_res.rows.length === 0 || !config_res.rows[0].enabled) {
            return res.status(400).json(createErrorResponse('Builder is not enabled', null, 'BUILDER_DISABLED', req.request_id));
        }
        const config = config_res.rows[0];
        // Validate the original item exists and is in a builder category
        const item_res = await pool.query('SELECT item_id, name, price, category_id, is_active FROM menu_items WHERE item_id = $1', [body.item_id]);
        if (item_res.rows.length === 0 || !item_res.rows[0].is_active) {
            return res.status(400).json(createErrorResponse('Item not found or inactive', null, 'ITEM_NOT_FOUND', req.request_id));
        }
        const original_item = item_res.rows[0];
        const builder_category_ids = config.builder_category_ids || [];
        if (!builder_category_ids.includes(original_item.category_id)) {
            return res.status(400).json(createErrorResponse('Item is not a builder item', null, 'NOT_BUILDER_ITEM', req.request_id));
        }
        // Validate required selections exist
        const { builder_selections } = body;
        if (!builder_selections.base || !builder_selections.base.item_id) {
            return res.status(400).json(createErrorResponse('Base selection is required', null, 'BASE_REQUIRED', req.request_id));
        }
        if (!builder_selections.protein || !builder_selections.protein.item_id) {
            return res.status(400).json(createErrorResponse('Protein selection is required', null, 'PROTEIN_REQUIRED', req.request_id));
        }
        if (!builder_selections.sauce || !builder_selections.sauce.item_id) {
            return res.status(400).json(createErrorResponse('Sauce selection is required', null, 'SAUCE_REQUIRED', req.request_id));
        }
        // Calculate total price
        let total_price = 0;
        // Optionally include base item price
        if (config.include_base_item_price) {
            total_price += Number(original_item.price);
        }
        // Add selection prices
        total_price += Number(builder_selections.base.price);
        total_price += Number(builder_selections.protein.price);
        total_price += Number(builder_selections.sauce.price);
        for (const topping of builder_selections.toppings) {
            total_price += Number(topping.price);
        }
        // Round to 2 decimal places
        total_price = Number(total_price.toFixed(2));
        // Create cart item with builder metadata
        const cart_id = get_cart_identifier(req);
        const cart = read_cart_sync(cart_id);
        // Prevent cart from becoming too large
        if (cart.items.length >= 50) {
            return res.status(400).json(createErrorResponse('Cart is full. Please remove some items before adding more.', null, 'CART_FULL', req.request_id));
        }
        const cart_item_id = gen_id('cart');
        // Create display name
        const display_name = `${original_item.name} - ${builder_selections.base.name} + ${builder_selections.protein.name}`;
        // Store builder item in cart
        cart.items.push({
            cart_item_id,
            item_id: body.item_id,
            quantity: body.quantity,
            is_builder_item: true,
            builder_display_name: display_name,
            builder_selections: builder_selections,
            builder_unit_price: total_price,
            selected_customizations: null, // Not using standard customizations
            added_at: now_iso(),
        });
        write_cart_sync(cart_id, cart);
        // Compute totals
        const totals = await compute_cart_totals({
            user_id: req.user?.user_id || cart_id,
            cart,
            order_type: 'collection',
            delivery_address_id: null,
            discount_code: cart.discount_code,
        });
        return ok(res, 200, {
            items: totals.items,
            subtotal: totals.subtotal,
            discount_code: totals.discount_code,
            discount_amount: totals.discount_amount,
            delivery_fee: totals.delivery_fee,
            tax_amount: totals.tax_amount,
            total: totals.total,
            validation_errors: totals.validation_errors,
            added_item: {
                cart_item_id,
                display_name,
                unit_price: total_price,
                quantity: body.quantity,
            }
        });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        }
        console.error('Error adding builder item to cart:', error);
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
// ============================================================================
// ADMIN BUILDER CONFIG ENDPOINTS
// ============================================================================
// GET /api/admin/menu/builder-config - Admin endpoint to fetch builder configuration
app.get('/api/admin/menu/builder-config', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const config_res = await pool.query('SELECT * FROM builder_config LIMIT 1');
        if (config_res.rows.length === 0) {
            // Return null config - admin can create one
            return ok(res, 200, { config: null });
        }
        const config = config_res.rows[0];
        // Count steps
        const steps_count_res = await pool.query('SELECT COUNT(*)::int as count FROM builder_steps WHERE config_id = $1', [config.config_id]);
        return ok(res, 200, {
            config: {
                config_id: config.config_id,
                enabled: config.enabled,
                builder_category_ids: config.builder_category_ids || [],
                include_base_item_price: config.include_base_item_price,
                created_at: config.created_at,
                updated_at: config.updated_at,
                steps_count: steps_count_res.rows[0]?.count ?? 0,
            }
        });
    }
    catch (error) {
        console.error('Error fetching admin builder config:', error);
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
// PUT /api/admin/menu/builder-config - Admin endpoint to update builder configuration
app.put('/api/admin/menu/builder-config', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const schema = z.object({
            enabled: z.boolean().optional(),
            builder_category_ids: z.array(z.string()).optional(),
            include_base_item_price: z.boolean().optional(),
        });
        const input = schema.parse(req.body);
        const ts = now_iso();
        // Check if config exists
        const existing = await pool.query('SELECT config_id FROM builder_config LIMIT 1');
        if (existing.rows.length === 0) {
            // Create new config
            const config_id = gen_id('builder_config');
            await pool.query(`INSERT INTO builder_config (config_id, enabled, builder_category_ids, include_base_item_price, created_at, updated_at)
         VALUES ($1, $2, $3::jsonb, $4, $5, $6)`, [
                config_id,
                input.enabled ?? false,
                JSON.stringify(input.builder_category_ids ?? []),
                input.include_base_item_price ?? false,
                ts,
                ts
            ]);
            return ok(res, 201, { message: 'Builder configuration created', config_id });
        }
        // Update existing config
        const config_id = existing.rows[0].config_id;
        const updates = [];
        const params = [];
        if (input.enabled !== undefined) {
            params.push(input.enabled);
            updates.push(`enabled = $${params.length}`);
        }
        if (input.builder_category_ids !== undefined) {
            params.push(JSON.stringify(input.builder_category_ids));
            updates.push(`builder_category_ids = $${params.length}::jsonb`);
        }
        if (input.include_base_item_price !== undefined) {
            params.push(input.include_base_item_price);
            updates.push(`include_base_item_price = $${params.length}`);
        }
        params.push(ts);
        updates.push(`updated_at = $${params.length}`);
        params.push(config_id);
        await pool.query(`UPDATE builder_config SET ${updates.join(', ')} WHERE config_id = $${params.length}`, params);
        // Log activity
        await log_activity({
            user_id: req.user.user_id,
            action_type: 'update',
            entity_type: 'builder_config',
            entity_id: config_id,
            description: 'Updated builder configuration',
            changes: input,
            ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress || null,
            user_agent: req.headers['user-agent'] || null,
        });
        return ok(res, 200, { message: 'Builder configuration updated' });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        }
        console.error('Error updating builder config:', error);
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
// GET /api/admin/menu/builder-steps - Admin endpoint to fetch builder steps
app.get('/api/admin/menu/builder-steps', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        // Get config
        const config_res = await pool.query('SELECT config_id FROM builder_config LIMIT 1');
        if (config_res.rows.length === 0) {
            return ok(res, 200, { steps: [] });
        }
        const config_id = config_res.rows[0].config_id;
        // Get steps
        const steps_res = await pool.query(`SELECT * FROM builder_steps WHERE config_id = $1 ORDER BY sort_order ASC`, [config_id]);
        if (steps_res.rows.length === 0) {
            return ok(res, 200, { steps: [] });
        }
        const step_ids = steps_res.rows.map(s => s.step_id);
        // Get step items with menu item details
        const items_res = await pool.query(`SELECT bsi.*, mi.name, mi.description, mi.price as original_price, mi.image_url, mi.is_active as item_is_active
       FROM builder_step_items bsi
       JOIN menu_items mi ON bsi.item_id = mi.item_id
       WHERE bsi.step_id = ANY($1)
       ORDER BY bsi.sort_order ASC`, [step_ids]);
        // Group items by step
        const items_by_step = new Map();
        for (const item of items_res.rows) {
            if (!items_by_step.has(item.step_id)) {
                items_by_step.set(item.step_id, []);
            }
            items_by_step.get(item.step_id).push({
                step_item_id: item.step_item_id,
                item_id: item.item_id,
                name: item.name,
                description: item.description ?? null,
                original_price: Number(item.original_price),
                override_price: item.override_price !== null ? Number(item.override_price) : null,
                effective_price: item.override_price !== null ? Number(item.override_price) : Number(item.original_price),
                image_url: item.image_url ?? null,
                sort_order: item.sort_order,
                is_active: item.is_active,
                item_is_active: item.item_is_active,
            });
        }
        // Build steps response
        const steps = steps_res.rows.map(step => ({
            step_id: step.step_id,
            config_id: step.config_id,
            step_name: step.step_name,
            step_key: step.step_key,
            step_type: step.step_type,
            is_required: step.is_required,
            min_selections: step.min_selections,
            max_selections: step.max_selections,
            sort_order: step.sort_order,
            created_at: step.created_at,
            items: items_by_step.get(step.step_id) || [],
        }));
        return ok(res, 200, { steps });
    }
    catch (error) {
        console.error('Error fetching builder steps:', error);
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
// POST /api/admin/menu/builder-steps - Admin endpoint to create/update a builder step
app.post('/api/admin/menu/builder-steps', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const schema = z.object({
            step_id: z.string().optional(),
            step_name: z.string().min(1),
            step_key: z.string().min(1),
            step_type: z.enum(['single', 'multiple']),
            is_required: z.boolean(),
            min_selections: z.number().int().nonnegative(),
            max_selections: z.number().int().positive().nullable(),
            sort_order: z.number().int().nonnegative(),
        });
        const input = schema.parse(req.body);
        const ts = now_iso();
        // Get or create config
        let config_res = await pool.query('SELECT config_id FROM builder_config LIMIT 1');
        if (config_res.rows.length === 0) {
            // Create config first
            const config_id = gen_id('builder_config');
            await pool.query(`INSERT INTO builder_config (config_id, enabled, builder_category_ids, include_base_item_price, created_at, updated_at)
         VALUES ($1, false, '[]'::jsonb, false, $2, $3)`, [config_id, ts, ts]);
            config_res = { rows: [{ config_id }] };
        }
        const config_id = config_res.rows[0].config_id;
        if (input.step_id) {
            // Update existing step
            await pool.query(`UPDATE builder_steps SET
           step_name = $1,
           step_key = $2,
           step_type = $3,
           is_required = $4,
           min_selections = $5,
           max_selections = $6,
           sort_order = $7
         WHERE step_id = $8`, [
                input.step_name,
                input.step_key,
                input.step_type,
                input.is_required,
                input.min_selections,
                input.max_selections,
                input.sort_order,
                input.step_id
            ]);
            return ok(res, 200, { message: 'Step updated', step_id: input.step_id });
        }
        // Create new step
        const step_id = gen_id('step');
        await pool.query(`INSERT INTO builder_steps (step_id, config_id, step_name, step_key, step_type, is_required, min_selections, max_selections, sort_order, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, [
            step_id,
            config_id,
            input.step_name,
            input.step_key,
            input.step_type,
            input.is_required,
            input.min_selections,
            input.max_selections,
            input.sort_order,
            ts
        ]);
        return ok(res, 201, { message: 'Step created', step_id });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        }
        console.error('Error creating/updating builder step:', error);
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
// DELETE /api/admin/menu/builder-steps/:step_id - Admin endpoint to delete a builder step
app.delete('/api/admin/menu/builder-steps/:step_id', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const { step_id } = req.params;
        // Delete step (cascade will handle step items)
        const result = await pool.query('DELETE FROM builder_steps WHERE step_id = $1 RETURNING step_id', [step_id]);
        if (result.rows.length === 0) {
            return res.status(404).json(createErrorResponse('Step not found', null, 'NOT_FOUND', req.request_id));
        }
        return ok(res, 200, { message: 'Step deleted' });
    }
    catch (error) {
        console.error('Error deleting builder step:', error);
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
// POST /api/admin/menu/builder-step-items - Admin endpoint to add item to step
app.post('/api/admin/menu/builder-step-items', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const schema = z.object({
            step_id: z.string(),
            item_id: z.string(),
            override_price: z.number().nullable().optional(),
            sort_order: z.number().int().nonnegative(),
            is_active: z.boolean().default(true),
        });
        const input = schema.parse(req.body);
        const ts = now_iso();
        // Verify step exists
        const step_res = await pool.query('SELECT step_id FROM builder_steps WHERE step_id = $1', [input.step_id]);
        if (step_res.rows.length === 0) {
            return res.status(404).json(createErrorResponse('Step not found', null, 'STEP_NOT_FOUND', req.request_id));
        }
        // Verify menu item exists
        const item_res = await pool.query('SELECT item_id FROM menu_items WHERE item_id = $1', [input.item_id]);
        if (item_res.rows.length === 0) {
            return res.status(404).json(createErrorResponse('Menu item not found', null, 'ITEM_NOT_FOUND', req.request_id));
        }
        // Check if already exists
        const existing = await pool.query('SELECT step_item_id FROM builder_step_items WHERE step_id = $1 AND item_id = $2', [input.step_id, input.item_id]);
        if (existing.rows.length > 0) {
            // Update existing
            await pool.query(`UPDATE builder_step_items SET override_price = $1, sort_order = $2, is_active = $3 WHERE step_item_id = $4`, [input.override_price ?? null, input.sort_order, input.is_active, existing.rows[0].step_item_id]);
            return ok(res, 200, { message: 'Step item updated', step_item_id: existing.rows[0].step_item_id });
        }
        // Create new
        const step_item_id = gen_id('bsi');
        await pool.query(`INSERT INTO builder_step_items (step_item_id, step_id, item_id, override_price, sort_order, is_active, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`, [step_item_id, input.step_id, input.item_id, input.override_price ?? null, input.sort_order, input.is_active, ts]);
        return ok(res, 201, { message: 'Step item created', step_item_id });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR', req.request_id, { issues: error.issues }));
        }
        console.error('Error creating builder step item:', error);
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
// DELETE /api/admin/menu/builder-step-items/:step_item_id - Admin endpoint to remove item from step
app.delete('/api/admin/menu/builder-step-items/:step_item_id', authenticate_token, require_role(['admin']), async (req, res) => {
    try {
        const { step_item_id } = req.params;
        const result = await pool.query('DELETE FROM builder_step_items WHERE step_item_id = $1 RETURNING step_item_id', [step_item_id]);
        if (result.rows.length === 0) {
            return res.status(404).json(createErrorResponse('Step item not found', null, 'NOT_FOUND', req.request_id));
        }
        return ok(res, 200, { message: 'Step item deleted' });
    }
    catch (error) {
        console.error('Error deleting builder step item:', error);
        return res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR', req.request_id));
    }
});
/**
 * Global error handler
 */
app.use((err, req, res, next) => {
    if (!err)
        return next();
    console.error('Unhandled error:', err);
    return res.status(500).json(createErrorResponse('Internal server error', err, 'INTERNAL_SERVER_ERROR', req.request_id));
});
// Catch-all route for SPA routing (exclude API paths)
app.get('*', (req, res) => {
    // If the request is for an API endpoint but didn't match any route, return 404 JSON
    if (req.path.startsWith('/api/')) {
        return res.status(404).json(createErrorResponse('API endpoint not found', null, 'NOT_FOUND', req.request_id));
    }
    // Otherwise, serve the SPA
    res.sendFile(path.join(publicDir, 'index.html'));
});
export { app, pool };
server.listen(Number(PORT) || 3000, '0.0.0.0', () => {
    console.log(`Server running on port ${Number(PORT) || 3000} and listening on 0.0.0.0`);
});
//# sourceMappingURL=server.js.map