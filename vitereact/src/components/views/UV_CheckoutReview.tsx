import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { AlertCircle, CheckCircle, Edit2, Loader2, ShoppingBag, CreditCard, MapPin, Clock, User } from 'lucide-react';
import { calculateCartTotals, logCartTotals, getGuestCartId } from '@/utils/cartTotals';
import OrderSummary from '@/components/checkout/OrderSummary';

// ===========================
// Types & Interfaces
// ===========================

interface CartItem {
  item_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  customizations: Array<{
    group_name: string;
    option_name: string;
    additional_price: number;
  }>;
  line_total: number;
}

interface OrderReview {
  order_type: 'collection' | 'delivery';
  collection_time_slot: string | null;
  delivery_address_snapshot: {
    label: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    postal_code: string;
    delivery_instructions?: string;
  } | null;
  customer_info: {
    customer_name: string;
    customer_email: string;
    customer_phone: string;
  };
  payment_info: {
    payment_method_id: string;
    payment_method_type: string;
    last_four_digits: string;
    card_type: string;
  };
  items: CartItem[];
  special_instructions?: string;
}

interface FinalPricing {
  subtotal: number;
  discount_code: string | null;
  discount_amount: number;
  delivery_fee: number | null;
  tax_amount: number;
  total_amount: number;
}

interface CalculateTotalsResponse {
  subtotal: number;
  discount_code: string | null;
  discount_amount: number;
  delivery_fee: number | null;
  tax_amount: number;
  total_amount: number;
}

interface ValidateOrderResponse {
  valid: boolean;
  errors?: Array<{ message: string }>;
}

interface PlaceOrderRequest {
  order_type: 'collection' | 'delivery';
  collection_time_slot: string | null;
  delivery_address_id: string | null;
  discount_code: string | null;
  special_instructions: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  payment_method_id: string;
  cvv?: string;
  idempotency_key: string;
}

interface PlaceOrderResponse {
  order_id: string;
  order_number: string;
  ticket_number: string;
  tracking_token: string;
  status: string;
  total_amount: number;
  estimated_ready_time: string | null;
  loyalty_points_awarded: number;
  invoice_url: string | null;
}

// ===========================
// Helper Functions
// ===========================

const generate_uuid = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const format_price = (price: number): string => {
  return `€${Number(price || 0).toFixed(2)}`;
};

