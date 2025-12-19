import { z } from 'zod';
// ============================================
// USERS SCHEMAS
// ============================================
export const userSchema = z.object({
    user_id: z.string(),
    email: z.string(),
    phone: z.string(),
    password_hash: z.string(),
    first_name: z.string(),
    last_name: z.string(),
    role: z.string(),
    profile_photo_url: z.string().nullable(),
    email_verified: z.boolean(),
    status: z.string(),
    created_at: z.string(),
    last_login_at: z.string().nullable(),
    marketing_opt_in: z.boolean(),
    order_notifications_email: z.boolean(),
    order_notifications_sms: z.boolean(),
    marketing_emails: z.boolean(),
    marketing_sms: z.boolean(),
    newsletter_subscribed: z.boolean(),
    dietary_preferences: z.array(z.string()).nullable(),
    first_order_discount_code: z.string().nullable(),
    first_order_discount_used: z.boolean(),
    referral_code: z.string().nullable(),
    referred_by_user_id: z.string().nullable(),
    staff_permissions: z.record(z.boolean()).nullable(),
});
export const createUserInputSchema = z.object({
    email: z.string().email().max(255),
    phone: z.string().min(10).max(20),
    password: z.string().min(8).max(100),
    first_name: z.string().min(1).max(100),
    last_name: z.string().min(1).max(100),
    role: z.enum(['customer', 'staff', 'admin']).default('customer'),
    profile_photo_url: z.string().url().nullable().optional(),
    marketing_opt_in: z.boolean().default(false),
    order_notifications_email: z.boolean().default(true),
    order_notifications_sms: z.boolean().default(false),
    marketing_emails: z.boolean().default(false),
    marketing_sms: z.boolean().default(false),
    newsletter_subscribed: z.boolean().default(false),
    dietary_preferences: z.array(z.string()).nullable().optional(),
    referred_by_user_id: z.string().nullable().optional(),
});
export const updateUserInputSchema = z.object({
    user_id: z.string(),
    email: z.string().email().max(255).optional(),
    phone: z.string().min(10).max(20).optional(),
    first_name: z.string().min(1).max(100).optional(),
    last_name: z.string().min(1).max(100).optional(),
    profile_photo_url: z.string().url().nullable().optional(),
    marketing_opt_in: z.boolean().optional(),
    order_notifications_email: z.boolean().optional(),
    order_notifications_sms: z.boolean().optional(),
    marketing_emails: z.boolean().optional(),
    marketing_sms: z.boolean().optional(),
    newsletter_subscribed: z.boolean().optional(),
    dietary_preferences: z.array(z.string()).nullable().optional(),
    staff_permissions: z.record(z.boolean()).nullable().optional(),
});
export const searchUserInputSchema = z.object({
    query: z.string().optional(),
    role: z.enum(['customer', 'staff', 'admin']).optional(),
    status: z.enum(['active', 'inactive', 'suspended']).optional(),
    email_verified: z.boolean().optional(),
    limit: z.number().int().positive().default(20),
    offset: z.number().int().nonnegative().default(0),
    sort_by: z.enum(['created_at', 'last_login_at', 'email', 'first_name']).default('created_at'),
    sort_order: z.enum(['asc', 'desc']).default('desc'),
});
// ============================================
// ADDRESSES SCHEMAS
// ============================================
export const addressSchema = z.object({
    address_id: z.string(),
    user_id: z.string(),
    label: z.string(),
    address_line1: z.string(),
    address_line2: z.string().nullable(),
    city: z.string(),
    postal_code: z.string(),
    delivery_instructions: z.string().nullable(),
    is_default: z.boolean(),
    latitude: z.number().nullable(),
    longitude: z.number().nullable(),
    created_at: z.string(),
});
export const createAddressInputSchema = z.object({
    user_id: z.string(),
    label: z.string().min(1).max(50),
    address_line1: z.string().min(1).max(255),
    address_line2: z.string().max(255).nullable().optional(),
    city: z.string().min(1).max(100).default('Dublin'),
    postal_code: z.string().min(1).max(20),
    delivery_instructions: z.string().max(500).nullable().optional(),
    is_default: z.boolean().default(false),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
});
export const updateAddressInputSchema = z.object({
    address_id: z.string(),
    label: z.string().min(1).max(50).optional(),
    address_line1: z.string().min(1).max(255).optional(),
    address_line2: z.string().max(255).nullable().optional(),
    city: z.string().min(1).max(100).optional(),
    postal_code: z.string().min(1).max(20).optional(),
    delivery_instructions: z.string().max(500).nullable().optional(),
    is_default: z.boolean().optional(),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
});
export const searchAddressInputSchema = z.object({
    user_id: z.string().optional(),
    city: z.string().optional(),
    is_default: z.boolean().optional(),
    limit: z.number().int().positive().default(50),
    offset: z.number().int().nonnegative().default(0),
});
// ============================================
// PAYMENT METHODS SCHEMAS
// ============================================
export const paymentMethodSchema = z.object({
    payment_method_id: z.string(),
    user_id: z.string(),
    sumup_token: z.string(),
    card_type: z.string(),
    last_four_digits: z.string(),
    expiry_month: z.string(),
    expiry_year: z.string(),
    cardholder_name: z.string(),
    is_default: z.boolean(),
    created_at: z.string(),
});
export const createPaymentMethodInputSchema = z.object({
    user_id: z.string(),
    sumup_token: z.string(),
    card_type: z.enum(['Visa', 'Mastercard', 'Amex', 'Discover']),
    last_four_digits: z.string().length(4).regex(/^\d{4}$/),
    expiry_month: z.string().length(2).regex(/^(0[1-9]|1[0-2])$/),
    expiry_year: z.string().length(4).regex(/^\d{4}$/),
    cardholder_name: z.string().min(1).max(100),
    is_default: z.boolean().default(false),
});
export const updatePaymentMethodInputSchema = z.object({
    payment_method_id: z.string(),
    expiry_month: z.string().length(2).regex(/^(0[1-9]|1[0-2])$/).optional(),
    expiry_year: z.string().length(4).regex(/^\d{4}$/).optional(),
    is_default: z.boolean().optional(),
});
// ============================================
// PASSWORD RESETS SCHEMAS
// ============================================
export const passwordResetSchema = z.object({
    reset_id: z.string(),
    user_id: z.string(),
    reset_token: z.string(),
    created_at: z.string(),
    expires_at: z.string(),
    used: z.boolean(),
});
export const createPasswordResetInputSchema = z.object({
    user_id: z.string(),
    reset_token: z.string(),
    expires_at: z.string(),
});
export const verifyPasswordResetInputSchema = z.object({
    reset_token: z.string(),
    new_password: z.string().min(8).max(100),
});
// ============================================
// EMAIL VERIFICATIONS SCHEMAS
// ============================================
export const emailVerificationSchema = z.object({
    verification_id: z.string(),
    user_id: z.string(),
    verification_token: z.string(),
    created_at: z.string(),
    expires_at: z.string(),
    verified_at: z.string().nullable(),
});
export const createEmailVerificationInputSchema = z.object({
    user_id: z.string(),
    verification_token: z.string(),
    expires_at: z.string(),
});
export const verifyEmailInputSchema = z.object({
    verification_token: z.string(),
});
// ============================================
// NEWSLETTER SUBSCRIBERS SCHEMAS
// ============================================
export const newsletterSubscriberSchema = z.object({
    subscriber_id: z.string(),
    email: z.string(),
    subscribed_at: z.string(),
    status: z.string(),
    user_id: z.string().nullable(),
});
export const createNewsletterSubscriberInputSchema = z.object({
    email: z.string().email().max(255),
    user_id: z.string().nullable().optional(),
});
export const updateNewsletterSubscriberInputSchema = z.object({
    subscriber_id: z.string(),
    status: z.enum(['subscribed', 'unsubscribed']),
});
export const searchNewsletterSubscriberInputSchema = z.object({
    status: z.enum(['subscribed', 'unsubscribed']).optional(),
    limit: z.number().int().positive().default(100),
    offset: z.number().int().nonnegative().default(0),
});
// ============================================
// CATEGORIES SCHEMAS
// ============================================
export const categorySchema = z.object({
    category_id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    sort_order: z.number().int(),
    created_at: z.string(),
});
export const createCategoryInputSchema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).nullable().optional(),
    sort_order: z.number().int().nonnegative().default(0),
});
export const updateCategoryInputSchema = z.object({
    category_id: z.string(),
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).nullable().optional(),
    sort_order: z.number().int().nonnegative().optional(),
});
export const searchCategoryInputSchema = z.object({
    query: z.string().optional(),
    limit: z.number().int().positive().default(50),
    offset: z.number().int().nonnegative().default(0),
    sort_by: z.enum(['name', 'sort_order', 'created_at']).default('sort_order'),
    sort_order: z.enum(['asc', 'desc']).default('asc'),
});
// ============================================
// MENU ITEMS SCHEMAS
// ============================================
export const menuItemSchema = z.object({
    item_id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    category_id: z.string(),
    price: z.number(),
    image_url: z.string().nullable(),
    image_urls: z.array(z.string()).nullable(),
    dietary_tags: z.array(z.string()).nullable(),
    is_limited_edition: z.boolean(),
    limited_edition_end_date: z.string().nullable(),
    is_active: z.boolean(),
    available_for_collection: z.boolean(),
    available_for_delivery: z.boolean(),
    stock_tracked: z.boolean(),
    current_stock: z.number().int().nullable(),
    low_stock_threshold: z.number().int().nullable(),
    sort_order: z.number().int(),
    is_featured: z.boolean(),
    meta_description: z.string().nullable(),
    image_alt_text: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
});
export const createMenuItemInputSchema = z.object({
    name: z.string().min(1).max(255),
    description: z.string().max(1000).nullable().optional(),
    category_id: z.string(),
    price: z.number().positive(),
    image_url: z.string().url().nullable().optional(),
    image_urls: z.array(z.string().url()).nullable().optional(),
    dietary_tags: z.array(z.string()).nullable().optional(),
    is_limited_edition: z.boolean().default(false),
    limited_edition_end_date: z.string().nullable().optional(),
    is_active: z.boolean().default(true),
    available_for_collection: z.boolean().default(true),
    available_for_delivery: z.boolean().default(true),
    stock_tracked: z.boolean().default(false),
    current_stock: z.number().int().nonnegative().nullable().optional(),
    low_stock_threshold: z.number().int().positive().nullable().optional(),
    sort_order: z.number().int().nonnegative().default(0),
    is_featured: z.boolean().default(false),
    meta_description: z.string().max(160).nullable().optional(),
    image_alt_text: z.string().max(255).nullable().optional(),
});
export const updateMenuItemInputSchema = z.object({
    item_id: z.string(),
    name: z.string().min(1).max(255).optional(),
    description: z.string().max(1000).nullable().optional(),
    category_id: z.string().optional(),
    price: z.number().positive().optional(),
    image_url: z.string().url().nullable().optional(),
    image_urls: z.array(z.string().url()).nullable().optional(),
    dietary_tags: z.array(z.string()).nullable().optional(),
    is_limited_edition: z.boolean().optional(),
    limited_edition_end_date: z.string().nullable().optional(),
    is_active: z.boolean().optional(),
    available_for_collection: z.boolean().optional(),
    available_for_delivery: z.boolean().optional(),
    stock_tracked: z.boolean().optional(),
    current_stock: z.number().int().nonnegative().nullable().optional(),
    low_stock_threshold: z.number().int().positive().nullable().optional(),
    sort_order: z.number().int().nonnegative().optional(),
    is_featured: z.boolean().optional(),
    meta_description: z.string().max(160).nullable().optional(),
    image_alt_text: z.string().max(255).nullable().optional(),
});
export const searchMenuItemInputSchema = z.object({
    query: z.string().optional(),
    search: z.string().optional(), // Alias for query
    category_id: z.string().optional(),
    category: z.string().optional(), // Alias for category_id
    is_active: z.boolean().optional(),
    is_featured: z.boolean().optional(),
    is_limited_edition: z.boolean().optional(),
    available_for_collection: z.boolean().optional(),
    available_for_delivery: z.boolean().optional(),
    dietary_tags: z.array(z.string()).optional(),
    dietary_filters: z.union([z.string(), z.array(z.string())]).optional(), // Alias for dietary_tags
    min_price: z.number().nonnegative().optional(),
    max_price: z.number().positive().optional(),
    in_stock: z.boolean().optional(),
    limit: z.number().int().positive().default(50),
    offset: z.number().int().nonnegative().default(0),
    sort_by: z.enum(['name', 'price', 'sort_order', 'created_at']).default('sort_order'),
    sort_order: z.enum(['asc', 'desc']).default('asc'),
});
// ============================================
// CUSTOMIZATION GROUPS SCHEMAS
// ============================================
export const customizationGroupSchema = z.object({
    group_id: z.string(),
    item_id: z.string(),
    name: z.string(),
    type: z.string(),
    is_required: z.boolean(),
    sort_order: z.number().int(),
});
export const createCustomizationGroupInputSchema = z.object({
    item_id: z.string(),
    name: z.string().min(1).max(100),
    type: z.enum(['single', 'multiple']),
    is_required: z.boolean().default(false),
    sort_order: z.number().int().nonnegative().default(0),
});
export const updateCustomizationGroupInputSchema = z.object({
    group_id: z.string(),
    name: z.string().min(1).max(100).optional(),
    type: z.enum(['single', 'multiple']).optional(),
    is_required: z.boolean().optional(),
    sort_order: z.number().int().nonnegative().optional(),
});
// ============================================
// CUSTOMIZATION OPTIONS SCHEMAS
// ============================================
export const customizationOptionSchema = z.object({
    option_id: z.string(),
    group_id: z.string(),
    name: z.string(),
    additional_price: z.number(),
    is_default: z.boolean(),
    sort_order: z.number().int(),
});
export const createCustomizationOptionInputSchema = z.object({
    group_id: z.string(),
    name: z.string().min(1).max(100),
    additional_price: z.number().nonnegative().default(0),
    is_default: z.boolean().default(false),
    sort_order: z.number().int().nonnegative().default(0),
});
export const updateCustomizationOptionInputSchema = z.object({
    option_id: z.string(),
    name: z.string().min(1).max(100).optional(),
    additional_price: z.number().nonnegative().optional(),
    is_default: z.boolean().optional(),
    sort_order: z.number().int().nonnegative().optional(),
});
// ============================================
// ORDERS SCHEMAS
// ============================================
export const orderSchema = z.object({
    order_id: z.string(),
    order_number: z.string(),
    user_id: z.string(),
    order_type: z.string(),
    status: z.string(),
    collection_time_slot: z.string().nullable(),
    delivery_address_id: z.string().nullable(),
    delivery_address_snapshot: z.record(z.unknown()).nullable(),
    delivery_fee: z.number().nullable(),
    estimated_delivery_time: z.string().nullable(),
    subtotal: z.number(),
    discount_code: z.string().nullable(),
    discount_amount: z.number(),
    tax_amount: z.number(),
    total_amount: z.number(),
    payment_status: z.string(),
    payment_method_id: z.string().nullable(),
    payment_method_type: z.string().nullable(),
    sumup_transaction_id: z.string().nullable(),
    invoice_url: z.string().nullable(),
    loyalty_points_awarded: z.number().int(),
    special_instructions: z.string().nullable(),
    customer_name: z.string(),
    customer_email: z.string(),
    customer_phone: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    completed_at: z.string().nullable(),
    cancelled_at: z.string().nullable(),
    cancellation_reason: z.string().nullable(),
    refund_amount: z.number().nullable(),
    refund_reason: z.string().nullable(),
    refunded_at: z.string().nullable(),
    internal_notes: z.string().nullable(),
});
export const createOrderInputSchema = z.object({
    user_id: z.string(),
    order_type: z.enum(['collection', 'delivery']),
    collection_time_slot: z.string().nullable().optional(),
    delivery_address_id: z.string().nullable().optional(),
    delivery_fee: z.number().nonnegative().nullable().optional(),
    discount_code: z.string().nullable().optional(),
    special_instructions: z.string().max(1000).nullable().optional(),
    customer_name: z.string().min(1).max(100),
    customer_email: z.string().email().max(255),
    customer_phone: z.string().min(10).max(20),
    payment_method_id: z.string().nullable().optional(),
});
export const updateOrderInputSchema = z.object({
    order_id: z.string(),
    status: z.enum(['received', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled']).optional(),
    collection_time_slot: z.string().nullable().optional(),
    estimated_delivery_time: z.string().nullable().optional(),
    special_instructions: z.string().max(1000).nullable().optional(),
    cancellation_reason: z.string().max(500).nullable().optional(),
    refund_amount: z.number().nonnegative().nullable().optional(),
    refund_reason: z.string().max(500).nullable().optional(),
    internal_notes: z.string().max(1000).nullable().optional(),
});
export const searchOrderInputSchema = z.object({
    query: z.string().optional(),
    user_id: z.string().optional(),
    order_type: z.enum(['collection', 'delivery']).optional(),
    status: z.enum(['received', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled']).optional(),
    payment_status: z.enum(['pending', 'paid', 'failed', 'refunded']).optional(),
    date_from: z.string().optional(),
    date_to: z.string().optional(),
    min_amount: z.number().nonnegative().optional(),
    max_amount: z.number().positive().optional(),
    limit: z.number().int().positive().default(20),
    offset: z.number().int().nonnegative().default(0),
    sort_by: z.enum(['created_at', 'updated_at', 'total_amount', 'order_number']).default('created_at'),
    sort_order: z.enum(['asc', 'desc']).default('desc'),
});
// ============================================
// ORDER ITEMS SCHEMAS
// ============================================
export const orderItemSchema = z.object({
    order_item_id: z.string(),
    order_id: z.string(),
    item_id: z.string(),
    item_name: z.string(),
    quantity: z.number().int(),
    unit_price: z.number(),
    selected_customizations: z.record(z.unknown()).nullable(),
    line_total: z.number(),
});
export const createOrderItemInputSchema = z.object({
    order_id: z.string(),
    item_id: z.string(),
    item_name: z.string().min(1).max(255),
    quantity: z.number().int().positive(),
    unit_price: z.number().positive(),
    selected_customizations: z.record(z.unknown()).nullable().optional(),
    line_total: z.number().positive(),
});
// ============================================
// ORDER STATUS HISTORY SCHEMAS
// ============================================
export const orderStatusHistorySchema = z.object({
    history_id: z.string(),
    order_id: z.string(),
    status: z.string(),
    changed_by_user_id: z.string(),
    changed_at: z.string(),
    notes: z.string().nullable(),
});
export const createOrderStatusHistoryInputSchema = z.object({
    order_id: z.string(),
    status: z.enum(['received', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled']),
    changed_by_user_id: z.string(),
    notes: z.string().max(500).nullable().optional(),
});
// ============================================
// STOCK HISTORY SCHEMAS
// ============================================
export const stockHistorySchema = z.object({
    history_id: z.string(),
    item_id: z.string(),
    change_type: z.string(),
    previous_stock: z.number().int(),
    new_stock: z.number().int(),
    quantity_changed: z.number().int(),
    reason: z.string().nullable(),
    notes: z.string().nullable(),
    changed_by_user_id: z.string(),
    changed_at: z.string(),
    related_order_id: z.string().nullable(),
});
export const createStockHistoryInputSchema = z.object({
    item_id: z.string(),
    change_type: z.enum(['restock', 'sale', 'adjustment', 'waste']),
    previous_stock: z.number().int().nonnegative(),
    new_stock: z.number().int().nonnegative(),
    quantity_changed: z.number().int(),
    reason: z.string().max(255).nullable().optional(),
    notes: z.string().max(500).nullable().optional(),
    changed_by_user_id: z.string(),
    related_order_id: z.string().nullable().optional(),
});
export const searchStockHistoryInputSchema = z.object({
    item_id: z.string().optional(),
    change_type: z.enum(['restock', 'sale', 'adjustment', 'waste']).optional(),
    date_from: z.string().optional(),
    date_to: z.string().optional(),
    limit: z.number().int().positive().default(50),
    offset: z.number().int().nonnegative().default(0),
    sort_by: z.enum(['changed_at']).default('changed_at'),
    sort_order: z.enum(['asc', 'desc']).default('desc'),
});
// ============================================
// DELIVERY ZONES SCHEMAS
// ============================================
export const deliveryZoneSchema = z.object({
    zone_id: z.string(),
    zone_name: z.string(),
    zone_type: z.string(),
    zone_boundaries: z.record(z.unknown()),
    delivery_fee: z.number(),
    minimum_order_value: z.number().nullable(),
    estimated_delivery_time: z.number().int(),
    is_active: z.boolean(),
    priority: z.number().int(),
    created_at: z.string(),
    updated_at: z.string(),
});
export const createDeliveryZoneInputSchema = z.object({
    zone_name: z.string().min(1).max(100),
    zone_type: z.enum(['polygon', 'radius', 'postal_code']),
    zone_boundaries: z.record(z.unknown()),
    delivery_fee: z.number().nonnegative(),
    minimum_order_value: z.number().positive().nullable().optional(),
    estimated_delivery_time: z.number().int().positive(),
    is_active: z.boolean().default(true),
    priority: z.number().int().nonnegative().default(0),
});
export const updateDeliveryZoneInputSchema = z.object({
    zone_id: z.string(),
    zone_name: z.string().min(1).max(100).optional(),
    zone_boundaries: z.record(z.unknown()).optional(),
    delivery_fee: z.number().nonnegative().optional(),
    minimum_order_value: z.number().positive().nullable().optional(),
    estimated_delivery_time: z.number().int().positive().optional(),
    is_active: z.boolean().optional(),
    priority: z.number().int().nonnegative().optional(),
});
// ============================================
// DISCOUNT CODES SCHEMAS
// ============================================
export const discountCodeSchema = z.object({
    code_id: z.string(),
    code: z.string(),
    discount_type: z.string(),
    discount_value: z.number(),
    applicable_order_types: z.array(z.string()).nullable(),
    applicable_category_ids: z.array(z.string()).nullable(),
    applicable_item_ids: z.array(z.string()).nullable(),
    minimum_order_value: z.number().nullable(),
    total_usage_limit: z.number().int().nullable(),
    per_customer_usage_limit: z.number().int().nullable(),
    total_used_count: z.number().int(),
    valid_from: z.string(),
    valid_until: z.string().nullable(),
    status: z.string(),
    internal_notes: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
});
export const createDiscountCodeInputSchema = z.object({
    code: z.string().min(1).max(50).toUpperCase(),
    discount_type: z.enum(['percentage', 'fixed', 'delivery_fee']),
    discount_value: z.number().positive(),
    applicable_order_types: z.array(z.enum(['collection', 'delivery'])).nullable().optional(),
    applicable_category_ids: z.array(z.string()).nullable().optional(),
    applicable_item_ids: z.array(z.string()).nullable().optional(),
    minimum_order_value: z.number().positive().nullable().optional(),
    total_usage_limit: z.number().int().positive().nullable().optional(),
    per_customer_usage_limit: z.number().int().positive().nullable().optional(),
    valid_from: z.string(),
    valid_until: z.string().nullable().optional(),
    status: z.enum(['active', 'inactive', 'expired']).default('active'),
    internal_notes: z.string().max(500).nullable().optional(),
});
export const updateDiscountCodeInputSchema = z.object({
    code_id: z.string(),
    discount_value: z.number().positive().optional(),
    minimum_order_value: z.number().positive().nullable().optional(),
    total_usage_limit: z.number().int().positive().nullable().optional(),
    per_customer_usage_limit: z.number().int().positive().nullable().optional(),
    valid_until: z.string().nullable().optional(),
    status: z.enum(['active', 'inactive', 'expired']).optional(),
    internal_notes: z.string().max(500).nullable().optional(),
});
export const validateDiscountCodeInputSchema = z.object({
    code: z.string().toUpperCase(),
    user_id: z.string(),
    order_type: z.enum(['collection', 'delivery']),
    order_value: z.number().positive(),
});
export const searchDiscountCodeInputSchema = z.object({
    query: z.string().optional(),
    status: z.enum(['active', 'inactive', 'expired']).optional(),
    discount_type: z.enum(['percentage', 'fixed', 'delivery_fee']).optional(),
    limit: z.number().int().positive().default(50),
    offset: z.number().int().nonnegative().default(0),
    sort_by: z.enum(['created_at', 'code', 'valid_from']).default('created_at'),
    sort_order: z.enum(['asc', 'desc']).default('desc'),
});
// ============================================
// DISCOUNT USAGE SCHEMAS
// ============================================
export const discountUsageSchema = z.object({
    usage_id: z.string(),
    code_id: z.string(),
    user_id: z.string(),
    order_id: z.string(),
    discount_amount_applied: z.number(),
    used_at: z.string(),
});
export const createDiscountUsageInputSchema = z.object({
    code_id: z.string(),
    user_id: z.string(),
    order_id: z.string(),
    discount_amount_applied: z.number().nonnegative(),
});
// ============================================
// LOYALTY ACCOUNTS SCHEMAS
// ============================================
export const loyaltyAccountSchema = z.object({
    loyalty_account_id: z.string(),
    user_id: z.string(),
    current_points_balance: z.number().int(),
    total_points_earned: z.number().int(),
    total_points_redeemed: z.number().int(),
    total_points_expired: z.number().int(),
    referral_count: z.number().int(),
    spin_wheel_available_count: z.number().int(),
    next_spin_available_at: z.string().nullable(),
    created_at: z.string(),
});
export const createLoyaltyAccountInputSchema = z.object({
    user_id: z.string(),
    current_points_balance: z.number().int().nonnegative().default(0),
    spin_wheel_available_count: z.number().int().nonnegative().default(0),
});
export const updateLoyaltyAccountInputSchema = z.object({
    loyalty_account_id: z.string(),
    current_points_balance: z.number().int().nonnegative().optional(),
    spin_wheel_available_count: z.number().int().nonnegative().optional(),
    next_spin_available_at: z.string().nullable().optional(),
});
// ============================================
// POINTS TRANSACTIONS SCHEMAS
// ============================================
export const pointsTransactionSchema = z.object({
    transaction_id: z.string(),
    loyalty_account_id: z.string(),
    transaction_type: z.string(),
    points_amount: z.number().int(),
    order_id: z.string().nullable(),
    reason: z.string().nullable(),
    adjusted_by_user_id: z.string().nullable(),
    running_balance: z.number().int(),
    created_at: z.string(),
    expires_at: z.string().nullable(),
});
export const createPointsTransactionInputSchema = z.object({
    loyalty_account_id: z.string(),
    transaction_type: z.enum(['earned', 'redeemed', 'expired', 'manual_adjustment']),
    points_amount: z.number().int(),
    order_id: z.string().nullable().optional(),
    reason: z.string().max(255).nullable().optional(),
    adjusted_by_user_id: z.string().nullable().optional(),
    running_balance: z.number().int(),
    expires_at: z.string().nullable().optional(),
});
export const searchPointsTransactionInputSchema = z.object({
    loyalty_account_id: z.string().optional(),
    transaction_type: z.enum(['earned', 'redeemed', 'expired', 'manual_adjustment']).optional(),
    date_from: z.string().optional(),
    date_to: z.string().optional(),
    limit: z.number().int().positive().default(50),
    offset: z.number().int().nonnegative().default(0),
    sort_by: z.enum(['created_at']).default('created_at'),
    sort_order: z.enum(['asc', 'desc']).default('desc'),
});
// ============================================
// BADGES SCHEMAS
// ============================================
export const badgeSchema = z.object({
    badge_id: z.string(),
    name: z.string(),
    description: z.string(),
    unlock_criteria: z.record(z.unknown()),
    icon_url: z.string(),
    is_active: z.boolean(),
    sort_order: z.number().int(),
    created_at: z.string(),
});
export const createBadgeInputSchema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().min(1).max(500),
    unlock_criteria: z.record(z.unknown()),
    icon_url: z.string().url(),
    is_active: z.boolean().default(true),
    sort_order: z.number().int().nonnegative().default(0),
});
export const updateBadgeInputSchema = z.object({
    badge_id: z.string(),
    name: z.string().min(1).max(100).optional(),
    description: z.string().min(1).max(500).optional(),
    unlock_criteria: z.record(z.unknown()).optional(),
    icon_url: z.string().url().optional(),
    is_active: z.boolean().optional(),
    sort_order: z.number().int().nonnegative().optional(),
});
// ============================================
// USER BADGES SCHEMAS
// ============================================
export const userBadgeSchema = z.object({
    user_badge_id: z.string(),
    loyalty_account_id: z.string(),
    badge_id: z.string(),
    earned_at: z.string(),
});
export const createUserBadgeInputSchema = z.object({
    loyalty_account_id: z.string(),
    badge_id: z.string(),
});
// ============================================
// REWARDS SCHEMAS
// ============================================
export const rewardSchema = z.object({
    reward_id: z.string(),
    name: z.string(),
    description: z.string(),
    points_cost: z.number().int(),
    reward_type: z.string(),
    reward_value: z.record(z.unknown()),
    expiry_days_after_redemption: z.number().int().nullable(),
    stock_limit: z.number().int().nullable(),
    stock_remaining: z.number().int().nullable(),
    status: z.string(),
    image_url: z.string().nullable(),
    availability_status: z.string().nullable(),
    sort_order: z.number().int(),
    created_at: z.string(),
    updated_at: z.string(),
});
export const createRewardInputSchema = z.object({
    name: z.string().min(1).max(255),
    description: z.string().min(1).max(1000),
    points_cost: z.number().int().positive(),
    reward_type: z.enum(['discount', 'delivery', 'physical', 'merchandise']),
    reward_value: z.record(z.unknown()),
    expiry_days_after_redemption: z.number().int().positive().nullable().optional(),
    stock_limit: z.number().int().positive().nullable().optional(),
    stock_remaining: z.number().int().nonnegative().nullable().optional(),
    status: z.enum(['active', 'inactive', 'out_of_stock']).default('active'),
    image_url: z.string().url().nullable().optional(),
    availability_status: z.enum(['available', 'limited', 'unavailable']).nullable().optional(),
    sort_order: z.number().int().nonnegative().default(0),
});
export const updateRewardInputSchema = z.object({
    reward_id: z.string(),
    name: z.string().min(1).max(255).optional(),
    description: z.string().min(1).max(1000).optional(),
    points_cost: z.number().int().positive().optional(),
    reward_value: z.record(z.unknown()).optional(),
    expiry_days_after_redemption: z.number().int().positive().nullable().optional(),
    stock_limit: z.number().int().positive().nullable().optional(),
    stock_remaining: z.number().int().nonnegative().nullable().optional(),
    status: z.enum(['active', 'inactive', 'out_of_stock']).optional(),
    image_url: z.string().url().nullable().optional(),
    availability_status: z.enum(['available', 'limited', 'unavailable']).nullable().optional(),
    sort_order: z.number().int().nonnegative().optional(),
});
export const searchRewardInputSchema = z.object({
    status: z.enum(['active', 'inactive', 'out_of_stock']).optional(),
    reward_type: z.enum(['discount', 'delivery', 'physical', 'merchandise']).optional(),
    max_points_cost: z.number().int().positive().optional(),
    limit: z.number().int().positive().default(50),
    offset: z.number().int().nonnegative().default(0),
    sort_by: z.enum(['points_cost', 'sort_order', 'created_at']).default('sort_order'),
    sort_order: z.enum(['asc', 'desc']).default('asc'),
});
// ============================================
// REDEEMED REWARDS SCHEMAS
// ============================================
export const redeemedRewardSchema = z.object({
    redeemed_reward_id: z.string(),
    loyalty_account_id: z.string(),
    reward_id: z.string(),
    reward_code: z.string(),
    points_deducted: z.number().int(),
    redeemed_at: z.string(),
    expires_at: z.string().nullable(),
    usage_status: z.string(),
    used_in_order_id: z.string().nullable(),
    used_at: z.string().nullable(),
});
export const createRedeemedRewardInputSchema = z.object({
    loyalty_account_id: z.string(),
    reward_id: z.string(),
    reward_code: z.string().min(1).max(50),
    points_deducted: z.number().int().positive(),
    expires_at: z.string().nullable().optional(),
});
export const updateRedeemedRewardInputSchema = z.object({
    redeemed_reward_id: z.string(),
    usage_status: z.enum(['unused', 'used', 'expired']),
    used_in_order_id: z.string().nullable().optional(),
    used_at: z.string().nullable().optional(),
});
export const searchRedeemedRewardInputSchema = z.object({
    loyalty_account_id: z.string().optional(),
    usage_status: z.enum(['unused', 'used', 'expired']).optional(),
    limit: z.number().int().positive().default(50),
    offset: z.number().int().nonnegative().default(0),
    sort_by: z.enum(['redeemed_at']).default('redeemed_at'),
    sort_order: z.enum(['asc', 'desc']).default('desc'),
});
// ============================================
// CATERING INQUIRIES SCHEMAS
// ============================================
export const cateringInquirySchema = z.object({
    inquiry_id: z.string(),
    inquiry_number: z.string(),
    user_id: z.string().nullable(),
    contact_name: z.string(),
    contact_email: z.string(),
    contact_phone: z.string(),
    company_name: z.string().nullable(),
    event_type: z.string(),
    event_type_other: z.string().nullable(),
    event_date: z.string(),
    event_start_time: z.string(),
    event_end_time: z.string(),
    event_location_address: z.string(),
    event_location_city: z.string(),
    event_location_postal_code: z.string(),
    event_location_type: z.string(),
    guest_count: z.number().int(),
    guest_count_min: z.number().int().nullable(),
    guest_count_max: z.number().int().nullable(),
    dietary_requirements: z.array(z.string()).nullable(),
    dietary_notes: z.string().nullable(),
    menu_preferences: z.string().nullable(),
    preferred_package: z.string().nullable(),
    budget_range: z.string().nullable(),
    additional_details: z.string().nullable(),
    attached_files: z.array(z.string()).nullable(),
    marketing_opt_in: z.boolean(),
    status: z.string(),
    admin_notes: z.string().nullable(),
    submitted_at: z.string(),
    updated_at: z.string(),
});
export const createCateringInquiryInputSchema = z.object({
    user_id: z.string().nullable().optional(),
    contact_name: z.string().min(1).max(100),
    contact_email: z.string().min(1, 'Email is required').email('Invalid email format').max(255),
    contact_phone: z.string().min(10).max(20),
    company_name: z.string().max(255).nullable().optional(),
    event_type: z.enum(['corporate', 'wedding', 'birthday', 'meeting', 'other']),
    event_type_other: z.string().max(100).nullable().optional(),
    event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
    event_start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
    event_end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
    event_location_address: z.string().min(1).max(255),
    event_location_city: z.string().min(1).max(100),
    event_location_postal_code: z.string().min(1).max(20),
    event_location_type: z.enum(['office', 'home', 'venue', 'outdoor', 'other']),
    guest_count: z.number().int().positive(),
    guest_count_min: z.number().int().positive().nullable().optional(),
    guest_count_max: z.number().int().positive().nullable().optional(),
    dietary_requirements: z.array(z.string()).nullable().optional(),
    dietary_notes: z.string().max(1000).nullable().optional(),
    menu_preferences: z.string().max(1000).nullable().optional(),
    preferred_package: z.enum(['standard', 'premium', 'luxury']).nullable().optional(),
    budget_range: z.string().nullable().optional(),
    additional_details: z.string().max(2000).nullable().optional(),
    attached_files: z.array(z.string().url()).nullable().optional(),
    marketing_opt_in: z.boolean().default(false),
});
export const updateCateringInquiryInputSchema = z.object({
    inquiry_id: z.string(),
    status: z.enum(['new', 'in_progress', 'quoted', 'confirmed', 'completed', 'cancelled']),
    admin_notes: z.string().max(2000).nullable().optional(),
});
export const searchCateringInquiryInputSchema = z.object({
    query: z.string().optional(),
    status: z.enum(['new', 'in_progress', 'quoted', 'confirmed', 'completed', 'cancelled']).optional(),
    event_type: z.enum(['corporate', 'wedding', 'birthday', 'meeting', 'other']).optional(),
    date_from: z.string().optional(),
    date_to: z.string().optional(),
    limit: z.number().int().positive().default(20),
    offset: z.number().int().nonnegative().default(0),
    sort_by: z.enum(['submitted_at', 'event_date', 'guest_count']).default('submitted_at'),
    sort_order: z.enum(['asc', 'desc']).default('desc'),
});
// ============================================
// CATERING QUOTES SCHEMAS
// ============================================
export const cateringQuoteSchema = z.object({
    quote_id: z.string(),
    inquiry_id: z.string(),
    quote_number: z.string(),
    line_items: z.array(z.record(z.unknown())),
    subtotal: z.number(),
    additional_fees: z.array(z.record(z.unknown())).nullable(),
    tax_amount: z.number(),
    grand_total: z.number(),
    valid_until: z.string(),
    terms: z.string().nullable(),
    quote_pdf_url: z.string().nullable(),
    created_at: z.string(),
    sent_at: z.string().nullable(),
    accepted_at: z.string().nullable(),
});
export const createCateringQuoteInputSchema = z.object({
    inquiry_id: z.string(),
    line_items: z.array(z.object({
        item: z.string(),
        quantity: z.number().int().positive(),
        unit_price: z.number().positive(),
        total: z.number().positive(),
    })),
    subtotal: z.number().positive(),
    additional_fees: z.array(z.object({
        name: z.string(),
        amount: z.number().nonnegative(),
    })).nullable().optional(),
    tax_amount: z.number().nonnegative(),
    grand_total: z.number().positive(),
    valid_until: z.string(),
    terms: z.string().max(2000).nullable().optional(),
});
export const updateCateringQuoteInputSchema = z.object({
    quote_id: z.string(),
    quote_pdf_url: z.string().url().nullable().optional(),
    sent_at: z.string().nullable().optional(),
    accepted_at: z.string().nullable().optional(),
});
// ============================================
// INVOICES SCHEMAS
// ============================================
export const invoiceSchema = z.object({
    invoice_id: z.string(),
    invoice_number: z.string(),
    order_id: z.string().nullable(),
    catering_inquiry_id: z.string().nullable(),
    user_id: z.string(),
    customer_name: z.string(),
    customer_email: z.string(),
    customer_phone: z.string(),
    customer_address: z.string().nullable(),
    line_items: z.array(z.record(z.unknown())),
    subtotal: z.number(),
    discount_amount: z.number(),
    delivery_fee: z.number().nullable(),
    tax_amount: z.number(),
    grand_total: z.number(),
    payment_status: z.string(),
    payment_method: z.string().nullable(),
    sumup_transaction_id: z.string().nullable(),
    issue_date: z.string(),
    due_date: z.string().nullable(),
    paid_at: z.string().nullable(),
    invoice_pdf_url: z.string().nullable(),
    notes: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
});
export const createInvoiceInputSchema = z.object({
    order_id: z.string().nullable().optional(),
    catering_inquiry_id: z.string().nullable().optional(),
    user_id: z.string(),
    customer_name: z.string().min(1).max(100),
    customer_email: z.string().email().max(255),
    customer_phone: z.string().min(10).max(20),
    customer_address: z.string().max(500).nullable().optional(),
    line_items: z.array(z.object({
        item: z.string(),
        quantity: z.number().int().positive(),
        unit_price: z.number().positive(),
        total: z.number().positive(),
    })),
    subtotal: z.number().positive(),
    discount_amount: z.number().nonnegative().default(0),
    delivery_fee: z.number().nonnegative().nullable().optional(),
    tax_amount: z.number().nonnegative(),
    grand_total: z.number().positive(),
    payment_status: z.enum(['pending', 'paid', 'overdue', 'cancelled']).default('pending'),
    payment_method: z.string().max(50).nullable().optional(),
    issue_date: z.string(),
    due_date: z.string().nullable().optional(),
    notes: z.string().max(1000).nullable().optional(),
});
export const updateInvoiceInputSchema = z.object({
    invoice_id: z.string(),
    payment_status: z.enum(['pending', 'paid', 'overdue', 'cancelled']).optional(),
    payment_method: z.string().max(50).nullable().optional(),
    sumup_transaction_id: z.string().nullable().optional(),
    paid_at: z.string().nullable().optional(),
    invoice_pdf_url: z.string().url().nullable().optional(),
    notes: z.string().max(1000).nullable().optional(),
});
export const searchInvoiceInputSchema = z.object({
    query: z.string().optional(),
    user_id: z.string().optional(),
    payment_status: z.enum(['pending', 'paid', 'overdue', 'cancelled']).optional(),
    date_from: z.string().optional(),
    date_to: z.string().optional(),
    limit: z.number().int().positive().default(20),
    offset: z.number().int().nonnegative().default(0),
    sort_by: z.enum(['created_at', 'issue_date', 'grand_total']).default('created_at'),
    sort_order: z.enum(['asc', 'desc']).default('desc'),
});
// ============================================
// SYSTEM SETTINGS SCHEMAS
// ============================================
export const systemSettingSchema = z.object({
    setting_id: z.string(),
    setting_key: z.string(),
    setting_value: z.unknown().nullable(),
    setting_type: z.string(),
    updated_at: z.string(),
    updated_by_user_id: z.string().nullable(),
});
export const createSystemSettingInputSchema = z.object({
    setting_key: z.string().min(1).max(100),
    setting_value: z.unknown().nullable(),
    setting_type: z.enum(['string', 'number', 'boolean', 'json']),
    updated_by_user_id: z.string().nullable().optional(),
});
export const updateSystemSettingInputSchema = z.object({
    setting_id: z.string(),
    setting_value: z.unknown().nullable(),
    updated_by_user_id: z.string().nullable().optional(),
});
// ============================================
// ACTIVITY LOGS SCHEMAS
// ============================================
export const activityLogSchema = z.object({
    log_id: z.string(),
    user_id: z.string(),
    action_type: z.string(),
    entity_type: z.string(),
    entity_id: z.string(),
    description: z.string().nullable(),
    changes: z.record(z.unknown()).nullable(),
    ip_address: z.string().nullable(),
    user_agent: z.string().nullable(),
    created_at: z.string(),
});
export const createActivityLogInputSchema = z.object({
    user_id: z.string(),
    action_type: z.enum(['create', 'update', 'delete', 'view', 'login', 'logout']),
    entity_type: z.string().min(1).max(50),
    entity_id: z.string(),
    description: z.string().max(500).nullable().optional(),
    changes: z.record(z.unknown()).nullable().optional(),
    ip_address: z.string().max(45).nullable().optional(),
    user_agent: z.string().max(255).nullable().optional(),
});
export const searchActivityLogInputSchema = z.object({
    user_id: z.string().optional(),
    action_type: z.enum(['create', 'update', 'delete', 'view', 'login', 'logout']).optional(),
    entity_type: z.string().optional(),
    entity_id: z.string().optional(),
    date_from: z.string().optional(),
    date_to: z.string().optional(),
    limit: z.number().int().positive().default(50),
    offset: z.number().int().nonnegative().default(0),
    sort_by: z.enum(['created_at']).default('created_at'),
    sort_order: z.enum(['asc', 'desc']).default('desc'),
});
// ============================================
// HOMEPAGE SECTIONS SCHEMAS
// ============================================
export const homepageSectionSchema = z.object({
    section_id: z.string(),
    category_id: z.string(),
    enabled: z.boolean(),
    sort_order: z.number().int(),
    item_limit: z.number().int(),
    display_mode: z.enum(['auto_popular', 'auto_newest', 'manual']),
    selected_item_ids: z.array(z.string()).nullable(),
    created_at: z.string(),
    updated_at: z.string(),
});
export const createHomepageSectionInputSchema = z.object({
    category_id: z.string(),
    enabled: z.boolean().default(true),
    sort_order: z.number().int().nonnegative().default(0),
    item_limit: z.number().int().positive().max(20).default(6),
    display_mode: z.enum(['auto_popular', 'auto_newest', 'manual']).default('auto_popular'),
    selected_item_ids: z.array(z.string()).nullable().optional(),
});
export const updateHomepageSectionInputSchema = z.object({
    section_id: z.string(),
    enabled: z.boolean().optional(),
    sort_order: z.number().int().nonnegative().optional(),
    item_limit: z.number().int().positive().max(20).optional(),
    display_mode: z.enum(['auto_popular', 'auto_newest', 'manual']).optional(),
    selected_item_ids: z.array(z.string()).nullable().optional(),
});
export const reorderHomepageSectionsInputSchema = z.object({
    section_orders: z.array(z.object({
        section_id: z.string(),
        sort_order: z.number().int().nonnegative(),
    })),
});
// ============================================
// CONTACT MESSAGES SCHEMAS
// ============================================
export const contactMessageSchema = z.object({
    message_id: z.string(),
    name: z.string(),
    email: z.string(),
    phone: z.string().nullable(),
    subject: z.string(),
    message: z.string(),
    status: z.enum(['new', 'read', 'archived']),
    ip_address: z.string().nullable(),
    user_agent: z.string().nullable(),
    created_at: z.string(),
    read_at: z.string().nullable(),
    archived_at: z.string().nullable(),
});
export const createContactMessageInputSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    email: z.string().email('Please enter a valid email address').max(255),
    phone: z.string().max(20).nullable().optional(),
    subject: z.string().min(3, 'Subject must be at least 3 characters').max(200),
    message: z.string().min(10, 'Message must be at least 10 characters').max(5000),
});
export const updateContactMessageInputSchema = z.object({
    message_id: z.string(),
    status: z.enum(['new', 'read', 'archived']),
});
export const searchContactMessageInputSchema = z.object({
    status: z.enum(['new', 'read', 'archived']).optional(),
    q: z.string().optional(),
    limit: z.number().int().positive().default(20),
    offset: z.number().int().nonnegative().default(0),
    sort_by: z.enum(['created_at', 'email', 'subject']).default('created_at'),
    sort_order: z.enum(['asc', 'desc']).default('desc'),
});
//# sourceMappingURL=schema.js.map