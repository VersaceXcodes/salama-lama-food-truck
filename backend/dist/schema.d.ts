import { z } from 'zod';
export declare const userSchema: z.ZodObject<{
    user_id: z.ZodString;
    email: z.ZodString;
    phone: z.ZodString;
    password_hash: z.ZodString;
    first_name: z.ZodString;
    last_name: z.ZodString;
    role: z.ZodString;
    profile_photo_url: z.ZodNullable<z.ZodString>;
    email_verified: z.ZodBoolean;
    status: z.ZodString;
    created_at: z.ZodString;
    last_login_at: z.ZodNullable<z.ZodString>;
    marketing_opt_in: z.ZodBoolean;
    order_notifications_email: z.ZodBoolean;
    order_notifications_sms: z.ZodBoolean;
    marketing_emails: z.ZodBoolean;
    marketing_sms: z.ZodBoolean;
    newsletter_subscribed: z.ZodBoolean;
    dietary_preferences: z.ZodNullable<z.ZodArray<z.ZodString, "many">>;
    first_order_discount_code: z.ZodNullable<z.ZodString>;
    first_order_discount_used: z.ZodBoolean;
    referral_code: z.ZodNullable<z.ZodString>;
    referred_by_user_id: z.ZodNullable<z.ZodString>;
    staff_permissions: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    user_id?: string;
    email?: string;
    phone?: string;
    password_hash?: string;
    first_name?: string;
    last_name?: string;
    role?: string;
    profile_photo_url?: string;
    email_verified?: boolean;
    status?: string;
    created_at?: string;
    last_login_at?: string;
    marketing_opt_in?: boolean;
    order_notifications_email?: boolean;
    order_notifications_sms?: boolean;
    marketing_emails?: boolean;
    marketing_sms?: boolean;
    newsletter_subscribed?: boolean;
    dietary_preferences?: string[];
    first_order_discount_code?: string;
    first_order_discount_used?: boolean;
    referral_code?: string;
    referred_by_user_id?: string;
    staff_permissions?: Record<string, boolean>;
}, {
    user_id?: string;
    email?: string;
    phone?: string;
    password_hash?: string;
    first_name?: string;
    last_name?: string;
    role?: string;
    profile_photo_url?: string;
    email_verified?: boolean;
    status?: string;
    created_at?: string;
    last_login_at?: string;
    marketing_opt_in?: boolean;
    order_notifications_email?: boolean;
    order_notifications_sms?: boolean;
    marketing_emails?: boolean;
    marketing_sms?: boolean;
    newsletter_subscribed?: boolean;
    dietary_preferences?: string[];
    first_order_discount_code?: string;
    first_order_discount_used?: boolean;
    referral_code?: string;
    referred_by_user_id?: string;
    staff_permissions?: Record<string, boolean>;
}>;
export declare const createUserInputSchema: z.ZodObject<{
    email: z.ZodString;
    phone: z.ZodString;
    password: z.ZodString;
    first_name: z.ZodString;
    last_name: z.ZodString;
    role: z.ZodDefault<z.ZodEnum<["customer", "staff", "admin"]>>;
    profile_photo_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    marketing_opt_in: z.ZodDefault<z.ZodBoolean>;
    order_notifications_email: z.ZodDefault<z.ZodBoolean>;
    order_notifications_sms: z.ZodDefault<z.ZodBoolean>;
    marketing_emails: z.ZodDefault<z.ZodBoolean>;
    marketing_sms: z.ZodDefault<z.ZodBoolean>;
    newsletter_subscribed: z.ZodDefault<z.ZodBoolean>;
    dietary_preferences: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString, "many">>>;
    referred_by_user_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    email?: string;
    phone?: string;
    first_name?: string;
    last_name?: string;
    role?: "customer" | "staff" | "admin";
    profile_photo_url?: string;
    marketing_opt_in?: boolean;
    order_notifications_email?: boolean;
    order_notifications_sms?: boolean;
    marketing_emails?: boolean;
    marketing_sms?: boolean;
    newsletter_subscribed?: boolean;
    dietary_preferences?: string[];
    referred_by_user_id?: string;
    password?: string;
}, {
    email?: string;
    phone?: string;
    first_name?: string;
    last_name?: string;
    role?: "customer" | "staff" | "admin";
    profile_photo_url?: string;
    marketing_opt_in?: boolean;
    order_notifications_email?: boolean;
    order_notifications_sms?: boolean;
    marketing_emails?: boolean;
    marketing_sms?: boolean;
    newsletter_subscribed?: boolean;
    dietary_preferences?: string[];
    referred_by_user_id?: string;
    password?: string;
}>;
export declare const updateUserInputSchema: z.ZodObject<{
    user_id: z.ZodString;
    email: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    first_name: z.ZodOptional<z.ZodString>;
    last_name: z.ZodOptional<z.ZodString>;
    profile_photo_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    marketing_opt_in: z.ZodOptional<z.ZodBoolean>;
    order_notifications_email: z.ZodOptional<z.ZodBoolean>;
    order_notifications_sms: z.ZodOptional<z.ZodBoolean>;
    marketing_emails: z.ZodOptional<z.ZodBoolean>;
    marketing_sms: z.ZodOptional<z.ZodBoolean>;
    newsletter_subscribed: z.ZodOptional<z.ZodBoolean>;
    dietary_preferences: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString, "many">>>;
    staff_permissions: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodBoolean>>>;
}, "strip", z.ZodTypeAny, {
    user_id?: string;
    email?: string;
    phone?: string;
    first_name?: string;
    last_name?: string;
    profile_photo_url?: string;
    marketing_opt_in?: boolean;
    order_notifications_email?: boolean;
    order_notifications_sms?: boolean;
    marketing_emails?: boolean;
    marketing_sms?: boolean;
    newsletter_subscribed?: boolean;
    dietary_preferences?: string[];
    staff_permissions?: Record<string, boolean>;
}, {
    user_id?: string;
    email?: string;
    phone?: string;
    first_name?: string;
    last_name?: string;
    profile_photo_url?: string;
    marketing_opt_in?: boolean;
    order_notifications_email?: boolean;
    order_notifications_sms?: boolean;
    marketing_emails?: boolean;
    marketing_sms?: boolean;
    newsletter_subscribed?: boolean;
    dietary_preferences?: string[];
    staff_permissions?: Record<string, boolean>;
}>;
export declare const searchUserInputSchema: z.ZodObject<{
    query: z.ZodOptional<z.ZodString>;
    role: z.ZodOptional<z.ZodEnum<["customer", "staff", "admin"]>>;
    status: z.ZodOptional<z.ZodEnum<["active", "inactive", "suspended"]>>;
    email_verified: z.ZodOptional<z.ZodBoolean>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
    sort_by: z.ZodDefault<z.ZodEnum<["created_at", "last_login_at", "email", "first_name"]>>;
    sort_order: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    role?: "customer" | "staff" | "admin";
    email_verified?: boolean;
    status?: "active" | "inactive" | "suspended";
    query?: string;
    limit?: number;
    offset?: number;
    sort_by?: "email" | "first_name" | "created_at" | "last_login_at";
    sort_order?: "asc" | "desc";
}, {
    role?: "customer" | "staff" | "admin";
    email_verified?: boolean;
    status?: "active" | "inactive" | "suspended";
    query?: string;
    limit?: number;
    offset?: number;
    sort_by?: "email" | "first_name" | "created_at" | "last_login_at";
    sort_order?: "asc" | "desc";
}>;
export type User = z.infer<typeof userSchema>;
export type CreateUserInput = z.infer<typeof createUserInputSchema>;
export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;
export type SearchUserInput = z.infer<typeof searchUserInputSchema>;
export declare const addressSchema: z.ZodObject<{
    address_id: z.ZodString;
    user_id: z.ZodString;
    label: z.ZodString;
    address_line1: z.ZodString;
    address_line2: z.ZodNullable<z.ZodString>;
    city: z.ZodString;
    postal_code: z.ZodString;
    delivery_instructions: z.ZodNullable<z.ZodString>;
    is_default: z.ZodBoolean;
    latitude: z.ZodNullable<z.ZodNumber>;
    longitude: z.ZodNullable<z.ZodNumber>;
    created_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    user_id?: string;
    created_at?: string;
    address_id?: string;
    label?: string;
    address_line1?: string;
    address_line2?: string;
    city?: string;
    postal_code?: string;
    delivery_instructions?: string;
    is_default?: boolean;
    latitude?: number;
    longitude?: number;
}, {
    user_id?: string;
    created_at?: string;
    address_id?: string;
    label?: string;
    address_line1?: string;
    address_line2?: string;
    city?: string;
    postal_code?: string;
    delivery_instructions?: string;
    is_default?: boolean;
    latitude?: number;
    longitude?: number;
}>;
export declare const createAddressInputSchema: z.ZodObject<{
    user_id: z.ZodString;
    label: z.ZodString;
    address_line1: z.ZodString;
    address_line2: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    city: z.ZodDefault<z.ZodString>;
    postal_code: z.ZodString;
    delivery_instructions: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    is_default: z.ZodDefault<z.ZodBoolean>;
    latitude: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    longitude: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    user_id?: string;
    label?: string;
    address_line1?: string;
    address_line2?: string;
    city?: string;
    postal_code?: string;
    delivery_instructions?: string;
    is_default?: boolean;
    latitude?: number;
    longitude?: number;
}, {
    user_id?: string;
    label?: string;
    address_line1?: string;
    address_line2?: string;
    city?: string;
    postal_code?: string;
    delivery_instructions?: string;
    is_default?: boolean;
    latitude?: number;
    longitude?: number;
}>;
export declare const updateAddressInputSchema: z.ZodObject<{
    address_id: z.ZodString;
    label: z.ZodOptional<z.ZodString>;
    address_line1: z.ZodOptional<z.ZodString>;
    address_line2: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    city: z.ZodOptional<z.ZodString>;
    postal_code: z.ZodOptional<z.ZodString>;
    delivery_instructions: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    is_default: z.ZodOptional<z.ZodBoolean>;
    latitude: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    longitude: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    address_id?: string;
    label?: string;
    address_line1?: string;
    address_line2?: string;
    city?: string;
    postal_code?: string;
    delivery_instructions?: string;
    is_default?: boolean;
    latitude?: number;
    longitude?: number;
}, {
    address_id?: string;
    label?: string;
    address_line1?: string;
    address_line2?: string;
    city?: string;
    postal_code?: string;
    delivery_instructions?: string;
    is_default?: boolean;
    latitude?: number;
    longitude?: number;
}>;
export declare const searchAddressInputSchema: z.ZodObject<{
    user_id: z.ZodOptional<z.ZodString>;
    city: z.ZodOptional<z.ZodString>;
    is_default: z.ZodOptional<z.ZodBoolean>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    user_id?: string;
    limit?: number;
    offset?: number;
    city?: string;
    is_default?: boolean;
}, {
    user_id?: string;
    limit?: number;
    offset?: number;
    city?: string;
    is_default?: boolean;
}>;
export type Address = z.infer<typeof addressSchema>;
export type CreateAddressInput = z.infer<typeof createAddressInputSchema>;
export type UpdateAddressInput = z.infer<typeof updateAddressInputSchema>;
export type SearchAddressInput = z.infer<typeof searchAddressInputSchema>;
export declare const paymentMethodSchema: z.ZodObject<{
    payment_method_id: z.ZodString;
    user_id: z.ZodString;
    sumup_token: z.ZodString;
    card_type: z.ZodString;
    last_four_digits: z.ZodString;
    expiry_month: z.ZodString;
    expiry_year: z.ZodString;
    cardholder_name: z.ZodString;
    is_default: z.ZodBoolean;
    created_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    user_id?: string;
    created_at?: string;
    is_default?: boolean;
    payment_method_id?: string;
    sumup_token?: string;
    card_type?: string;
    last_four_digits?: string;
    expiry_month?: string;
    expiry_year?: string;
    cardholder_name?: string;
}, {
    user_id?: string;
    created_at?: string;
    is_default?: boolean;
    payment_method_id?: string;
    sumup_token?: string;
    card_type?: string;
    last_four_digits?: string;
    expiry_month?: string;
    expiry_year?: string;
    cardholder_name?: string;
}>;
export declare const createPaymentMethodInputSchema: z.ZodObject<{
    user_id: z.ZodString;
    sumup_token: z.ZodString;
    card_type: z.ZodEnum<["Visa", "Mastercard", "Amex", "Discover"]>;
    last_four_digits: z.ZodString;
    expiry_month: z.ZodString;
    expiry_year: z.ZodString;
    cardholder_name: z.ZodString;
    is_default: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    user_id?: string;
    is_default?: boolean;
    sumup_token?: string;
    card_type?: "Visa" | "Mastercard" | "Amex" | "Discover";
    last_four_digits?: string;
    expiry_month?: string;
    expiry_year?: string;
    cardholder_name?: string;
}, {
    user_id?: string;
    is_default?: boolean;
    sumup_token?: string;
    card_type?: "Visa" | "Mastercard" | "Amex" | "Discover";
    last_four_digits?: string;
    expiry_month?: string;
    expiry_year?: string;
    cardholder_name?: string;
}>;
export declare const updatePaymentMethodInputSchema: z.ZodObject<{
    payment_method_id: z.ZodString;
    expiry_month: z.ZodOptional<z.ZodString>;
    expiry_year: z.ZodOptional<z.ZodString>;
    is_default: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    is_default?: boolean;
    payment_method_id?: string;
    expiry_month?: string;
    expiry_year?: string;
}, {
    is_default?: boolean;
    payment_method_id?: string;
    expiry_month?: string;
    expiry_year?: string;
}>;
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;
export type CreatePaymentMethodInput = z.infer<typeof createPaymentMethodInputSchema>;
export type UpdatePaymentMethodInput = z.infer<typeof updatePaymentMethodInputSchema>;
export declare const passwordResetSchema: z.ZodObject<{
    reset_id: z.ZodString;
    user_id: z.ZodString;
    reset_token: z.ZodString;
    created_at: z.ZodString;
    expires_at: z.ZodString;
    used: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    user_id?: string;
    created_at?: string;
    reset_id?: string;
    reset_token?: string;
    expires_at?: string;
    used?: boolean;
}, {
    user_id?: string;
    created_at?: string;
    reset_id?: string;
    reset_token?: string;
    expires_at?: string;
    used?: boolean;
}>;
export declare const createPasswordResetInputSchema: z.ZodObject<{
    user_id: z.ZodString;
    reset_token: z.ZodString;
    expires_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    user_id?: string;
    reset_token?: string;
    expires_at?: string;
}, {
    user_id?: string;
    reset_token?: string;
    expires_at?: string;
}>;
export declare const verifyPasswordResetInputSchema: z.ZodObject<{
    reset_token: z.ZodString;
    new_password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reset_token?: string;
    new_password?: string;
}, {
    reset_token?: string;
    new_password?: string;
}>;
export type PasswordReset = z.infer<typeof passwordResetSchema>;
export type CreatePasswordResetInput = z.infer<typeof createPasswordResetInputSchema>;
export type VerifyPasswordResetInput = z.infer<typeof verifyPasswordResetInputSchema>;
export declare const emailVerificationSchema: z.ZodObject<{
    verification_id: z.ZodString;
    user_id: z.ZodString;
    verification_token: z.ZodString;
    created_at: z.ZodString;
    expires_at: z.ZodString;
    verified_at: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    user_id?: string;
    created_at?: string;
    expires_at?: string;
    verification_id?: string;
    verification_token?: string;
    verified_at?: string;
}, {
    user_id?: string;
    created_at?: string;
    expires_at?: string;
    verification_id?: string;
    verification_token?: string;
    verified_at?: string;
}>;
export declare const createEmailVerificationInputSchema: z.ZodObject<{
    user_id: z.ZodString;
    verification_token: z.ZodString;
    expires_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    user_id?: string;
    expires_at?: string;
    verification_token?: string;
}, {
    user_id?: string;
    expires_at?: string;
    verification_token?: string;
}>;
export declare const verifyEmailInputSchema: z.ZodObject<{
    verification_token: z.ZodString;
}, "strip", z.ZodTypeAny, {
    verification_token?: string;
}, {
    verification_token?: string;
}>;
export type EmailVerification = z.infer<typeof emailVerificationSchema>;
export type CreateEmailVerificationInput = z.infer<typeof createEmailVerificationInputSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailInputSchema>;
export declare const newsletterSubscriberSchema: z.ZodObject<{
    subscriber_id: z.ZodString;
    email: z.ZodString;
    subscribed_at: z.ZodString;
    status: z.ZodString;
    user_id: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    user_id?: string;
    email?: string;
    status?: string;
    subscriber_id?: string;
    subscribed_at?: string;
}, {
    user_id?: string;
    email?: string;
    status?: string;
    subscriber_id?: string;
    subscribed_at?: string;
}>;
export declare const createNewsletterSubscriberInputSchema: z.ZodObject<{
    email: z.ZodString;
    user_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    user_id?: string;
    email?: string;
}, {
    user_id?: string;
    email?: string;
}>;
export declare const updateNewsletterSubscriberInputSchema: z.ZodObject<{
    subscriber_id: z.ZodString;
    status: z.ZodEnum<["subscribed", "unsubscribed"]>;
}, "strip", z.ZodTypeAny, {
    status?: "subscribed" | "unsubscribed";
    subscriber_id?: string;
}, {
    status?: "subscribed" | "unsubscribed";
    subscriber_id?: string;
}>;
export declare const searchNewsletterSubscriberInputSchema: z.ZodObject<{
    status: z.ZodOptional<z.ZodEnum<["subscribed", "unsubscribed"]>>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    status?: "subscribed" | "unsubscribed";
    limit?: number;
    offset?: number;
}, {
    status?: "subscribed" | "unsubscribed";
    limit?: number;
    offset?: number;
}>;
export type NewsletterSubscriber = z.infer<typeof newsletterSubscriberSchema>;
export type CreateNewsletterSubscriberInput = z.infer<typeof createNewsletterSubscriberInputSchema>;
export type UpdateNewsletterSubscriberInput = z.infer<typeof updateNewsletterSubscriberInputSchema>;
export type SearchNewsletterSubscriberInput = z.infer<typeof searchNewsletterSubscriberInputSchema>;
export declare const categorySchema: z.ZodObject<{
    category_id: z.ZodString;
    name: z.ZodString;
    description: z.ZodNullable<z.ZodString>;
    sort_order: z.ZodNumber;
    created_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    created_at?: string;
    sort_order?: number;
    category_id?: string;
    name?: string;
    description?: string;
}, {
    created_at?: string;
    sort_order?: number;
    category_id?: string;
    name?: string;
    description?: string;
}>;
export declare const createCategoryInputSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    sort_order: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    sort_order?: number;
    name?: string;
    description?: string;
}, {
    sort_order?: number;
    name?: string;
    description?: string;
}>;
export declare const updateCategoryInputSchema: z.ZodObject<{
    category_id: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    sort_order: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    sort_order?: number;
    category_id?: string;
    name?: string;
    description?: string;
}, {
    sort_order?: number;
    category_id?: string;
    name?: string;
    description?: string;
}>;
export declare const searchCategoryInputSchema: z.ZodObject<{
    query: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
    sort_by: z.ZodDefault<z.ZodEnum<["name", "sort_order", "created_at"]>>;
    sort_order: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    query?: string;
    limit?: number;
    offset?: number;
    sort_by?: "created_at" | "sort_order" | "name";
    sort_order?: "asc" | "desc";
}, {
    query?: string;
    limit?: number;
    offset?: number;
    sort_by?: "created_at" | "sort_order" | "name";
    sort_order?: "asc" | "desc";
}>;
export type Category = z.infer<typeof categorySchema>;
export type CreateCategoryInput = z.infer<typeof createCategoryInputSchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategoryInputSchema>;
export type SearchCategoryInput = z.infer<typeof searchCategoryInputSchema>;
export declare const menuItemSchema: z.ZodObject<{
    item_id: z.ZodString;
    name: z.ZodString;
    description: z.ZodNullable<z.ZodString>;
    category_id: z.ZodString;
    price: z.ZodNumber;
    image_url: z.ZodNullable<z.ZodString>;
    image_urls: z.ZodNullable<z.ZodArray<z.ZodString, "many">>;
    dietary_tags: z.ZodNullable<z.ZodArray<z.ZodString, "many">>;
    is_limited_edition: z.ZodBoolean;
    limited_edition_end_date: z.ZodNullable<z.ZodString>;
    is_active: z.ZodBoolean;
    available_for_collection: z.ZodBoolean;
    available_for_delivery: z.ZodBoolean;
    stock_tracked: z.ZodBoolean;
    current_stock: z.ZodNullable<z.ZodNumber>;
    low_stock_threshold: z.ZodNullable<z.ZodNumber>;
    sort_order: z.ZodNumber;
    is_featured: z.ZodBoolean;
    meta_description: z.ZodNullable<z.ZodString>;
    image_alt_text: z.ZodNullable<z.ZodString>;
    created_at: z.ZodString;
    updated_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    created_at?: string;
    sort_order?: number;
    category_id?: string;
    name?: string;
    description?: string;
    item_id?: string;
    price?: number;
    image_url?: string;
    image_urls?: string[];
    dietary_tags?: string[];
    is_limited_edition?: boolean;
    limited_edition_end_date?: string;
    is_active?: boolean;
    available_for_collection?: boolean;
    available_for_delivery?: boolean;
    stock_tracked?: boolean;
    current_stock?: number;
    low_stock_threshold?: number;
    is_featured?: boolean;
    meta_description?: string;
    image_alt_text?: string;
    updated_at?: string;
}, {
    created_at?: string;
    sort_order?: number;
    category_id?: string;
    name?: string;
    description?: string;
    item_id?: string;
    price?: number;
    image_url?: string;
    image_urls?: string[];
    dietary_tags?: string[];
    is_limited_edition?: boolean;
    limited_edition_end_date?: string;
    is_active?: boolean;
    available_for_collection?: boolean;
    available_for_delivery?: boolean;
    stock_tracked?: boolean;
    current_stock?: number;
    low_stock_threshold?: number;
    is_featured?: boolean;
    meta_description?: string;
    image_alt_text?: string;
    updated_at?: string;
}>;
export declare const createMenuItemInputSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    category_id: z.ZodString;
    price: z.ZodNumber;
    image_url: z.ZodOptional<z.ZodNullable<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">, z.ZodNull]>>>;
    image_urls: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>, "many">>>;
    dietary_tags: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString, "many">>>;
    is_limited_edition: z.ZodDefault<z.ZodBoolean>;
    limited_edition_end_date: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    is_active: z.ZodDefault<z.ZodBoolean>;
    available_for_collection: z.ZodDefault<z.ZodBoolean>;
    available_for_delivery: z.ZodDefault<z.ZodBoolean>;
    stock_tracked: z.ZodDefault<z.ZodBoolean>;
    current_stock: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    low_stock_threshold: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    sort_order: z.ZodDefault<z.ZodNumber>;
    is_featured: z.ZodDefault<z.ZodBoolean>;
    meta_description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    image_alt_text: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    sort_order?: number;
    category_id?: string;
    name?: string;
    description?: string;
    price?: number;
    image_url?: string;
    image_urls?: string[];
    dietary_tags?: string[];
    is_limited_edition?: boolean;
    limited_edition_end_date?: string;
    is_active?: boolean;
    available_for_collection?: boolean;
    available_for_delivery?: boolean;
    stock_tracked?: boolean;
    current_stock?: number;
    low_stock_threshold?: number;
    is_featured?: boolean;
    meta_description?: string;
    image_alt_text?: string;
}, {
    sort_order?: number;
    category_id?: string;
    name?: string;
    description?: string;
    price?: number;
    image_url?: string;
    image_urls?: string[];
    dietary_tags?: string[];
    is_limited_edition?: boolean;
    limited_edition_end_date?: string;
    is_active?: boolean;
    available_for_collection?: boolean;
    available_for_delivery?: boolean;
    stock_tracked?: boolean;
    current_stock?: number;
    low_stock_threshold?: number;
    is_featured?: boolean;
    meta_description?: string;
    image_alt_text?: string;
}>;
export declare const updateMenuItemInputSchema: z.ZodObject<{
    item_id: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    category_id: z.ZodOptional<z.ZodString>;
    price: z.ZodOptional<z.ZodNumber>;
    image_url: z.ZodOptional<z.ZodNullable<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>>;
    image_urls: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>, "many">>>;
    dietary_tags: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString, "many">>>;
    is_limited_edition: z.ZodOptional<z.ZodBoolean>;
    limited_edition_end_date: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    is_active: z.ZodOptional<z.ZodBoolean>;
    available_for_collection: z.ZodOptional<z.ZodBoolean>;
    available_for_delivery: z.ZodOptional<z.ZodBoolean>;
    stock_tracked: z.ZodOptional<z.ZodBoolean>;
    current_stock: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    low_stock_threshold: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    sort_order: z.ZodOptional<z.ZodNumber>;
    is_featured: z.ZodOptional<z.ZodBoolean>;
    meta_description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    image_alt_text: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    sort_order?: number;
    category_id?: string;
    name?: string;
    description?: string;
    item_id?: string;
    price?: number;
    image_url?: string;
    image_urls?: string[];
    dietary_tags?: string[];
    is_limited_edition?: boolean;
    limited_edition_end_date?: string;
    is_active?: boolean;
    available_for_collection?: boolean;
    available_for_delivery?: boolean;
    stock_tracked?: boolean;
    current_stock?: number;
    low_stock_threshold?: number;
    is_featured?: boolean;
    meta_description?: string;
    image_alt_text?: string;
}, {
    sort_order?: number;
    category_id?: string;
    name?: string;
    description?: string;
    item_id?: string;
    price?: number;
    image_url?: string;
    image_urls?: string[];
    dietary_tags?: string[];
    is_limited_edition?: boolean;
    limited_edition_end_date?: string;
    is_active?: boolean;
    available_for_collection?: boolean;
    available_for_delivery?: boolean;
    stock_tracked?: boolean;
    current_stock?: number;
    low_stock_threshold?: number;
    is_featured?: boolean;
    meta_description?: string;
    image_alt_text?: string;
}>;
export declare const searchMenuItemInputSchema: z.ZodObject<{
    query: z.ZodOptional<z.ZodString>;
    search: z.ZodOptional<z.ZodString>;
    category_id: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodString>;
    is_active: z.ZodOptional<z.ZodBoolean>;
    is_featured: z.ZodOptional<z.ZodBoolean>;
    is_limited_edition: z.ZodOptional<z.ZodBoolean>;
    available_for_collection: z.ZodOptional<z.ZodBoolean>;
    available_for_delivery: z.ZodOptional<z.ZodBoolean>;
    dietary_tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    dietary_filters: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
    min_price: z.ZodOptional<z.ZodNumber>;
    max_price: z.ZodOptional<z.ZodNumber>;
    in_stock: z.ZodOptional<z.ZodBoolean>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
    sort_by: z.ZodDefault<z.ZodEnum<["name", "price", "sort_order", "created_at"]>>;
    sort_order: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    query?: string;
    limit?: number;
    offset?: number;
    sort_by?: "created_at" | "sort_order" | "name" | "price";
    sort_order?: "asc" | "desc";
    category_id?: string;
    dietary_tags?: string[];
    is_limited_edition?: boolean;
    is_active?: boolean;
    available_for_collection?: boolean;
    available_for_delivery?: boolean;
    is_featured?: boolean;
    search?: string;
    category?: string;
    dietary_filters?: string | string[];
    min_price?: number;
    max_price?: number;
    in_stock?: boolean;
}, {
    query?: string;
    limit?: number;
    offset?: number;
    sort_by?: "created_at" | "sort_order" | "name" | "price";
    sort_order?: "asc" | "desc";
    category_id?: string;
    dietary_tags?: string[];
    is_limited_edition?: boolean;
    is_active?: boolean;
    available_for_collection?: boolean;
    available_for_delivery?: boolean;
    is_featured?: boolean;
    search?: string;
    category?: string;
    dietary_filters?: string | string[];
    min_price?: number;
    max_price?: number;
    in_stock?: boolean;
}>;
export type MenuItem = z.infer<typeof menuItemSchema>;
export type CreateMenuItemInput = z.infer<typeof createMenuItemInputSchema>;
export type UpdateMenuItemInput = z.infer<typeof updateMenuItemInputSchema>;
export type SearchMenuItemInput = z.infer<typeof searchMenuItemInputSchema>;
export declare const customizationGroupSchema: z.ZodObject<{
    group_id: z.ZodString;
    item_id: z.ZodString;
    name: z.ZodString;
    type: z.ZodString;
    is_required: z.ZodBoolean;
    sort_order: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type?: string;
    sort_order?: number;
    name?: string;
    item_id?: string;
    group_id?: string;
    is_required?: boolean;
}, {
    type?: string;
    sort_order?: number;
    name?: string;
    item_id?: string;
    group_id?: string;
    is_required?: boolean;
}>;
export declare const createCustomizationGroupInputSchema: z.ZodObject<{
    item_id: z.ZodString;
    name: z.ZodString;
    type: z.ZodEnum<["single", "multiple"]>;
    is_required: z.ZodDefault<z.ZodBoolean>;
    sort_order: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type?: "single" | "multiple";
    sort_order?: number;
    name?: string;
    item_id?: string;
    is_required?: boolean;
}, {
    type?: "single" | "multiple";
    sort_order?: number;
    name?: string;
    item_id?: string;
    is_required?: boolean;
}>;
export declare const updateCustomizationGroupInputSchema: z.ZodObject<{
    group_id: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodEnum<["single", "multiple"]>>;
    is_required: z.ZodOptional<z.ZodBoolean>;
    sort_order: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type?: "single" | "multiple";
    sort_order?: number;
    name?: string;
    group_id?: string;
    is_required?: boolean;
}, {
    type?: "single" | "multiple";
    sort_order?: number;
    name?: string;
    group_id?: string;
    is_required?: boolean;
}>;
export type CustomizationGroup = z.infer<typeof customizationGroupSchema>;
export type CreateCustomizationGroupInput = z.infer<typeof createCustomizationGroupInputSchema>;
export type UpdateCustomizationGroupInput = z.infer<typeof updateCustomizationGroupInputSchema>;
export declare const customizationOptionSchema: z.ZodObject<{
    option_id: z.ZodString;
    group_id: z.ZodString;
    name: z.ZodString;
    additional_price: z.ZodNumber;
    is_default: z.ZodBoolean;
    sort_order: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    sort_order?: number;
    is_default?: boolean;
    name?: string;
    group_id?: string;
    option_id?: string;
    additional_price?: number;
}, {
    sort_order?: number;
    is_default?: boolean;
    name?: string;
    group_id?: string;
    option_id?: string;
    additional_price?: number;
}>;
export declare const createCustomizationOptionInputSchema: z.ZodObject<{
    group_id: z.ZodString;
    name: z.ZodString;
    additional_price: z.ZodDefault<z.ZodNumber>;
    is_default: z.ZodDefault<z.ZodBoolean>;
    sort_order: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    sort_order?: number;
    is_default?: boolean;
    name?: string;
    group_id?: string;
    additional_price?: number;
}, {
    sort_order?: number;
    is_default?: boolean;
    name?: string;
    group_id?: string;
    additional_price?: number;
}>;
export declare const updateCustomizationOptionInputSchema: z.ZodObject<{
    option_id: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    additional_price: z.ZodOptional<z.ZodNumber>;
    is_default: z.ZodOptional<z.ZodBoolean>;
    sort_order: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    sort_order?: number;
    is_default?: boolean;
    name?: string;
    option_id?: string;
    additional_price?: number;
}, {
    sort_order?: number;
    is_default?: boolean;
    name?: string;
    option_id?: string;
    additional_price?: number;
}>;
export type CustomizationOption = z.infer<typeof customizationOptionSchema>;
export type CreateCustomizationOptionInput = z.infer<typeof createCustomizationOptionInputSchema>;
export type UpdateCustomizationOptionInput = z.infer<typeof updateCustomizationOptionInputSchema>;
export declare const orderSchema: z.ZodObject<{
    order_id: z.ZodString;
    order_number: z.ZodString;
    user_id: z.ZodString;
    order_type: z.ZodString;
    status: z.ZodString;
    collection_time_slot: z.ZodNullable<z.ZodString>;
    delivery_address_id: z.ZodNullable<z.ZodString>;
    delivery_address_snapshot: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    delivery_fee: z.ZodNullable<z.ZodNumber>;
    estimated_delivery_time: z.ZodNullable<z.ZodString>;
    subtotal: z.ZodNumber;
    discount_code: z.ZodNullable<z.ZodString>;
    discount_amount: z.ZodNumber;
    tax_amount: z.ZodNumber;
    total_amount: z.ZodNumber;
    payment_status: z.ZodString;
    payment_method_id: z.ZodNullable<z.ZodString>;
    payment_method_type: z.ZodNullable<z.ZodString>;
    sumup_transaction_id: z.ZodNullable<z.ZodString>;
    invoice_url: z.ZodNullable<z.ZodString>;
    loyalty_points_awarded: z.ZodNumber;
    special_instructions: z.ZodNullable<z.ZodString>;
    customer_name: z.ZodString;
    customer_email: z.ZodString;
    customer_phone: z.ZodString;
    created_at: z.ZodString;
    updated_at: z.ZodString;
    completed_at: z.ZodNullable<z.ZodString>;
    cancelled_at: z.ZodNullable<z.ZodString>;
    cancellation_reason: z.ZodNullable<z.ZodString>;
    refund_amount: z.ZodNullable<z.ZodNumber>;
    refund_reason: z.ZodNullable<z.ZodString>;
    refunded_at: z.ZodNullable<z.ZodString>;
    internal_notes: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    user_id?: string;
    status?: string;
    created_at?: string;
    payment_method_id?: string;
    updated_at?: string;
    order_id?: string;
    order_number?: string;
    order_type?: string;
    collection_time_slot?: string;
    delivery_address_id?: string;
    delivery_address_snapshot?: Record<string, unknown>;
    delivery_fee?: number;
    estimated_delivery_time?: string;
    subtotal?: number;
    discount_code?: string;
    discount_amount?: number;
    tax_amount?: number;
    total_amount?: number;
    payment_status?: string;
    payment_method_type?: string;
    sumup_transaction_id?: string;
    invoice_url?: string;
    loyalty_points_awarded?: number;
    special_instructions?: string;
    customer_name?: string;
    customer_email?: string;
    customer_phone?: string;
    completed_at?: string;
    cancelled_at?: string;
    cancellation_reason?: string;
    refund_amount?: number;
    refund_reason?: string;
    refunded_at?: string;
    internal_notes?: string;
}, {
    user_id?: string;
    status?: string;
    created_at?: string;
    payment_method_id?: string;
    updated_at?: string;
    order_id?: string;
    order_number?: string;
    order_type?: string;
    collection_time_slot?: string;
    delivery_address_id?: string;
    delivery_address_snapshot?: Record<string, unknown>;
    delivery_fee?: number;
    estimated_delivery_time?: string;
    subtotal?: number;
    discount_code?: string;
    discount_amount?: number;
    tax_amount?: number;
    total_amount?: number;
    payment_status?: string;
    payment_method_type?: string;
    sumup_transaction_id?: string;
    invoice_url?: string;
    loyalty_points_awarded?: number;
    special_instructions?: string;
    customer_name?: string;
    customer_email?: string;
    customer_phone?: string;
    completed_at?: string;
    cancelled_at?: string;
    cancellation_reason?: string;
    refund_amount?: number;
    refund_reason?: string;
    refunded_at?: string;
    internal_notes?: string;
}>;
export declare const createOrderInputSchema: z.ZodObject<{
    user_id: z.ZodString;
    order_type: z.ZodEnum<["collection", "delivery"]>;
    collection_time_slot: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    delivery_address_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    delivery_fee: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    discount_code: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    special_instructions: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    customer_name: z.ZodString;
    customer_email: z.ZodString;
    customer_phone: z.ZodString;
    payment_method_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    user_id?: string;
    payment_method_id?: string;
    order_type?: "collection" | "delivery";
    collection_time_slot?: string;
    delivery_address_id?: string;
    delivery_fee?: number;
    discount_code?: string;
    special_instructions?: string;
    customer_name?: string;
    customer_email?: string;
    customer_phone?: string;
}, {
    user_id?: string;
    payment_method_id?: string;
    order_type?: "collection" | "delivery";
    collection_time_slot?: string;
    delivery_address_id?: string;
    delivery_fee?: number;
    discount_code?: string;
    special_instructions?: string;
    customer_name?: string;
    customer_email?: string;
    customer_phone?: string;
}>;
export declare const updateOrderInputSchema: z.ZodObject<{
    order_id: z.ZodString;
    status: z.ZodOptional<z.ZodEnum<["received", "preparing", "ready", "out_for_delivery", "completed", "cancelled"]>>;
    collection_time_slot: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    estimated_delivery_time: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    special_instructions: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    cancellation_reason: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    refund_amount: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    refund_reason: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    internal_notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    status?: "received" | "preparing" | "ready" | "out_for_delivery" | "completed" | "cancelled";
    order_id?: string;
    collection_time_slot?: string;
    estimated_delivery_time?: string;
    special_instructions?: string;
    cancellation_reason?: string;
    refund_amount?: number;
    refund_reason?: string;
    internal_notes?: string;
}, {
    status?: "received" | "preparing" | "ready" | "out_for_delivery" | "completed" | "cancelled";
    order_id?: string;
    collection_time_slot?: string;
    estimated_delivery_time?: string;
    special_instructions?: string;
    cancellation_reason?: string;
    refund_amount?: number;
    refund_reason?: string;
    internal_notes?: string;
}>;
export declare const searchOrderInputSchema: z.ZodObject<{
    query: z.ZodOptional<z.ZodString>;
    user_id: z.ZodOptional<z.ZodString>;
    order_type: z.ZodOptional<z.ZodEnum<["collection", "delivery"]>>;
    status: z.ZodOptional<z.ZodEnum<["received", "preparing", "ready", "out_for_delivery", "completed", "cancelled"]>>;
    payment_status: z.ZodOptional<z.ZodEnum<["pending", "paid", "failed", "refunded"]>>;
    date_from: z.ZodOptional<z.ZodString>;
    date_to: z.ZodOptional<z.ZodString>;
    min_amount: z.ZodOptional<z.ZodNumber>;
    max_amount: z.ZodOptional<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
    sort_by: z.ZodDefault<z.ZodEnum<["created_at", "updated_at", "total_amount", "order_number"]>>;
    sort_order: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    user_id?: string;
    status?: "received" | "preparing" | "ready" | "out_for_delivery" | "completed" | "cancelled";
    query?: string;
    limit?: number;
    offset?: number;
    sort_by?: "created_at" | "updated_at" | "order_number" | "total_amount";
    sort_order?: "asc" | "desc";
    order_type?: "collection" | "delivery";
    payment_status?: "pending" | "paid" | "failed" | "refunded";
    date_from?: string;
    date_to?: string;
    min_amount?: number;
    max_amount?: number;
}, {
    user_id?: string;
    status?: "received" | "preparing" | "ready" | "out_for_delivery" | "completed" | "cancelled";
    query?: string;
    limit?: number;
    offset?: number;
    sort_by?: "created_at" | "updated_at" | "order_number" | "total_amount";
    sort_order?: "asc" | "desc";
    order_type?: "collection" | "delivery";
    payment_status?: "pending" | "paid" | "failed" | "refunded";
    date_from?: string;
    date_to?: string;
    min_amount?: number;
    max_amount?: number;
}>;
export type Order = z.infer<typeof orderSchema>;
export type CreateOrderInput = z.infer<typeof createOrderInputSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderInputSchema>;
export type SearchOrderInput = z.infer<typeof searchOrderInputSchema>;
export declare const orderItemSchema: z.ZodObject<{
    order_item_id: z.ZodString;
    order_id: z.ZodString;
    item_id: z.ZodString;
    item_name: z.ZodString;
    quantity: z.ZodNumber;
    unit_price: z.ZodNumber;
    selected_customizations: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    line_total: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    item_id?: string;
    order_id?: string;
    order_item_id?: string;
    item_name?: string;
    quantity?: number;
    unit_price?: number;
    selected_customizations?: Record<string, unknown>;
    line_total?: number;
}, {
    item_id?: string;
    order_id?: string;
    order_item_id?: string;
    item_name?: string;
    quantity?: number;
    unit_price?: number;
    selected_customizations?: Record<string, unknown>;
    line_total?: number;
}>;
export declare const createOrderItemInputSchema: z.ZodObject<{
    order_id: z.ZodString;
    item_id: z.ZodString;
    item_name: z.ZodString;
    quantity: z.ZodNumber;
    unit_price: z.ZodNumber;
    selected_customizations: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    line_total: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    item_id?: string;
    order_id?: string;
    item_name?: string;
    quantity?: number;
    unit_price?: number;
    selected_customizations?: Record<string, unknown>;
    line_total?: number;
}, {
    item_id?: string;
    order_id?: string;
    item_name?: string;
    quantity?: number;
    unit_price?: number;
    selected_customizations?: Record<string, unknown>;
    line_total?: number;
}>;
export type OrderItem = z.infer<typeof orderItemSchema>;
export type CreateOrderItemInput = z.infer<typeof createOrderItemInputSchema>;
export declare const orderStatusHistorySchema: z.ZodObject<{
    history_id: z.ZodString;
    order_id: z.ZodString;
    status: z.ZodString;
    changed_by_user_id: z.ZodString;
    changed_at: z.ZodString;
    notes: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status?: string;
    order_id?: string;
    history_id?: string;
    changed_by_user_id?: string;
    changed_at?: string;
    notes?: string;
}, {
    status?: string;
    order_id?: string;
    history_id?: string;
    changed_by_user_id?: string;
    changed_at?: string;
    notes?: string;
}>;
export declare const createOrderStatusHistoryInputSchema: z.ZodObject<{
    order_id: z.ZodString;
    status: z.ZodEnum<["received", "preparing", "ready", "out_for_delivery", "completed", "cancelled"]>;
    changed_by_user_id: z.ZodString;
    notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    status?: "received" | "preparing" | "ready" | "out_for_delivery" | "completed" | "cancelled";
    order_id?: string;
    changed_by_user_id?: string;
    notes?: string;
}, {
    status?: "received" | "preparing" | "ready" | "out_for_delivery" | "completed" | "cancelled";
    order_id?: string;
    changed_by_user_id?: string;
    notes?: string;
}>;
export type OrderStatusHistory = z.infer<typeof orderStatusHistorySchema>;
export type CreateOrderStatusHistoryInput = z.infer<typeof createOrderStatusHistoryInputSchema>;
export declare const stockHistorySchema: z.ZodObject<{
    history_id: z.ZodString;
    item_id: z.ZodString;
    change_type: z.ZodString;
    previous_stock: z.ZodNumber;
    new_stock: z.ZodNumber;
    quantity_changed: z.ZodNumber;
    reason: z.ZodNullable<z.ZodString>;
    notes: z.ZodNullable<z.ZodString>;
    changed_by_user_id: z.ZodString;
    changed_at: z.ZodString;
    related_order_id: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    item_id?: string;
    history_id?: string;
    changed_by_user_id?: string;
    changed_at?: string;
    notes?: string;
    change_type?: string;
    previous_stock?: number;
    new_stock?: number;
    quantity_changed?: number;
    reason?: string;
    related_order_id?: string;
}, {
    item_id?: string;
    history_id?: string;
    changed_by_user_id?: string;
    changed_at?: string;
    notes?: string;
    change_type?: string;
    previous_stock?: number;
    new_stock?: number;
    quantity_changed?: number;
    reason?: string;
    related_order_id?: string;
}>;
export declare const createStockHistoryInputSchema: z.ZodObject<{
    item_id: z.ZodString;
    change_type: z.ZodEnum<["restock", "sale", "adjustment", "waste"]>;
    previous_stock: z.ZodNumber;
    new_stock: z.ZodNumber;
    quantity_changed: z.ZodNumber;
    reason: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    changed_by_user_id: z.ZodString;
    related_order_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    item_id?: string;
    changed_by_user_id?: string;
    notes?: string;
    change_type?: "restock" | "sale" | "adjustment" | "waste";
    previous_stock?: number;
    new_stock?: number;
    quantity_changed?: number;
    reason?: string;
    related_order_id?: string;
}, {
    item_id?: string;
    changed_by_user_id?: string;
    notes?: string;
    change_type?: "restock" | "sale" | "adjustment" | "waste";
    previous_stock?: number;
    new_stock?: number;
    quantity_changed?: number;
    reason?: string;
    related_order_id?: string;
}>;
export declare const searchStockHistoryInputSchema: z.ZodObject<{
    item_id: z.ZodOptional<z.ZodString>;
    change_type: z.ZodOptional<z.ZodEnum<["restock", "sale", "adjustment", "waste"]>>;
    date_from: z.ZodOptional<z.ZodString>;
    date_to: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
    sort_by: z.ZodDefault<z.ZodEnum<["changed_at"]>>;
    sort_order: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    limit?: number;
    offset?: number;
    sort_by?: "changed_at";
    sort_order?: "asc" | "desc";
    item_id?: string;
    date_from?: string;
    date_to?: string;
    change_type?: "restock" | "sale" | "adjustment" | "waste";
}, {
    limit?: number;
    offset?: number;
    sort_by?: "changed_at";
    sort_order?: "asc" | "desc";
    item_id?: string;
    date_from?: string;
    date_to?: string;
    change_type?: "restock" | "sale" | "adjustment" | "waste";
}>;
export type StockHistory = z.infer<typeof stockHistorySchema>;
export type CreateStockHistoryInput = z.infer<typeof createStockHistoryInputSchema>;
export type SearchStockHistoryInput = z.infer<typeof searchStockHistoryInputSchema>;
export declare const deliveryZoneSchema: z.ZodObject<{
    zone_id: z.ZodString;
    zone_name: z.ZodString;
    zone_type: z.ZodString;
    zone_boundaries: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    delivery_fee: z.ZodNumber;
    minimum_order_value: z.ZodNullable<z.ZodNumber>;
    estimated_delivery_time: z.ZodNumber;
    is_active: z.ZodBoolean;
    priority: z.ZodNumber;
    created_at: z.ZodString;
    updated_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    created_at?: string;
    is_active?: boolean;
    updated_at?: string;
    delivery_fee?: number;
    estimated_delivery_time?: number;
    zone_id?: string;
    zone_name?: string;
    zone_type?: string;
    zone_boundaries?: Record<string, unknown>;
    minimum_order_value?: number;
    priority?: number;
}, {
    created_at?: string;
    is_active?: boolean;
    updated_at?: string;
    delivery_fee?: number;
    estimated_delivery_time?: number;
    zone_id?: string;
    zone_name?: string;
    zone_type?: string;
    zone_boundaries?: Record<string, unknown>;
    minimum_order_value?: number;
    priority?: number;
}>;
export declare const createDeliveryZoneInputSchema: z.ZodObject<{
    zone_name: z.ZodString;
    zone_type: z.ZodEnum<["polygon", "radius", "postal_code"]>;
    zone_boundaries: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    delivery_fee: z.ZodNumber;
    minimum_order_value: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    estimated_delivery_time: z.ZodNumber;
    is_active: z.ZodDefault<z.ZodBoolean>;
    priority: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    is_active?: boolean;
    delivery_fee?: number;
    estimated_delivery_time?: number;
    zone_name?: string;
    zone_type?: "postal_code" | "polygon" | "radius";
    zone_boundaries?: Record<string, unknown>;
    minimum_order_value?: number;
    priority?: number;
}, {
    is_active?: boolean;
    delivery_fee?: number;
    estimated_delivery_time?: number;
    zone_name?: string;
    zone_type?: "postal_code" | "polygon" | "radius";
    zone_boundaries?: Record<string, unknown>;
    minimum_order_value?: number;
    priority?: number;
}>;
export declare const updateDeliveryZoneInputSchema: z.ZodObject<{
    zone_id: z.ZodString;
    zone_name: z.ZodOptional<z.ZodString>;
    zone_boundaries: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    delivery_fee: z.ZodOptional<z.ZodNumber>;
    minimum_order_value: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    estimated_delivery_time: z.ZodOptional<z.ZodNumber>;
    is_active: z.ZodOptional<z.ZodBoolean>;
    priority: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    is_active?: boolean;
    delivery_fee?: number;
    estimated_delivery_time?: number;
    zone_id?: string;
    zone_name?: string;
    zone_boundaries?: Record<string, unknown>;
    minimum_order_value?: number;
    priority?: number;
}, {
    is_active?: boolean;
    delivery_fee?: number;
    estimated_delivery_time?: number;
    zone_id?: string;
    zone_name?: string;
    zone_boundaries?: Record<string, unknown>;
    minimum_order_value?: number;
    priority?: number;
}>;
export type DeliveryZone = z.infer<typeof deliveryZoneSchema>;
export type CreateDeliveryZoneInput = z.infer<typeof createDeliveryZoneInputSchema>;
export type UpdateDeliveryZoneInput = z.infer<typeof updateDeliveryZoneInputSchema>;
export declare const discountCodeSchema: z.ZodObject<{
    code_id: z.ZodString;
    code: z.ZodString;
    discount_type: z.ZodString;
    discount_value: z.ZodNumber;
    applicable_order_types: z.ZodNullable<z.ZodArray<z.ZodString, "many">>;
    applicable_category_ids: z.ZodNullable<z.ZodArray<z.ZodString, "many">>;
    applicable_item_ids: z.ZodNullable<z.ZodArray<z.ZodString, "many">>;
    minimum_order_value: z.ZodNullable<z.ZodNumber>;
    total_usage_limit: z.ZodNullable<z.ZodNumber>;
    per_customer_usage_limit: z.ZodNullable<z.ZodNumber>;
    total_used_count: z.ZodNumber;
    valid_from: z.ZodString;
    valid_until: z.ZodNullable<z.ZodString>;
    status: z.ZodString;
    internal_notes: z.ZodNullable<z.ZodString>;
    created_at: z.ZodString;
    updated_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status?: string;
    created_at?: string;
    code?: string;
    updated_at?: string;
    internal_notes?: string;
    minimum_order_value?: number;
    code_id?: string;
    discount_type?: string;
    discount_value?: number;
    applicable_order_types?: string[];
    applicable_category_ids?: string[];
    applicable_item_ids?: string[];
    total_usage_limit?: number;
    per_customer_usage_limit?: number;
    total_used_count?: number;
    valid_from?: string;
    valid_until?: string;
}, {
    status?: string;
    created_at?: string;
    code?: string;
    updated_at?: string;
    internal_notes?: string;
    minimum_order_value?: number;
    code_id?: string;
    discount_type?: string;
    discount_value?: number;
    applicable_order_types?: string[];
    applicable_category_ids?: string[];
    applicable_item_ids?: string[];
    total_usage_limit?: number;
    per_customer_usage_limit?: number;
    total_used_count?: number;
    valid_from?: string;
    valid_until?: string;
}>;
export declare const createDiscountCodeInputSchema: z.ZodObject<{
    code: z.ZodString;
    discount_type: z.ZodEnum<["percentage", "fixed", "delivery_fee"]>;
    discount_value: z.ZodNumber;
    applicable_order_types: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodEnum<["collection", "delivery"]>, "many">>>;
    applicable_category_ids: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString, "many">>>;
    applicable_item_ids: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString, "many">>>;
    minimum_order_value: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    total_usage_limit: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    per_customer_usage_limit: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    valid_from: z.ZodString;
    valid_until: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    status: z.ZodDefault<z.ZodEnum<["active", "inactive", "expired"]>>;
    internal_notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    status?: "active" | "inactive" | "expired";
    code?: string;
    internal_notes?: string;
    minimum_order_value?: number;
    discount_type?: "delivery_fee" | "percentage" | "fixed";
    discount_value?: number;
    applicable_order_types?: ("collection" | "delivery")[];
    applicable_category_ids?: string[];
    applicable_item_ids?: string[];
    total_usage_limit?: number;
    per_customer_usage_limit?: number;
    valid_from?: string;
    valid_until?: string;
}, {
    status?: "active" | "inactive" | "expired";
    code?: string;
    internal_notes?: string;
    minimum_order_value?: number;
    discount_type?: "delivery_fee" | "percentage" | "fixed";
    discount_value?: number;
    applicable_order_types?: ("collection" | "delivery")[];
    applicable_category_ids?: string[];
    applicable_item_ids?: string[];
    total_usage_limit?: number;
    per_customer_usage_limit?: number;
    valid_from?: string;
    valid_until?: string;
}>;
export declare const updateDiscountCodeInputSchema: z.ZodObject<{
    code_id: z.ZodString;
    discount_value: z.ZodOptional<z.ZodNumber>;
    minimum_order_value: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    total_usage_limit: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    per_customer_usage_limit: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    valid_until: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    status: z.ZodOptional<z.ZodEnum<["active", "inactive", "expired"]>>;
    internal_notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    status?: "active" | "inactive" | "expired";
    internal_notes?: string;
    minimum_order_value?: number;
    code_id?: string;
    discount_value?: number;
    total_usage_limit?: number;
    per_customer_usage_limit?: number;
    valid_until?: string;
}, {
    status?: "active" | "inactive" | "expired";
    internal_notes?: string;
    minimum_order_value?: number;
    code_id?: string;
    discount_value?: number;
    total_usage_limit?: number;
    per_customer_usage_limit?: number;
    valid_until?: string;
}>;
export declare const validateDiscountCodeInputSchema: z.ZodObject<{
    code: z.ZodString;
    user_id: z.ZodString;
    order_type: z.ZodEnum<["collection", "delivery"]>;
    order_value: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    user_id?: string;
    code?: string;
    order_type?: "collection" | "delivery";
    order_value?: number;
}, {
    user_id?: string;
    code?: string;
    order_type?: "collection" | "delivery";
    order_value?: number;
}>;
export declare const searchDiscountCodeInputSchema: z.ZodObject<{
    query: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["active", "inactive", "expired"]>>;
    discount_type: z.ZodOptional<z.ZodEnum<["percentage", "fixed", "delivery_fee"]>>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
    sort_by: z.ZodDefault<z.ZodEnum<["created_at", "code", "valid_from"]>>;
    sort_order: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    status?: "active" | "inactive" | "expired";
    query?: string;
    limit?: number;
    offset?: number;
    sort_by?: "created_at" | "code" | "valid_from";
    sort_order?: "asc" | "desc";
    discount_type?: "delivery_fee" | "percentage" | "fixed";
}, {
    status?: "active" | "inactive" | "expired";
    query?: string;
    limit?: number;
    offset?: number;
    sort_by?: "created_at" | "code" | "valid_from";
    sort_order?: "asc" | "desc";
    discount_type?: "delivery_fee" | "percentage" | "fixed";
}>;
export type DiscountCode = z.infer<typeof discountCodeSchema>;
export type CreateDiscountCodeInput = z.infer<typeof createDiscountCodeInputSchema>;
export type UpdateDiscountCodeInput = z.infer<typeof updateDiscountCodeInputSchema>;
export type ValidateDiscountCodeInput = z.infer<typeof validateDiscountCodeInputSchema>;
export type SearchDiscountCodeInput = z.infer<typeof searchDiscountCodeInputSchema>;
export declare const discountUsageSchema: z.ZodObject<{
    usage_id: z.ZodString;
    code_id: z.ZodString;
    user_id: z.ZodString;
    order_id: z.ZodString;
    discount_amount_applied: z.ZodNumber;
    used_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    user_id?: string;
    order_id?: string;
    code_id?: string;
    usage_id?: string;
    discount_amount_applied?: number;
    used_at?: string;
}, {
    user_id?: string;
    order_id?: string;
    code_id?: string;
    usage_id?: string;
    discount_amount_applied?: number;
    used_at?: string;
}>;
export declare const createDiscountUsageInputSchema: z.ZodObject<{
    code_id: z.ZodString;
    user_id: z.ZodString;
    order_id: z.ZodString;
    discount_amount_applied: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    user_id?: string;
    order_id?: string;
    code_id?: string;
    discount_amount_applied?: number;
}, {
    user_id?: string;
    order_id?: string;
    code_id?: string;
    discount_amount_applied?: number;
}>;
export type DiscountUsage = z.infer<typeof discountUsageSchema>;
export type CreateDiscountUsageInput = z.infer<typeof createDiscountUsageInputSchema>;
export declare const loyaltyAccountSchema: z.ZodObject<{
    loyalty_account_id: z.ZodString;
    user_id: z.ZodString;
    current_points_balance: z.ZodNumber;
    total_points_earned: z.ZodNumber;
    total_points_redeemed: z.ZodNumber;
    total_points_expired: z.ZodNumber;
    referral_count: z.ZodNumber;
    spin_wheel_available_count: z.ZodNumber;
    next_spin_available_at: z.ZodNullable<z.ZodString>;
    created_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    user_id?: string;
    created_at?: string;
    loyalty_account_id?: string;
    current_points_balance?: number;
    total_points_earned?: number;
    total_points_redeemed?: number;
    total_points_expired?: number;
    referral_count?: number;
    spin_wheel_available_count?: number;
    next_spin_available_at?: string;
}, {
    user_id?: string;
    created_at?: string;
    loyalty_account_id?: string;
    current_points_balance?: number;
    total_points_earned?: number;
    total_points_redeemed?: number;
    total_points_expired?: number;
    referral_count?: number;
    spin_wheel_available_count?: number;
    next_spin_available_at?: string;
}>;
export declare const createLoyaltyAccountInputSchema: z.ZodObject<{
    user_id: z.ZodString;
    current_points_balance: z.ZodDefault<z.ZodNumber>;
    spin_wheel_available_count: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    user_id?: string;
    current_points_balance?: number;
    spin_wheel_available_count?: number;
}, {
    user_id?: string;
    current_points_balance?: number;
    spin_wheel_available_count?: number;
}>;
export declare const updateLoyaltyAccountInputSchema: z.ZodObject<{
    loyalty_account_id: z.ZodString;
    current_points_balance: z.ZodOptional<z.ZodNumber>;
    spin_wheel_available_count: z.ZodOptional<z.ZodNumber>;
    next_spin_available_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    loyalty_account_id?: string;
    current_points_balance?: number;
    spin_wheel_available_count?: number;
    next_spin_available_at?: string;
}, {
    loyalty_account_id?: string;
    current_points_balance?: number;
    spin_wheel_available_count?: number;
    next_spin_available_at?: string;
}>;
export type LoyaltyAccount = z.infer<typeof loyaltyAccountSchema>;
export type CreateLoyaltyAccountInput = z.infer<typeof createLoyaltyAccountInputSchema>;
export type UpdateLoyaltyAccountInput = z.infer<typeof updateLoyaltyAccountInputSchema>;
export declare const pointsTransactionSchema: z.ZodObject<{
    transaction_id: z.ZodString;
    loyalty_account_id: z.ZodString;
    transaction_type: z.ZodString;
    points_amount: z.ZodNumber;
    order_id: z.ZodNullable<z.ZodString>;
    reason: z.ZodNullable<z.ZodString>;
    adjusted_by_user_id: z.ZodNullable<z.ZodString>;
    running_balance: z.ZodNumber;
    created_at: z.ZodString;
    expires_at: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    created_at?: string;
    expires_at?: string;
    order_id?: string;
    reason?: string;
    loyalty_account_id?: string;
    transaction_id?: string;
    transaction_type?: string;
    points_amount?: number;
    adjusted_by_user_id?: string;
    running_balance?: number;
}, {
    created_at?: string;
    expires_at?: string;
    order_id?: string;
    reason?: string;
    loyalty_account_id?: string;
    transaction_id?: string;
    transaction_type?: string;
    points_amount?: number;
    adjusted_by_user_id?: string;
    running_balance?: number;
}>;
export declare const createPointsTransactionInputSchema: z.ZodObject<{
    loyalty_account_id: z.ZodString;
    transaction_type: z.ZodEnum<["earned", "redeemed", "expired", "manual_adjustment"]>;
    points_amount: z.ZodNumber;
    order_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    reason: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    adjusted_by_user_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    running_balance: z.ZodNumber;
    expires_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    expires_at?: string;
    order_id?: string;
    reason?: string;
    loyalty_account_id?: string;
    transaction_type?: "expired" | "earned" | "redeemed" | "manual_adjustment";
    points_amount?: number;
    adjusted_by_user_id?: string;
    running_balance?: number;
}, {
    expires_at?: string;
    order_id?: string;
    reason?: string;
    loyalty_account_id?: string;
    transaction_type?: "expired" | "earned" | "redeemed" | "manual_adjustment";
    points_amount?: number;
    adjusted_by_user_id?: string;
    running_balance?: number;
}>;
export declare const searchPointsTransactionInputSchema: z.ZodObject<{
    loyalty_account_id: z.ZodOptional<z.ZodString>;
    transaction_type: z.ZodOptional<z.ZodEnum<["earned", "redeemed", "expired", "manual_adjustment"]>>;
    date_from: z.ZodOptional<z.ZodString>;
    date_to: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
    sort_by: z.ZodDefault<z.ZodEnum<["created_at"]>>;
    sort_order: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    limit?: number;
    offset?: number;
    sort_by?: "created_at";
    sort_order?: "asc" | "desc";
    date_from?: string;
    date_to?: string;
    loyalty_account_id?: string;
    transaction_type?: "expired" | "earned" | "redeemed" | "manual_adjustment";
}, {
    limit?: number;
    offset?: number;
    sort_by?: "created_at";
    sort_order?: "asc" | "desc";
    date_from?: string;
    date_to?: string;
    loyalty_account_id?: string;
    transaction_type?: "expired" | "earned" | "redeemed" | "manual_adjustment";
}>;
export type PointsTransaction = z.infer<typeof pointsTransactionSchema>;
export type CreatePointsTransactionInput = z.infer<typeof createPointsTransactionInputSchema>;
export type SearchPointsTransactionInput = z.infer<typeof searchPointsTransactionInputSchema>;
export declare const badgeSchema: z.ZodObject<{
    badge_id: z.ZodString;
    name: z.ZodString;
    description: z.ZodString;
    unlock_criteria: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    icon_url: z.ZodString;
    is_active: z.ZodBoolean;
    sort_order: z.ZodNumber;
    created_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    created_at?: string;
    sort_order?: number;
    name?: string;
    description?: string;
    is_active?: boolean;
    badge_id?: string;
    unlock_criteria?: Record<string, unknown>;
    icon_url?: string;
}, {
    created_at?: string;
    sort_order?: number;
    name?: string;
    description?: string;
    is_active?: boolean;
    badge_id?: string;
    unlock_criteria?: Record<string, unknown>;
    icon_url?: string;
}>;
export declare const createBadgeInputSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodString;
    unlock_criteria: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    icon_url: z.ZodString;
    is_active: z.ZodDefault<z.ZodBoolean>;
    sort_order: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    sort_order?: number;
    name?: string;
    description?: string;
    is_active?: boolean;
    unlock_criteria?: Record<string, unknown>;
    icon_url?: string;
}, {
    sort_order?: number;
    name?: string;
    description?: string;
    is_active?: boolean;
    unlock_criteria?: Record<string, unknown>;
    icon_url?: string;
}>;
export declare const updateBadgeInputSchema: z.ZodObject<{
    badge_id: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    unlock_criteria: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    icon_url: z.ZodOptional<z.ZodString>;
    is_active: z.ZodOptional<z.ZodBoolean>;
    sort_order: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    sort_order?: number;
    name?: string;
    description?: string;
    is_active?: boolean;
    badge_id?: string;
    unlock_criteria?: Record<string, unknown>;
    icon_url?: string;
}, {
    sort_order?: number;
    name?: string;
    description?: string;
    is_active?: boolean;
    badge_id?: string;
    unlock_criteria?: Record<string, unknown>;
    icon_url?: string;
}>;
export type Badge = z.infer<typeof badgeSchema>;
export type CreateBadgeInput = z.infer<typeof createBadgeInputSchema>;
export type UpdateBadgeInput = z.infer<typeof updateBadgeInputSchema>;
export declare const userBadgeSchema: z.ZodObject<{
    user_badge_id: z.ZodString;
    loyalty_account_id: z.ZodString;
    badge_id: z.ZodString;
    earned_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    loyalty_account_id?: string;
    badge_id?: string;
    user_badge_id?: string;
    earned_at?: string;
}, {
    loyalty_account_id?: string;
    badge_id?: string;
    user_badge_id?: string;
    earned_at?: string;
}>;
export declare const createUserBadgeInputSchema: z.ZodObject<{
    loyalty_account_id: z.ZodString;
    badge_id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    loyalty_account_id?: string;
    badge_id?: string;
}, {
    loyalty_account_id?: string;
    badge_id?: string;
}>;
export type UserBadge = z.infer<typeof userBadgeSchema>;
export type CreateUserBadgeInput = z.infer<typeof createUserBadgeInputSchema>;
export declare const rewardSchema: z.ZodObject<{
    reward_id: z.ZodString;
    name: z.ZodString;
    description: z.ZodString;
    points_cost: z.ZodNumber;
    reward_type: z.ZodString;
    reward_value: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    expiry_days_after_redemption: z.ZodNullable<z.ZodNumber>;
    stock_limit: z.ZodNullable<z.ZodNumber>;
    stock_remaining: z.ZodNullable<z.ZodNumber>;
    status: z.ZodString;
    image_url: z.ZodNullable<z.ZodString>;
    availability_status: z.ZodNullable<z.ZodString>;
    sort_order: z.ZodNumber;
    created_at: z.ZodString;
    updated_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status?: string;
    created_at?: string;
    sort_order?: number;
    name?: string;
    description?: string;
    image_url?: string;
    updated_at?: string;
    reward_id?: string;
    points_cost?: number;
    reward_type?: string;
    reward_value?: Record<string, unknown>;
    expiry_days_after_redemption?: number;
    stock_limit?: number;
    stock_remaining?: number;
    availability_status?: string;
}, {
    status?: string;
    created_at?: string;
    sort_order?: number;
    name?: string;
    description?: string;
    image_url?: string;
    updated_at?: string;
    reward_id?: string;
    points_cost?: number;
    reward_type?: string;
    reward_value?: Record<string, unknown>;
    expiry_days_after_redemption?: number;
    stock_limit?: number;
    stock_remaining?: number;
    availability_status?: string;
}>;
export declare const createRewardInputSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodString;
    points_cost: z.ZodNumber;
    reward_type: z.ZodEnum<["discount", "delivery", "physical", "merchandise"]>;
    reward_value: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    expiry_days_after_redemption: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    stock_limit: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    stock_remaining: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    status: z.ZodDefault<z.ZodEnum<["active", "inactive", "out_of_stock"]>>;
    image_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    availability_status: z.ZodOptional<z.ZodNullable<z.ZodEnum<["available", "limited", "unavailable"]>>>;
    sort_order: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    status?: "active" | "inactive" | "out_of_stock";
    sort_order?: number;
    name?: string;
    description?: string;
    image_url?: string;
    points_cost?: number;
    reward_type?: "delivery" | "discount" | "physical" | "merchandise";
    reward_value?: Record<string, unknown>;
    expiry_days_after_redemption?: number;
    stock_limit?: number;
    stock_remaining?: number;
    availability_status?: "available" | "limited" | "unavailable";
}, {
    status?: "active" | "inactive" | "out_of_stock";
    sort_order?: number;
    name?: string;
    description?: string;
    image_url?: string;
    points_cost?: number;
    reward_type?: "delivery" | "discount" | "physical" | "merchandise";
    reward_value?: Record<string, unknown>;
    expiry_days_after_redemption?: number;
    stock_limit?: number;
    stock_remaining?: number;
    availability_status?: "available" | "limited" | "unavailable";
}>;
export declare const updateRewardInputSchema: z.ZodObject<{
    reward_id: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    points_cost: z.ZodOptional<z.ZodNumber>;
    reward_value: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    expiry_days_after_redemption: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    stock_limit: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    stock_remaining: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    status: z.ZodOptional<z.ZodEnum<["active", "inactive", "out_of_stock"]>>;
    image_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    availability_status: z.ZodOptional<z.ZodNullable<z.ZodEnum<["available", "limited", "unavailable"]>>>;
    sort_order: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    status?: "active" | "inactive" | "out_of_stock";
    sort_order?: number;
    name?: string;
    description?: string;
    image_url?: string;
    reward_id?: string;
    points_cost?: number;
    reward_value?: Record<string, unknown>;
    expiry_days_after_redemption?: number;
    stock_limit?: number;
    stock_remaining?: number;
    availability_status?: "available" | "limited" | "unavailable";
}, {
    status?: "active" | "inactive" | "out_of_stock";
    sort_order?: number;
    name?: string;
    description?: string;
    image_url?: string;
    reward_id?: string;
    points_cost?: number;
    reward_value?: Record<string, unknown>;
    expiry_days_after_redemption?: number;
    stock_limit?: number;
    stock_remaining?: number;
    availability_status?: "available" | "limited" | "unavailable";
}>;
export declare const searchRewardInputSchema: z.ZodObject<{
    status: z.ZodOptional<z.ZodEnum<["active", "inactive", "out_of_stock"]>>;
    reward_type: z.ZodOptional<z.ZodEnum<["discount", "delivery", "physical", "merchandise"]>>;
    max_points_cost: z.ZodOptional<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
    sort_by: z.ZodDefault<z.ZodEnum<["points_cost", "sort_order", "created_at"]>>;
    sort_order: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    status?: "active" | "inactive" | "out_of_stock";
    limit?: number;
    offset?: number;
    sort_by?: "created_at" | "sort_order" | "points_cost";
    sort_order?: "asc" | "desc";
    reward_type?: "delivery" | "discount" | "physical" | "merchandise";
    max_points_cost?: number;
}, {
    status?: "active" | "inactive" | "out_of_stock";
    limit?: number;
    offset?: number;
    sort_by?: "created_at" | "sort_order" | "points_cost";
    sort_order?: "asc" | "desc";
    reward_type?: "delivery" | "discount" | "physical" | "merchandise";
    max_points_cost?: number;
}>;
export type Reward = z.infer<typeof rewardSchema>;
export type CreateRewardInput = z.infer<typeof createRewardInputSchema>;
export type UpdateRewardInput = z.infer<typeof updateRewardInputSchema>;
export type SearchRewardInput = z.infer<typeof searchRewardInputSchema>;
export declare const redeemedRewardSchema: z.ZodObject<{
    redeemed_reward_id: z.ZodString;
    loyalty_account_id: z.ZodString;
    reward_id: z.ZodString;
    reward_code: z.ZodString;
    points_deducted: z.ZodNumber;
    redeemed_at: z.ZodString;
    expires_at: z.ZodNullable<z.ZodString>;
    usage_status: z.ZodString;
    used_in_order_id: z.ZodNullable<z.ZodString>;
    used_at: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    expires_at?: string;
    used_at?: string;
    loyalty_account_id?: string;
    reward_id?: string;
    redeemed_reward_id?: string;
    reward_code?: string;
    points_deducted?: number;
    redeemed_at?: string;
    usage_status?: string;
    used_in_order_id?: string;
}, {
    expires_at?: string;
    used_at?: string;
    loyalty_account_id?: string;
    reward_id?: string;
    redeemed_reward_id?: string;
    reward_code?: string;
    points_deducted?: number;
    redeemed_at?: string;
    usage_status?: string;
    used_in_order_id?: string;
}>;
export declare const createRedeemedRewardInputSchema: z.ZodObject<{
    loyalty_account_id: z.ZodString;
    reward_id: z.ZodString;
    reward_code: z.ZodString;
    points_deducted: z.ZodNumber;
    expires_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    expires_at?: string;
    loyalty_account_id?: string;
    reward_id?: string;
    reward_code?: string;
    points_deducted?: number;
}, {
    expires_at?: string;
    loyalty_account_id?: string;
    reward_id?: string;
    reward_code?: string;
    points_deducted?: number;
}>;
export declare const updateRedeemedRewardInputSchema: z.ZodObject<{
    redeemed_reward_id: z.ZodString;
    usage_status: z.ZodEnum<["unused", "used", "expired"]>;
    used_in_order_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    used_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    used_at?: string;
    redeemed_reward_id?: string;
    usage_status?: "used" | "expired" | "unused";
    used_in_order_id?: string;
}, {
    used_at?: string;
    redeemed_reward_id?: string;
    usage_status?: "used" | "expired" | "unused";
    used_in_order_id?: string;
}>;
export declare const searchRedeemedRewardInputSchema: z.ZodObject<{
    loyalty_account_id: z.ZodOptional<z.ZodString>;
    usage_status: z.ZodOptional<z.ZodEnum<["unused", "used", "expired"]>>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
    sort_by: z.ZodDefault<z.ZodEnum<["redeemed_at"]>>;
    sort_order: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    limit?: number;
    offset?: number;
    sort_by?: "redeemed_at";
    sort_order?: "asc" | "desc";
    loyalty_account_id?: string;
    usage_status?: "used" | "expired" | "unused";
}, {
    limit?: number;
    offset?: number;
    sort_by?: "redeemed_at";
    sort_order?: "asc" | "desc";
    loyalty_account_id?: string;
    usage_status?: "used" | "expired" | "unused";
}>;
export type RedeemedReward = z.infer<typeof redeemedRewardSchema>;
export type CreateRedeemedRewardInput = z.infer<typeof createRedeemedRewardInputSchema>;
export type UpdateRedeemedRewardInput = z.infer<typeof updateRedeemedRewardInputSchema>;
export type SearchRedeemedRewardInput = z.infer<typeof searchRedeemedRewardInputSchema>;
export declare const cateringInquirySchema: z.ZodObject<{
    inquiry_id: z.ZodString;
    inquiry_number: z.ZodString;
    user_id: z.ZodNullable<z.ZodString>;
    contact_name: z.ZodString;
    contact_email: z.ZodString;
    contact_phone: z.ZodString;
    company_name: z.ZodNullable<z.ZodString>;
    event_type: z.ZodString;
    event_type_other: z.ZodNullable<z.ZodString>;
    event_date: z.ZodString;
    event_start_time: z.ZodString;
    event_end_time: z.ZodString;
    event_location_address: z.ZodString;
    event_location_city: z.ZodString;
    event_location_postal_code: z.ZodString;
    event_location_type: z.ZodString;
    guest_count: z.ZodNumber;
    guest_count_min: z.ZodNullable<z.ZodNumber>;
    guest_count_max: z.ZodNullable<z.ZodNumber>;
    dietary_requirements: z.ZodNullable<z.ZodArray<z.ZodString, "many">>;
    dietary_notes: z.ZodNullable<z.ZodString>;
    menu_preferences: z.ZodNullable<z.ZodString>;
    preferred_package: z.ZodNullable<z.ZodString>;
    budget_range: z.ZodNullable<z.ZodString>;
    additional_details: z.ZodNullable<z.ZodString>;
    attached_files: z.ZodNullable<z.ZodArray<z.ZodString, "many">>;
    marketing_opt_in: z.ZodBoolean;
    status: z.ZodString;
    admin_notes: z.ZodNullable<z.ZodString>;
    submitted_at: z.ZodString;
    updated_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    user_id?: string;
    status?: string;
    marketing_opt_in?: boolean;
    updated_at?: string;
    inquiry_id?: string;
    inquiry_number?: string;
    contact_name?: string;
    contact_email?: string;
    contact_phone?: string;
    company_name?: string;
    event_type?: string;
    event_type_other?: string;
    event_date?: string;
    event_start_time?: string;
    event_end_time?: string;
    event_location_address?: string;
    event_location_city?: string;
    event_location_postal_code?: string;
    event_location_type?: string;
    guest_count?: number;
    guest_count_min?: number;
    guest_count_max?: number;
    dietary_requirements?: string[];
    dietary_notes?: string;
    menu_preferences?: string;
    preferred_package?: string;
    budget_range?: string;
    additional_details?: string;
    attached_files?: string[];
    admin_notes?: string;
    submitted_at?: string;
}, {
    user_id?: string;
    status?: string;
    marketing_opt_in?: boolean;
    updated_at?: string;
    inquiry_id?: string;
    inquiry_number?: string;
    contact_name?: string;
    contact_email?: string;
    contact_phone?: string;
    company_name?: string;
    event_type?: string;
    event_type_other?: string;
    event_date?: string;
    event_start_time?: string;
    event_end_time?: string;
    event_location_address?: string;
    event_location_city?: string;
    event_location_postal_code?: string;
    event_location_type?: string;
    guest_count?: number;
    guest_count_min?: number;
    guest_count_max?: number;
    dietary_requirements?: string[];
    dietary_notes?: string;
    menu_preferences?: string;
    preferred_package?: string;
    budget_range?: string;
    additional_details?: string;
    attached_files?: string[];
    admin_notes?: string;
    submitted_at?: string;
}>;
export declare const createCateringInquiryInputSchema: z.ZodObject<{
    user_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    contact_name: z.ZodString;
    contact_email: z.ZodString;
    contact_phone: z.ZodString;
    company_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    event_type: z.ZodEnum<["corporate", "wedding", "birthday", "meeting", "other"]>;
    event_type_other: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    event_date: z.ZodString;
    event_start_time: z.ZodString;
    event_end_time: z.ZodString;
    event_location_address: z.ZodString;
    event_location_city: z.ZodString;
    event_location_postal_code: z.ZodString;
    event_location_type: z.ZodEnum<["office", "home", "venue", "outdoor", "other"]>;
    guest_count: z.ZodNumber;
    guest_count_min: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    guest_count_max: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    dietary_requirements: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString, "many">>>;
    dietary_notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    menu_preferences: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    preferred_package: z.ZodOptional<z.ZodNullable<z.ZodEnum<["standard", "premium", "luxury"]>>>;
    budget_range: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    additional_details: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    attached_files: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString, "many">>>;
    marketing_opt_in: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    user_id?: string;
    marketing_opt_in?: boolean;
    contact_name?: string;
    contact_email?: string;
    contact_phone?: string;
    company_name?: string;
    event_type?: "corporate" | "wedding" | "birthday" | "meeting" | "other";
    event_type_other?: string;
    event_date?: string;
    event_start_time?: string;
    event_end_time?: string;
    event_location_address?: string;
    event_location_city?: string;
    event_location_postal_code?: string;
    event_location_type?: "other" | "office" | "home" | "venue" | "outdoor";
    guest_count?: number;
    guest_count_min?: number;
    guest_count_max?: number;
    dietary_requirements?: string[];
    dietary_notes?: string;
    menu_preferences?: string;
    preferred_package?: "standard" | "premium" | "luxury";
    budget_range?: string;
    additional_details?: string;
    attached_files?: string[];
}, {
    user_id?: string;
    marketing_opt_in?: boolean;
    contact_name?: string;
    contact_email?: string;
    contact_phone?: string;
    company_name?: string;
    event_type?: "corporate" | "wedding" | "birthday" | "meeting" | "other";
    event_type_other?: string;
    event_date?: string;
    event_start_time?: string;
    event_end_time?: string;
    event_location_address?: string;
    event_location_city?: string;
    event_location_postal_code?: string;
    event_location_type?: "other" | "office" | "home" | "venue" | "outdoor";
    guest_count?: number;
    guest_count_min?: number;
    guest_count_max?: number;
    dietary_requirements?: string[];
    dietary_notes?: string;
    menu_preferences?: string;
    preferred_package?: "standard" | "premium" | "luxury";
    budget_range?: string;
    additional_details?: string;
    attached_files?: string[];
}>;
export declare const updateCateringInquiryInputSchema: z.ZodObject<{
    inquiry_id: z.ZodString;
    status: z.ZodEnum<["new", "in_progress", "quoted", "confirmed", "completed", "cancelled"]>;
    admin_notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    status?: "completed" | "cancelled" | "new" | "in_progress" | "quoted" | "confirmed";
    inquiry_id?: string;
    admin_notes?: string;
}, {
    status?: "completed" | "cancelled" | "new" | "in_progress" | "quoted" | "confirmed";
    inquiry_id?: string;
    admin_notes?: string;
}>;
export declare const searchCateringInquiryInputSchema: z.ZodObject<{
    query: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["new", "in_progress", "quoted", "confirmed", "completed", "cancelled"]>>;
    event_type: z.ZodOptional<z.ZodEnum<["corporate", "wedding", "birthday", "meeting", "other"]>>;
    date_from: z.ZodOptional<z.ZodString>;
    date_to: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
    sort_by: z.ZodDefault<z.ZodEnum<["submitted_at", "event_date", "guest_count"]>>;
    sort_order: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    status?: "completed" | "cancelled" | "new" | "in_progress" | "quoted" | "confirmed";
    query?: string;
    limit?: number;
    offset?: number;
    sort_by?: "event_date" | "guest_count" | "submitted_at";
    sort_order?: "asc" | "desc";
    date_from?: string;
    date_to?: string;
    event_type?: "corporate" | "wedding" | "birthday" | "meeting" | "other";
}, {
    status?: "completed" | "cancelled" | "new" | "in_progress" | "quoted" | "confirmed";
    query?: string;
    limit?: number;
    offset?: number;
    sort_by?: "event_date" | "guest_count" | "submitted_at";
    sort_order?: "asc" | "desc";
    date_from?: string;
    date_to?: string;
    event_type?: "corporate" | "wedding" | "birthday" | "meeting" | "other";
}>;
export type CateringInquiry = z.infer<typeof cateringInquirySchema>;
export type CreateCateringInquiryInput = z.infer<typeof createCateringInquiryInputSchema>;
export type UpdateCateringInquiryInput = z.infer<typeof updateCateringInquiryInputSchema>;
export type SearchCateringInquiryInput = z.infer<typeof searchCateringInquiryInputSchema>;
export declare const cateringQuoteSchema: z.ZodObject<{
    quote_id: z.ZodString;
    inquiry_id: z.ZodString;
    quote_number: z.ZodString;
    line_items: z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">;
    subtotal: z.ZodNumber;
    additional_fees: z.ZodNullable<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">>;
    tax_amount: z.ZodNumber;
    grand_total: z.ZodNumber;
    valid_until: z.ZodString;
    terms: z.ZodNullable<z.ZodString>;
    quote_pdf_url: z.ZodNullable<z.ZodString>;
    created_at: z.ZodString;
    sent_at: z.ZodNullable<z.ZodString>;
    accepted_at: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    created_at?: string;
    subtotal?: number;
    tax_amount?: number;
    valid_until?: string;
    inquiry_id?: string;
    quote_id?: string;
    quote_number?: string;
    line_items?: Record<string, unknown>[];
    additional_fees?: Record<string, unknown>[];
    grand_total?: number;
    terms?: string;
    quote_pdf_url?: string;
    sent_at?: string;
    accepted_at?: string;
}, {
    created_at?: string;
    subtotal?: number;
    tax_amount?: number;
    valid_until?: string;
    inquiry_id?: string;
    quote_id?: string;
    quote_number?: string;
    line_items?: Record<string, unknown>[];
    additional_fees?: Record<string, unknown>[];
    grand_total?: number;
    terms?: string;
    quote_pdf_url?: string;
    sent_at?: string;
    accepted_at?: string;
}>;
export declare const createCateringQuoteInputSchema: z.ZodObject<{
    inquiry_id: z.ZodString;
    line_items: z.ZodArray<z.ZodObject<{
        item: z.ZodString;
        quantity: z.ZodNumber;
        unit_price: z.ZodNumber;
        total: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        quantity?: number;
        unit_price?: number;
        item?: string;
        total?: number;
    }, {
        quantity?: number;
        unit_price?: number;
        item?: string;
        total?: number;
    }>, "many">;
    subtotal: z.ZodNumber;
    additional_fees: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        amount: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        name?: string;
        amount?: number;
    }, {
        name?: string;
        amount?: number;
    }>, "many">>>;
    tax_amount: z.ZodNumber;
    grand_total: z.ZodNumber;
    valid_until: z.ZodString;
    terms: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    subtotal?: number;
    tax_amount?: number;
    valid_until?: string;
    inquiry_id?: string;
    line_items?: {
        quantity?: number;
        unit_price?: number;
        item?: string;
        total?: number;
    }[];
    additional_fees?: {
        name?: string;
        amount?: number;
    }[];
    grand_total?: number;
    terms?: string;
}, {
    subtotal?: number;
    tax_amount?: number;
    valid_until?: string;
    inquiry_id?: string;
    line_items?: {
        quantity?: number;
        unit_price?: number;
        item?: string;
        total?: number;
    }[];
    additional_fees?: {
        name?: string;
        amount?: number;
    }[];
    grand_total?: number;
    terms?: string;
}>;
export declare const updateCateringQuoteInputSchema: z.ZodObject<{
    quote_id: z.ZodString;
    quote_pdf_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    sent_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    accepted_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    quote_id?: string;
    quote_pdf_url?: string;
    sent_at?: string;
    accepted_at?: string;
}, {
    quote_id?: string;
    quote_pdf_url?: string;
    sent_at?: string;
    accepted_at?: string;
}>;
export type CateringQuote = z.infer<typeof cateringQuoteSchema>;
export type CreateCateringQuoteInput = z.infer<typeof createCateringQuoteInputSchema>;
export type UpdateCateringQuoteInput = z.infer<typeof updateCateringQuoteInputSchema>;
export declare const invoiceSchema: z.ZodObject<{
    invoice_id: z.ZodString;
    invoice_number: z.ZodString;
    order_id: z.ZodNullable<z.ZodString>;
    catering_inquiry_id: z.ZodNullable<z.ZodString>;
    user_id: z.ZodNullable<z.ZodString>;
    customer_name: z.ZodString;
    customer_email: z.ZodString;
    customer_phone: z.ZodString;
    customer_address: z.ZodNullable<z.ZodString>;
    line_items: z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">;
    subtotal: z.ZodNumber;
    discount_amount: z.ZodNumber;
    delivery_fee: z.ZodNullable<z.ZodNumber>;
    tax_amount: z.ZodNumber;
    grand_total: z.ZodNumber;
    payment_status: z.ZodString;
    payment_method: z.ZodNullable<z.ZodString>;
    sumup_transaction_id: z.ZodNullable<z.ZodString>;
    issue_date: z.ZodString;
    due_date: z.ZodNullable<z.ZodString>;
    paid_at: z.ZodNullable<z.ZodString>;
    invoice_pdf_url: z.ZodNullable<z.ZodString>;
    notes: z.ZodNullable<z.ZodString>;
    created_at: z.ZodString;
    updated_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    user_id?: string;
    created_at?: string;
    updated_at?: string;
    order_id?: string;
    delivery_fee?: number;
    subtotal?: number;
    discount_amount?: number;
    tax_amount?: number;
    payment_status?: string;
    sumup_transaction_id?: string;
    customer_name?: string;
    customer_email?: string;
    customer_phone?: string;
    notes?: string;
    line_items?: Record<string, unknown>[];
    grand_total?: number;
    invoice_id?: string;
    invoice_number?: string;
    catering_inquiry_id?: string;
    customer_address?: string;
    payment_method?: string;
    issue_date?: string;
    due_date?: string;
    paid_at?: string;
    invoice_pdf_url?: string;
}, {
    user_id?: string;
    created_at?: string;
    updated_at?: string;
    order_id?: string;
    delivery_fee?: number;
    subtotal?: number;
    discount_amount?: number;
    tax_amount?: number;
    payment_status?: string;
    sumup_transaction_id?: string;
    customer_name?: string;
    customer_email?: string;
    customer_phone?: string;
    notes?: string;
    line_items?: Record<string, unknown>[];
    grand_total?: number;
    invoice_id?: string;
    invoice_number?: string;
    catering_inquiry_id?: string;
    customer_address?: string;
    payment_method?: string;
    issue_date?: string;
    due_date?: string;
    paid_at?: string;
    invoice_pdf_url?: string;
}>;
export declare const createInvoiceInputSchema: z.ZodObject<{
    order_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    catering_inquiry_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    user_id: z.ZodNullable<z.ZodString>;
    customer_name: z.ZodString;
    customer_email: z.ZodString;
    customer_phone: z.ZodString;
    customer_address: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    line_items: z.ZodArray<z.ZodObject<{
        item: z.ZodString;
        quantity: z.ZodNumber;
        unit_price: z.ZodNumber;
        total: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        quantity?: number;
        unit_price?: number;
        item?: string;
        total?: number;
    }, {
        quantity?: number;
        unit_price?: number;
        item?: string;
        total?: number;
    }>, "many">;
    subtotal: z.ZodNumber;
    discount_amount: z.ZodDefault<z.ZodNumber>;
    delivery_fee: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    tax_amount: z.ZodNumber;
    grand_total: z.ZodNumber;
    payment_status: z.ZodDefault<z.ZodEnum<["pending", "paid", "overdue", "cancelled"]>>;
    payment_method: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    issue_date: z.ZodString;
    due_date: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    user_id?: string;
    order_id?: string;
    delivery_fee?: number;
    subtotal?: number;
    discount_amount?: number;
    tax_amount?: number;
    payment_status?: "cancelled" | "pending" | "paid" | "overdue";
    customer_name?: string;
    customer_email?: string;
    customer_phone?: string;
    notes?: string;
    line_items?: {
        quantity?: number;
        unit_price?: number;
        item?: string;
        total?: number;
    }[];
    grand_total?: number;
    catering_inquiry_id?: string;
    customer_address?: string;
    payment_method?: string;
    issue_date?: string;
    due_date?: string;
}, {
    user_id?: string;
    order_id?: string;
    delivery_fee?: number;
    subtotal?: number;
    discount_amount?: number;
    tax_amount?: number;
    payment_status?: "cancelled" | "pending" | "paid" | "overdue";
    customer_name?: string;
    customer_email?: string;
    customer_phone?: string;
    notes?: string;
    line_items?: {
        quantity?: number;
        unit_price?: number;
        item?: string;
        total?: number;
    }[];
    grand_total?: number;
    catering_inquiry_id?: string;
    customer_address?: string;
    payment_method?: string;
    issue_date?: string;
    due_date?: string;
}>;
export declare const updateInvoiceInputSchema: z.ZodObject<{
    invoice_id: z.ZodString;
    payment_status: z.ZodOptional<z.ZodEnum<["pending", "paid", "overdue", "cancelled"]>>;
    payment_method: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    sumup_transaction_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    paid_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    invoice_pdf_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    payment_status?: "cancelled" | "pending" | "paid" | "overdue";
    sumup_transaction_id?: string;
    notes?: string;
    invoice_id?: string;
    payment_method?: string;
    paid_at?: string;
    invoice_pdf_url?: string;
}, {
    payment_status?: "cancelled" | "pending" | "paid" | "overdue";
    sumup_transaction_id?: string;
    notes?: string;
    invoice_id?: string;
    payment_method?: string;
    paid_at?: string;
    invoice_pdf_url?: string;
}>;
export declare const searchInvoiceInputSchema: z.ZodObject<{
    query: z.ZodOptional<z.ZodString>;
    user_id: z.ZodOptional<z.ZodString>;
    payment_status: z.ZodOptional<z.ZodEnum<["pending", "paid", "overdue", "cancelled"]>>;
    date_from: z.ZodOptional<z.ZodString>;
    date_to: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
    sort_by: z.ZodDefault<z.ZodEnum<["created_at", "issue_date", "grand_total"]>>;
    sort_order: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    user_id?: string;
    query?: string;
    limit?: number;
    offset?: number;
    sort_by?: "created_at" | "grand_total" | "issue_date";
    sort_order?: "asc" | "desc";
    payment_status?: "cancelled" | "pending" | "paid" | "overdue";
    date_from?: string;
    date_to?: string;
}, {
    user_id?: string;
    query?: string;
    limit?: number;
    offset?: number;
    sort_by?: "created_at" | "grand_total" | "issue_date";
    sort_order?: "asc" | "desc";
    payment_status?: "cancelled" | "pending" | "paid" | "overdue";
    date_from?: string;
    date_to?: string;
}>;
export type Invoice = z.infer<typeof invoiceSchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceInputSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceInputSchema>;
export type SearchInvoiceInput = z.infer<typeof searchInvoiceInputSchema>;
export declare const systemSettingSchema: z.ZodObject<{
    setting_id: z.ZodString;
    setting_key: z.ZodString;
    setting_value: z.ZodNullable<z.ZodUnknown>;
    setting_type: z.ZodString;
    updated_at: z.ZodString;
    updated_by_user_id: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    updated_at?: string;
    setting_id?: string;
    setting_key?: string;
    setting_value?: unknown;
    setting_type?: string;
    updated_by_user_id?: string;
}, {
    updated_at?: string;
    setting_id?: string;
    setting_key?: string;
    setting_value?: unknown;
    setting_type?: string;
    updated_by_user_id?: string;
}>;
export declare const createSystemSettingInputSchema: z.ZodObject<{
    setting_key: z.ZodString;
    setting_value: z.ZodNullable<z.ZodUnknown>;
    setting_type: z.ZodEnum<["string", "number", "boolean", "json"]>;
    updated_by_user_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    setting_key?: string;
    setting_value?: unknown;
    setting_type?: "string" | "number" | "boolean" | "json";
    updated_by_user_id?: string;
}, {
    setting_key?: string;
    setting_value?: unknown;
    setting_type?: "string" | "number" | "boolean" | "json";
    updated_by_user_id?: string;
}>;
export declare const updateSystemSettingInputSchema: z.ZodObject<{
    setting_id: z.ZodString;
    setting_value: z.ZodNullable<z.ZodUnknown>;
    updated_by_user_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    setting_id?: string;
    setting_value?: unknown;
    updated_by_user_id?: string;
}, {
    setting_id?: string;
    setting_value?: unknown;
    updated_by_user_id?: string;
}>;
export type SystemSetting = z.infer<typeof systemSettingSchema>;
export type CreateSystemSettingInput = z.infer<typeof createSystemSettingInputSchema>;
export type UpdateSystemSettingInput = z.infer<typeof updateSystemSettingInputSchema>;
export declare const activityLogSchema: z.ZodObject<{
    log_id: z.ZodString;
    user_id: z.ZodString;
    action_type: z.ZodString;
    entity_type: z.ZodString;
    entity_id: z.ZodString;
    description: z.ZodNullable<z.ZodString>;
    changes: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    ip_address: z.ZodNullable<z.ZodString>;
    user_agent: z.ZodNullable<z.ZodString>;
    created_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    user_id?: string;
    created_at?: string;
    description?: string;
    log_id?: string;
    action_type?: string;
    entity_type?: string;
    entity_id?: string;
    changes?: Record<string, unknown>;
    ip_address?: string;
    user_agent?: string;
}, {
    user_id?: string;
    created_at?: string;
    description?: string;
    log_id?: string;
    action_type?: string;
    entity_type?: string;
    entity_id?: string;
    changes?: Record<string, unknown>;
    ip_address?: string;
    user_agent?: string;
}>;
export declare const createActivityLogInputSchema: z.ZodObject<{
    user_id: z.ZodString;
    action_type: z.ZodEnum<["create", "update", "delete", "view", "login", "logout"]>;
    entity_type: z.ZodString;
    entity_id: z.ZodString;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    changes: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    ip_address: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    user_agent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    user_id?: string;
    description?: string;
    action_type?: "create" | "update" | "delete" | "view" | "login" | "logout";
    entity_type?: string;
    entity_id?: string;
    changes?: Record<string, unknown>;
    ip_address?: string;
    user_agent?: string;
}, {
    user_id?: string;
    description?: string;
    action_type?: "create" | "update" | "delete" | "view" | "login" | "logout";
    entity_type?: string;
    entity_id?: string;
    changes?: Record<string, unknown>;
    ip_address?: string;
    user_agent?: string;
}>;
export declare const searchActivityLogInputSchema: z.ZodObject<{
    user_id: z.ZodOptional<z.ZodString>;
    action_type: z.ZodOptional<z.ZodEnum<["create", "update", "delete", "view", "login", "logout"]>>;
    entity_type: z.ZodOptional<z.ZodString>;
    entity_id: z.ZodOptional<z.ZodString>;
    date_from: z.ZodOptional<z.ZodString>;
    date_to: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
    sort_by: z.ZodDefault<z.ZodEnum<["created_at"]>>;
    sort_order: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    user_id?: string;
    limit?: number;
    offset?: number;
    sort_by?: "created_at";
    sort_order?: "asc" | "desc";
    date_from?: string;
    date_to?: string;
    action_type?: "create" | "update" | "delete" | "view" | "login" | "logout";
    entity_type?: string;
    entity_id?: string;
}, {
    user_id?: string;
    limit?: number;
    offset?: number;
    sort_by?: "created_at";
    sort_order?: "asc" | "desc";
    date_from?: string;
    date_to?: string;
    action_type?: "create" | "update" | "delete" | "view" | "login" | "logout";
    entity_type?: string;
    entity_id?: string;
}>;
export type ActivityLog = z.infer<typeof activityLogSchema>;
export type CreateActivityLogInput = z.infer<typeof createActivityLogInputSchema>;
export type SearchActivityLogInput = z.infer<typeof searchActivityLogInputSchema>;
export declare const homepageSectionSchema: z.ZodObject<{
    section_id: z.ZodString;
    category_id: z.ZodString;
    enabled: z.ZodBoolean;
    sort_order: z.ZodNumber;
    item_limit: z.ZodNumber;
    display_mode: z.ZodEnum<["auto_popular", "auto_newest", "manual"]>;
    selected_item_ids: z.ZodNullable<z.ZodArray<z.ZodString, "many">>;
    created_at: z.ZodString;
    updated_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    created_at?: string;
    sort_order?: number;
    category_id?: string;
    updated_at?: string;
    section_id?: string;
    enabled?: boolean;
    item_limit?: number;
    display_mode?: "auto_popular" | "auto_newest" | "manual";
    selected_item_ids?: string[];
}, {
    created_at?: string;
    sort_order?: number;
    category_id?: string;
    updated_at?: string;
    section_id?: string;
    enabled?: boolean;
    item_limit?: number;
    display_mode?: "auto_popular" | "auto_newest" | "manual";
    selected_item_ids?: string[];
}>;
export declare const createHomepageSectionInputSchema: z.ZodObject<{
    category_id: z.ZodString;
    enabled: z.ZodDefault<z.ZodBoolean>;
    sort_order: z.ZodDefault<z.ZodNumber>;
    item_limit: z.ZodDefault<z.ZodNumber>;
    display_mode: z.ZodDefault<z.ZodEnum<["auto_popular", "auto_newest", "manual"]>>;
    selected_item_ids: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString, "many">>>;
}, "strip", z.ZodTypeAny, {
    sort_order?: number;
    category_id?: string;
    enabled?: boolean;
    item_limit?: number;
    display_mode?: "auto_popular" | "auto_newest" | "manual";
    selected_item_ids?: string[];
}, {
    sort_order?: number;
    category_id?: string;
    enabled?: boolean;
    item_limit?: number;
    display_mode?: "auto_popular" | "auto_newest" | "manual";
    selected_item_ids?: string[];
}>;
export declare const updateHomepageSectionInputSchema: z.ZodObject<{
    section_id: z.ZodString;
    enabled: z.ZodOptional<z.ZodBoolean>;
    sort_order: z.ZodOptional<z.ZodNumber>;
    item_limit: z.ZodOptional<z.ZodNumber>;
    display_mode: z.ZodOptional<z.ZodEnum<["auto_popular", "auto_newest", "manual"]>>;
    selected_item_ids: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString, "many">>>;
}, "strip", z.ZodTypeAny, {
    sort_order?: number;
    section_id?: string;
    enabled?: boolean;
    item_limit?: number;
    display_mode?: "auto_popular" | "auto_newest" | "manual";
    selected_item_ids?: string[];
}, {
    sort_order?: number;
    section_id?: string;
    enabled?: boolean;
    item_limit?: number;
    display_mode?: "auto_popular" | "auto_newest" | "manual";
    selected_item_ids?: string[];
}>;
export declare const reorderHomepageSectionsInputSchema: z.ZodObject<{
    section_orders: z.ZodArray<z.ZodObject<{
        section_id: z.ZodString;
        sort_order: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        sort_order?: number;
        section_id?: string;
    }, {
        sort_order?: number;
        section_id?: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    section_orders?: {
        sort_order?: number;
        section_id?: string;
    }[];
}, {
    section_orders?: {
        sort_order?: number;
        section_id?: string;
    }[];
}>;
export type HomepageSection = z.infer<typeof homepageSectionSchema>;
export type CreateHomepageSectionInput = z.infer<typeof createHomepageSectionInputSchema>;
export type UpdateHomepageSectionInput = z.infer<typeof updateHomepageSectionInputSchema>;
export type ReorderHomepageSectionsInput = z.infer<typeof reorderHomepageSectionsInputSchema>;
export declare const contactMessageSchema: z.ZodObject<{
    message_id: z.ZodString;
    name: z.ZodString;
    email: z.ZodString;
    phone: z.ZodNullable<z.ZodString>;
    subject: z.ZodString;
    message: z.ZodString;
    status: z.ZodEnum<["new", "read", "archived"]>;
    ip_address: z.ZodNullable<z.ZodString>;
    user_agent: z.ZodNullable<z.ZodString>;
    created_at: z.ZodString;
    read_at: z.ZodNullable<z.ZodString>;
    archived_at: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email?: string;
    phone?: string;
    status?: "new" | "read" | "archived";
    created_at?: string;
    message?: string;
    name?: string;
    ip_address?: string;
    user_agent?: string;
    message_id?: string;
    subject?: string;
    read_at?: string;
    archived_at?: string;
}, {
    email?: string;
    phone?: string;
    status?: "new" | "read" | "archived";
    created_at?: string;
    message?: string;
    name?: string;
    ip_address?: string;
    user_agent?: string;
    message_id?: string;
    subject?: string;
    read_at?: string;
    archived_at?: string;
}>;
export declare const createContactMessageInputSchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodString;
    phone: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    subject: z.ZodString;
    message: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email?: string;
    phone?: string;
    message?: string;
    name?: string;
    subject?: string;
}, {
    email?: string;
    phone?: string;
    message?: string;
    name?: string;
    subject?: string;
}>;
export declare const updateContactMessageInputSchema: z.ZodObject<{
    message_id: z.ZodString;
    status: z.ZodEnum<["new", "read", "archived"]>;
}, "strip", z.ZodTypeAny, {
    status?: "new" | "read" | "archived";
    message_id?: string;
}, {
    status?: "new" | "read" | "archived";
    message_id?: string;
}>;
export declare const searchContactMessageInputSchema: z.ZodObject<{
    status: z.ZodOptional<z.ZodEnum<["new", "read", "archived"]>>;
    q: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
    sort_by: z.ZodDefault<z.ZodEnum<["created_at", "email", "subject"]>>;
    sort_order: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    status?: "new" | "read" | "archived";
    limit?: number;
    offset?: number;
    sort_by?: "email" | "created_at" | "subject";
    sort_order?: "asc" | "desc";
    q?: string;
}, {
    status?: "new" | "read" | "archived";
    limit?: number;
    offset?: number;
    sort_by?: "email" | "created_at" | "subject";
    sort_order?: "asc" | "desc";
    q?: string;
}>;
export type ContactMessage = z.infer<typeof contactMessageSchema>;
export type CreateContactMessageInput = z.infer<typeof createContactMessageInputSchema>;
export type UpdateContactMessageInput = z.infer<typeof updateContactMessageInputSchema>;
export type SearchContactMessageInput = z.infer<typeof searchContactMessageInputSchema>;
//# sourceMappingURL=schema.d.ts.map