const format_date_time = (datetime: string | null): string => {
  if (!datetime) return 'Not specified';
  
  try {
    const date = new Date(datetime);
    return date.toLocaleString('en-IE', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return datetime;
  }
};

// ===========================
// Main Component
// ===========================

const UV_CheckoutReview: React.FC = () => {
  const navigate = useNavigate();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

  // ===========================
  // Global State Access (Individual Selectors - CRITICAL)
  // ===========================
  
  const auth_token = useAppStore(state => state.authentication_state.auth_token);
  // const is_authenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  // const current_user = useAppStore(state => state.authentication_state.current_user);
  const clear_cart = useAppStore(state => state.clear_cart);

  // ===========================
  // Authentication Check - REMOVED FOR GUEST CHECKOUT SUPPORT
  // ===========================
  
  // NOTE: Guest checkout is now supported. Users can proceed without authentication.
  // The backend will handle both authenticated and guest orders.

  // ===========================
  // Local State
  // ===========================

  const [complete_order_review, set_complete_order_review] = useState<OrderReview>({
    order_type: 'collection',
    collection_time_slot: null,
    delivery_address_snapshot: null,
    customer_info: {
      customer_name: '',
      customer_email: '',
      customer_phone: '',
    },
    payment_info: {
      payment_method_id: '',
      payment_method_type: '',
      last_four_digits: '',
      card_type: '',
    },
    items: [],
    special_instructions: '',
  });

  const [final_pricing, set_final_pricing] = useState<FinalPricing>({
    subtotal: 0,
    discount_code: null,
    discount_amount: 0,
    delivery_fee: null,
    tax_amount: 0,
    total_amount: 0,
  });

  const [terms_and_conditions_accepted, set_terms_and_conditions_accepted] = useState<boolean>(false);
  const [place_order_error, set_place_order_error] = useState<string | null>(null);
  const [idempotency_key] = useState<string>(generate_uuid());

  // ===========================
  // Fetch Cart Data from API
  // ===========================

  const { data: cart_data, isLoading: is_loading_cart } = useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      try {
        const headers: Record<string, string> = {};
        
        // Add authorization header only if user is authenticated
        if (auth_token && typeof auth_token === 'string') {
          headers['Authorization'] = `Bearer ${auth_token}`;
        }
        
        const response = await axios.get(
          `${API_BASE_URL}/api/cart`,
          { headers }
        );
        return response.data;
      } catch (error: any) {
        console.error('Failed to fetch cart:', error);
        throw error;
      }
    },
    enabled: true, // Always enabled - works for both guest and authenticated users
    staleTime: 30000,
    refetchOnWindowFocus: false,
    retry: 1,
  });


  const cart_items = cart_data?.items || [];
  const cart_discount_code = cart_data?.discount_code || null;
  
  // Get guest cart ID for tracking
  const guestCartId = !auth_token ? getGuestCartId() : null;
  
  // Initialize guest cart tracking on mount
  useEffect(() => {
    if (!auth_token) {
      getGuestCartId(); // Ensure guest cart ID is created early
    }
  }, [auth_token]);

  // ===========================
  // Load Order Review Data (on mount)
  // ===========================

  useEffect(() => {
    // Check if we have previous checkout data in sessionStorage
    const order_type = sessionStorage.getItem('checkout_order_type') as 'collection' | 'delivery' | null;
    const collection_time_slot = sessionStorage.getItem('checkout_collection_time_slot');
    // const delivery_address_id = sessionStorage.getItem('checkout_delivery_address_id');
    const delivery_address_data = sessionStorage.getItem('checkout_delivery_address_data');
    const customer_name = sessionStorage.getItem('checkout_customer_name');
    const customer_email = sessionStorage.getItem('checkout_customer_email');
    const customer_phone = sessionStorage.getItem('checkout_customer_phone');
    const payment_method_id = sessionStorage.getItem('checkout_payment_method_id');
    const payment_method_type = sessionStorage.getItem('checkout_payment_method_type');
    const last_four_digits = sessionStorage.getItem('checkout_last_four_digits');
    const card_type = sessionStorage.getItem('checkout_card_type');
    const special_instructions = sessionStorage.getItem('checkout_special_instructions');

    if (!order_type || !customer_name || !payment_method_id) {
      // Missing required checkout data, redirect back to start
      navigate('/checkout/order-type');
      return;
    }

    // Parse delivery address if exists
    let delivery_address_snapshot = null;
    if (delivery_address_data) {
      try {
        delivery_address_snapshot = JSON.parse(delivery_address_data);
      } catch (error) {
        console.error('Failed to parse delivery address:', error);
      }
    }

    // Assemble complete order review (will be updated when cart_items loads)
    set_complete_order_review({
      order_type: order_type as 'collection' | 'delivery',
      collection_time_slot: collection_time_slot || null,
      delivery_address_snapshot,
      customer_info: {
        customer_name: customer_name || '',
        customer_email: customer_email || '',
        customer_phone: customer_phone || '',
      },
      payment_info: {
        payment_method_id: payment_method_id || '',
        payment_method_type: payment_method_type || 'card',
        last_four_digits: last_four_digits || '',
        card_type: card_type || '',
      },
      items: cart_items,
      special_instructions: special_instructions || '',
    });
  }, [cart_items, navigate]);

  // ===========================
  // Calculate Final Totals (API Call)
  // ===========================

  const { data: calculated_pricing, isLoading: is_calculating_totals } = useQuery<CalculateTotalsResponse>({
    queryKey: ['calculate-checkout-totals', complete_order_review.order_type],
    queryFn: async () => {
      const delivery_address_id = sessionStorage.getItem('checkout_delivery_address_id');
      
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        
        // Add authorization header only if user is authenticated
        if (auth_token && typeof auth_token === 'string') {
          headers['Authorization'] = `Bearer ${auth_token}`;
        }
        
        const response = await axios.post<CalculateTotalsResponse>(
          `${API_BASE_URL}/api/checkout/calculate`,
          {
            order_type: complete_order_review.order_type,
            delivery_address_id: delivery_address_id || null,
            discount_code: cart_discount_code,
          },
          { headers }
        );

        return response.data;
      } catch (error: any) {
        console.error('Failed to calculate totals:', error);
        throw error;
      }
    },
    enabled: !!complete_order_review.order_type, // Enabled for both guest and authenticated users
    staleTime: Infinity, // Don't refetch unless explicitly invalidated
    retry: 1,
  });


  // Update pricing state when API responds
  useEffect(() => {
    if (calculated_pricing) {
      const pricing = {
        subtotal: Number(calculated_pricing.subtotal || 0),
        discount_code: calculated_pricing.discount_code,
        discount_amount: Number(calculated_pricing.discount_amount || 0),
        delivery_fee: calculated_pricing.delivery_fee !== null ? Number(calculated_pricing.delivery_fee) : null,
        tax_amount: Number(calculated_pricing.tax_amount || 0),
        total_amount: Number(calculated_pricing.total_amount || 0),
      };
      
      set_final_pricing(pricing);
      
      // Log cart totals in dev mode
      const totals = calculateCartTotals({
        subtotal: pricing.subtotal,
        discountAmount: pricing.discount_amount,
        deliveryFee: pricing.delivery_fee || 0,
        taxAmount: pricing.tax_amount,
      });
      
      logCartTotals('Review Step', { items: cart_items }, totals, guestCartId || 'authenticated');
    }
  }, [calculated_pricing, cart_items, guestCartId]);

  // ===========================
  // Validate Order Mutation
  // ===========================

  const validate_order_mutation = useMutation<ValidateOrderResponse, Error, void>({
    mutationFn: async () => {
      const delivery_address_id = sessionStorage.getItem('checkout_delivery_address_id');
      
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        
        // Add authorization header only if user is authenticated
        if (auth_token && typeof auth_token === 'string') {
          headers['Authorization'] = `Bearer ${auth_token}`;
        }
        
        const response = await axios.post<ValidateOrderResponse>(
          `${API_BASE_URL}/api/checkout/validate`,
          {
            order_type: complete_order_review.order_type,
            collection_time_slot: complete_order_review.collection_time_slot,
            delivery_address_id: delivery_address_id || null,
            discount_code: cart_discount_code,
          },
          { headers }
        );

        return response.data;
      } catch (error: any) {
        console.error('Order validation failed:', error);
        throw error;
      }
    },
  });

  // ===========================
  // Place Order Mutation
  // ===========================

  const place_order_mutation = useMutation<PlaceOrderResponse, Error, PlaceOrderRequest>({
    mutationFn: async (order_data: PlaceOrderRequest) => {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        
        // Add authorization header only if user is authenticated
        if (auth_token && typeof auth_token === 'string') {
          headers['Authorization'] = `Bearer ${auth_token}`;
        }
        
        const response = await axios.post<PlaceOrderResponse>(
          `${API_BASE_URL}/api/checkout/order`,
          order_data,
          { headers }
        );

        return response.data;
      } catch (error: any) {
        console.error('Order placement failed:', error);
        throw error;
      }
    },
    onSuccess: (data: PlaceOrderResponse) => {
      // Clear cart from global state
      clear_cart();

      // Save order to localStorage for guest tracking
      localStorage.setItem('lastOrder', JSON.stringify({
        ticket_number: data.ticket_number,
        tracking_token: data.tracking_token,
        order_id: data.order_id,
        order_number: data.order_number,
        created_at: new Date().toISOString(),
      }));

      // Clear checkout session data
      sessionStorage.removeItem('checkout_order_type');
      sessionStorage.removeItem('checkout_collection_time_slot');
      sessionStorage.removeItem('checkout_delivery_address_id');
      sessionStorage.removeItem('checkout_delivery_address_data');
      sessionStorage.removeItem('checkout_customer_name');
      sessionStorage.removeItem('checkout_customer_email');
      sessionStorage.removeItem('checkout_customer_phone');
      sessionStorage.removeItem('checkout_payment_method_id');
      sessionStorage.removeItem('checkout_payment_method_type');
      sessionStorage.removeItem('checkout_last_four_digits');
      sessionStorage.removeItem('checkout_card_type');
      sessionStorage.removeItem('checkout_special_instructions');

      // Navigate to order confirmation with ticket and tracking data via URL params
      const params = new URLSearchParams({
        ticket: data.ticket_number || '',
        token: data.tracking_token || '',
        order_number: data.order_number || '',
        order_type: complete_order_review.order_type || '',
        total: String(data.total_amount || 0),
        points: String(data.loyalty_points_awarded || 0),
        status: data.status || 'received',
      });
      navigate(`/order-confirmation?${params.toString()}`, { replace: true });
    },
    onError: (error: any) => {
      const error_message = error.response?.data?.message || error.message || 'Failed to place order. Please try again.';
      set_place_order_error(error_message);
    },
  });

  // ===========================
  // Handle Place Order
  // ===========================

  const handle_place_order = async () => {
    // Clear any previous errors
    set_place_order_error(null);

    // Validate terms acceptance
    if (!terms_and_conditions_accepted) {
      set_place_order_error('Please accept the Terms & Conditions to continue.');
      return;
    }

    try {
      // Step 1: Validate order
      const validation_result = await validate_order_mutation.mutateAsync();

      if (!validation_result.valid) {
        const error_messages = validation_result.errors?.map(e => e.message).join(', ') || 'Order validation failed';
        set_place_order_error(error_messages);
        return;
      }

      // Step 2: Place order
      const delivery_address_id = sessionStorage.getItem('checkout_delivery_address_id');
      const cvv = sessionStorage.getItem('checkout_cvv'); // CVV from previous step (if applicable)

      const order_request: PlaceOrderRequest = {
        order_type: complete_order_review.order_type,
        collection_time_slot: complete_order_review.collection_time_slot,
        delivery_address_id: delivery_address_id || null,
        discount_code: cart_discount_code,
        special_instructions: complete_order_review.special_instructions || null,
        customer_name: complete_order_review.customer_info.customer_name,
        customer_email: complete_order_review.customer_info.customer_email,
        customer_phone: complete_order_review.customer_info.customer_phone,
        payment_method_id: complete_order_review.payment_info.payment_method_id,
        cvv: cvv || undefined,
        idempotency_key: idempotency_key,
      };

      await place_order_mutation.mutateAsync(order_request);

    } catch (error: any) {
      // Error is handled in mutation onError
      console.error('Order placement error:', error);
    }
  };

  // ===========================
  // Handle Edit Sections
  // ===========================

  const handle_edit_order_type = () => {
    navigate('/checkout/order-type');
  };

  const handle_edit_contact = () => {
    navigate('/checkout/contact');
  };

  const handle_edit_payment = () => {
    navigate('/checkout/payment');
  };

  // ===========================
  // Loading State
  // ===========================

  const is_loading = place_order_mutation.isPending || validate_order_mutation.isPending;

  // Show loading if cart is still loading
  if (is_loading_cart) {
    return (
      <>
        <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 flex items-center justify-center" style={{ backgroundColor: 'var(--primary-bg)' }}>
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" style={{ color: 'var(--primary-text)' }} />
            <p className="font-medium" style={{ color: '#4A3B32' }}>Loading your order details...</p>
          </div>
        </div>
      </>
    );
  }

  // Show error if cart is empty
  if (!is_loading_cart && cart_items.length === 0) {
    return (
      <>
        <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 flex items-center justify-center" style={{ backgroundColor: 'var(--primary-bg)' }}>
          <div className="text-center max-w-md">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--primary-text)' }}>Cart is Empty</h2>
            <p className="mb-6" style={{ color: '#4A3B32' }}>
              Your cart is empty. Please add items before proceeding to checkout.
            </p>
            <button
              onClick={() => navigate('/menu')}
              className="px-6 py-3 font-medium rounded-lg transition-colors duration-200"
              style={{ 
                backgroundColor: 'var(--btn-bg)', 
                color: 'var(--btn-text)',
                minHeight: '48px'
              }}
            >
              Browse Menu
            </button>
          </div>
        </div>
      </>
    );
  }

  // ===========================
  // Render
  // ===========================

  return (
    <>
      <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: 'var(--primary-bg)' }}>
        <div className="max-w-4xl mx-auto">
          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium" style={{ color: '#4A3B32' }}>Checkout Progress</span>
              <span className="text-sm font-medium" style={{ color: 'var(--primary-text)' }}>Step 4 of 4</span>
            </div>
            <div className="w-full rounded-full h-2" style={{ backgroundColor: 'var(--accent-color)' }}>
              <div className="h-2 rounded-full transition-all duration-300" style={{ width: '100%', backgroundColor: 'var(--primary-text)' }}></div>
            </div>
          </div>

          {/* Page Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl lg:text-4xl font-bold mb-2" style={{ color: 'var(--primary-text)' }}>Review Your Order</h1>
            <p style={{ color: '#4A3B32' }}>Please review your order details before completing your purchase</p>
          </div>

          {/* Error Alert */}
          {place_order_error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-600 p-4 rounded-md shadow-sm">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-semibold text-red-800 mb-1">Order Placement Error</h3>
                  <p className="text-sm text-red-700">{place_order_error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Order Details Column */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Order Type & Time/Address Section */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                    {complete_order_review.order_type === 'collection' ? (
                      <>
                        <Clock className="h-5 w-5 text-orange-600 mr-2" />
                        Collection Details
                      </>
                    ) : (
                      <>
                        <MapPin className="h-5 w-5 text-orange-600 mr-2" />
                        Delivery Details
                      </>
                    )}
                  </h2>
                  <button
                    onClick={handle_edit_order_type}
                    className="text-orange-600 hover:text-orange-700 text-sm font-medium flex items-center transition-colors"
                  >
                    <Edit2 className="h-4 w-4 mr-1" />
                    Edit
                  </button>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Order Type</p>
                    <p className="text-base font-medium text-gray-900 capitalize">
                      {complete_order_review.order_type}
                    </p>
                  </div>

                  {complete_order_review.order_type === 'collection' && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Collection Time</p>
                      <p className="text-base font-medium text-gray-900">
                        {format_date_time(complete_order_review.collection_time_slot)}
                      </p>
                    </div>
                  )}

                  {complete_order_review.order_type === 'delivery' && complete_order_review.delivery_address_snapshot && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Delivery Address</p>
                      <div className="text-base text-gray-900">
                        <p className="font-medium">{complete_order_review.delivery_address_snapshot.label}</p>
                        <p>{complete_order_review.delivery_address_snapshot.address_line1}</p>
                        {complete_order_review.delivery_address_snapshot.address_line2 && (
                          <p>{complete_order_review.delivery_address_snapshot.address_line2}</p>
                        )}
                        <p>
                          {complete_order_review.delivery_address_snapshot.city}, {complete_order_review.delivery_address_snapshot.postal_code}
                        </p>
                        {complete_order_review.delivery_address_snapshot.delivery_instructions && (
                          <p className="text-sm text-gray-600 mt-2">
                            <span className="font-medium">Instructions:</span> {complete_order_review.delivery_address_snapshot.delivery_instructions}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Contact Information Section */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                    <User className="h-5 w-5 text-orange-600 mr-2" />
                    Contact Information
                  </h2>
                  <button
                    onClick={handle_edit_contact}
                    className="text-orange-600 hover:text-orange-700 text-sm font-medium flex items-center transition-colors"
                  >
                    <Edit2 className="h-4 w-4 mr-1" />
                    Edit
                  </button>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Name</p>
                    <p className="text-base font-medium text-gray-900">{complete_order_review.customer_info.customer_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Email</p>
                    <p className="text-base font-medium text-gray-900">{complete_order_review.customer_info.customer_email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Phone</p>
                    <p className="text-base font-medium text-gray-900">{complete_order_review.customer_info.customer_phone}</p>
                  </div>
                </div>
              </div>

              {/* Payment Method Section */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                    <CreditCard className="h-5 w-5 text-orange-600 mr-2" />
                    Payment Method
                  </h2>
                  <button
                    onClick={handle_edit_payment}
                    className="text-orange-600 hover:text-orange-700 text-sm font-medium flex items-center transition-colors"
                  >
                    <Edit2 className="h-4 w-4 mr-1" />
                    Edit
                  </button>
                </div>
                
                <div className="flex items-center">
                  <div className="bg-gray-100 rounded-lg px-4 py-3 flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Card Type</p>
                        <p className="text-base font-medium text-gray-900">{complete_order_review.payment_info.card_type}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600 mb-1">Ending in</p>
                        <p className="text-base font-medium text-gray-900">•••• {complete_order_review.payment_info.last_four_digits}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Items Section */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <ShoppingBag className="h-5 w-5 text-orange-600 mr-2" />
                  Order Items ({complete_order_review.items.length})
                </h2>
                
                <div className="space-y-4">
                  {complete_order_review.items.map((item, index) => (
                    <div key={`${item.item_id}-${index}`} className="border-b border-gray-200 pb-4 last:border-b-0 last:pb-0">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{item.item_name}</h3>
                          <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                        </div>
                        <p className="font-semibold text-gray-900">{format_price(item.line_total)}</p>
                      </div>
                      
                      {item.customizations && item.customizations.length > 0 && (
                        <div className="mt-2 pl-4 border-l-2 border-orange-200">
                          <p className="text-xs font-medium text-gray-700 mb-1">Customizations:</p>
                          {item.customizations.map((custom, idx) => (
                            <p key={idx} className="text-sm text-gray-600">
                              {custom.group_name}: {custom.option_name}
                              {custom.additional_price > 0 && (
                                <span className="text-orange-600 ml-1">+{format_price(custom.additional_price)}</span>
                              )}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {complete_order_review.special_instructions && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mb-1">Special Instructions:</p>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">{complete_order_review.special_instructions}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Pricing Summary Column */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 sticky top-24">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Summary</h2>
                
                {is_calculating_totals ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 text-orange-600 animate-spin" />
                  </div>
                ) : (
                  <OrderSummary
                    totals={calculateCartTotals({
                      subtotal: final_pricing.subtotal,
                      discountAmount: final_pricing.discount_amount,
                      deliveryFee: final_pricing.delivery_fee || 0,
                      taxAmount: final_pricing.tax_amount,
                    })}
                    discountCode={final_pricing.discount_code}
                    hasDiscount={!!final_pricing.discount_code && final_pricing.discount_amount > 0}
                    showDeliveryFee={true}
                    showTax={true}
                  />
                )}

                {/* Terms & Conditions */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <label className="flex items-start cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={terms_and_conditions_accepted}
                      onChange={(e) => {
                        set_terms_and_conditions_accepted(e.target.checked);
                        if (e.target.checked) {
                          set_place_order_error(null);
                        }
                      }}
                      className="h-5 w-5 text-orange-600 border-gray-300 rounded focus:ring-2 focus:ring-orange-500 mt-0.5 flex-shrink-0"
                    />
                    <span className="ml-3 text-sm text-gray-700 group-hover:text-gray-900">
                      I agree to the{' '}
                      <Link to="/terms" target="_blank" className="text-orange-600 hover:text-orange-700 font-medium underline">
                        Terms & Conditions
                      </Link>
                      {' '}and{' '}
                      <Link to="/privacy" target="_blank" className="text-orange-600 hover:text-orange-700 font-medium underline">
                        Privacy Policy
                      </Link>
                    </span>
                  </label>
                </div>

                {/* Place Order Button */}
                <button
                  onClick={handle_place_order}
                  disabled={!terms_and_conditions_accepted || is_loading || is_calculating_totals}
                  className="w-full mt-6 px-6 py-4 rounded-lg font-semibold text-lg focus:outline-none focus:ring-4 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center"
                  style={{ 
                    backgroundColor: 'var(--btn-bg)', 
                    color: 'var(--btn-text)',
                    minHeight: '48px'
                  }}
                >
                  {is_loading ? (
                    <>
                      <Loader2 className="animate-spin h-5 w-5 mr-2" />
                      Processing Order...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Place Order
                    </>
                  )}
                </button>

                <p className="text-xs text-gray-500 text-center mt-3">
                  Your payment is secured via SumUp
                </p>
              </div>
            </div>
          </div>

          {/* Back to Cart Link */}
          <div className="mt-8 text-center">
            <Link
              to="/cart"
              className="text-orange-600 hover:text-orange-700 font-medium text-sm inline-flex items-center transition-colors"
            >
              ← Back to Cart
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_CheckoutReview;