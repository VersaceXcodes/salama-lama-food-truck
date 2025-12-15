/**
 * Cart Totals Utility
 * 
 * Provides consistent cart total calculations across the entire checkout flow.
 * Uses integer cents to avoid floating-point math errors.
 * All calculations match backend logic for consistency.
 */

export interface CartTotalsInput {
  subtotal: number;
  discountAmount?: number;
  deliveryFee?: number;
  taxAmount?: number;
}

export interface CartTotals {
  subtotalCents: number;
  discountCents: number;
  deliveryFeeCents: number;
  taxCents: number;
  totalCents: number;
  // Formatted strings for display
  subtotal: string;
  discount: string;
  deliveryFee: string;
  tax: string;
  total: string;
}

/**
 * Convert euros to cents (integer)
 */
export function eurosToCents(euros: number): number {
  return Math.round(euros * 100);
}

/**
 * Convert cents to euros (formatted string)
 */
export function centsToEuros(cents: number): string {
  return (cents / 100).toFixed(2);
}

/**
 * Calculate cart totals using integer cents arithmetic
 * This ensures consistency across all pages and prevents floating-point errors
 */
export function calculateCartTotals(input: CartTotalsInput): CartTotals {
  // Convert all inputs to cents
  const subtotalCents = eurosToCents(input.subtotal || 0);
  const discountCents = eurosToCents(input.discountAmount || 0);
  const deliveryFeeCents = eurosToCents(input.deliveryFee || 0);
  const taxCents = eurosToCents(input.taxAmount || 0);

  // Calculate total: subtotal - discount + delivery + tax
  const totalCents = subtotalCents - discountCents + deliveryFeeCents + taxCents;

  return {
    subtotalCents,
    discountCents,
    deliveryFeeCents,
    taxCents,
    totalCents,
    // Formatted strings
    subtotal: centsToEuros(subtotalCents),
    discount: centsToEuros(discountCents),
    deliveryFee: centsToEuros(deliveryFeeCents),
    tax: centsToEuros(taxCents),
    total: centsToEuros(totalCents),
  };
}

/**
 * Parse cart data from API response into CartTotalsInput
 */
export function parseCartData(cartData: any): CartTotalsInput {
  return {
    subtotal: Number(cartData?.subtotal || 0),
    discountAmount: Number(cartData?.discount_amount || 0),
    deliveryFee: Number(cartData?.delivery_fee || 0),
    taxAmount: Number(cartData?.tax_amount || 0),
  };
}

/**
 * Log cart totals in development mode for debugging
 */
export function logCartTotals(
  location: string,
  cartData: any,
  totals: CartTotals,
  cartId?: string
): void {
  if (import.meta.env.DEV) {
    console.group(`🛒 Cart Totals - ${location}`);
    console.log('Cart ID:', cartId || 'N/A');
    console.log('Item Count:', cartData?.items?.length || 0);
    console.log('Subtotal:', totals.subtotal);
    console.log('Discount:', totals.discount);
    console.log('Delivery Fee:', totals.deliveryFee);
    console.log('Tax (VAT):', totals.tax);
    console.log('Total:', totals.total);
    console.groupEnd();
  }
}

/**
 * Get or create guest cart ID from localStorage
 * Ensures consistent cart across checkout flow
 */
export function getGuestCartId(): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    let cartId = localStorage.getItem('guest_cart_id');
    
    if (!cartId) {
      // Generate a new cart ID if none exists
      cartId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('guest_cart_id', cartId);
      
      if (import.meta.env.DEV) {
        console.log('🆕 Created new guest cart ID:', cartId);
      }
    }
    
    return cartId;
  } catch (error) {
    console.error('Failed to access localStorage for guest cart ID:', error);
    return null;
  }
}

/**
 * Clear guest cart ID from localStorage
 * Call this after successful order or when user logs in
 */
export function clearGuestCartId(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem('guest_cart_id');
    
    if (import.meta.env.DEV) {
      console.log('🗑️ Cleared guest cart ID');
    }
  } catch (error) {
    console.error('Failed to clear guest cart ID:', error);
  }
}
