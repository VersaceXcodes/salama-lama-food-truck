import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/store/main';
import axios from 'axios';
import { ShoppingBag, Trash2, Minus, Plus, Tag, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';

// ===========================
// Types & Interfaces
// ===========================

interface CartItem {
  item_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  selected_customizations: Record<string, any> | null;
  line_total: number;
}

interface PricingSummary {
  subtotal: number;
  discount_code: string | null;
  discount_amount: number;
  delivery_fee: number;
  tax_amount: number;
  total: number;
}

interface CartResponse {
  items: CartItem[];
  subtotal: number;
  discount_code: string | null;
  discount_amount: number;
  delivery_fee: number;
  tax_amount: number;
  total: number;
}

interface DiscountValidationRequest {
  code: string;
  order_type: string;
  order_value: number;
}

interface DiscountValidationResponse {
  valid: boolean;
  discount_amount: number;
  message?: string;
}

interface CheckoutValidationResponse {
  valid: boolean;
  errors?: Array<{ field: string; message: string }>;
}

// ===========================
// Main Component
// ===========================

const UV_Cart: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Global state (individual selectors to avoid infinite loops)
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  
  // Local state
  const [discountCode, setDiscountCode] = useState('');
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [itemLoadingStates, setItemLoadingStates] = useState<Record<string, boolean>>({});

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

  // ===========================
  // React Query: Fetch Cart
  // ===========================

  const {
    data: cartData,
    isLoading: isCartLoading,
    error: cartError,
    refetch: refetchCart
  } = useQuery<CartResponse>({
    queryKey: ['cart'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/cart`, {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      });
      return response.data;
    },
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
    retry: 1
  });

  // ===========================
  // React Query: Update Item Quantity
  // ===========================

  const updateItemMutation = useMutation({
    mutationFn: async ({ item_id, quantity }: { item_id: string; quantity: number }) => {
      setItemLoadingStates(prev => ({ ...prev, [item_id]: true }));
      
      const response = await axios.put(
        `${API_BASE_URL}/api/cart/items/${item_id}`,
        { quantity },
        {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
    onError: (error: any) => {
      console.error('Failed to update item quantity:', error);
      alert(error.response?.data?.message || 'Failed to update quantity. Please try again.');
    },
    onSettled: (data, error, variables) => {
      setItemLoadingStates(prev => ({ ...prev, [variables.item_id]: false }));
    }
  });

  // ===========================
  // React Query: Remove Cart Item
  // ===========================

  const removeItemMutation = useMutation({
    mutationFn: async (item_id: string) => {
      const response = await axios.delete(
        `${API_BASE_URL}/api/cart/items/${item_id}`,
        {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
    onError: (error: any) => {
      console.error('Failed to remove item:', error);
      alert(error.response?.data?.message || 'Failed to remove item. Please try again.');
    }
  });

  // ===========================
  // React Query: Validate Discount Code
  // ===========================

  const validateDiscountMutation = useMutation({
    mutationFn: async (payload: DiscountValidationRequest) => {
      const response = await axios.post<DiscountValidationResponse>(
        `${API_BASE_URL}/api/discounts/validate`,
        payload,
        {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      if (data.valid) {
        setDiscountError(null);
        setDiscountCode('');
        queryClient.invalidateQueries({ queryKey: ['cart'] });
      } else {
        setDiscountError(data.message || 'Invalid discount code');
      }
    },
    onError: (error: any) => {
      setDiscountError(error.response?.data?.message || 'Failed to validate discount code');
    }
  });

  // ===========================
  // React Query: Validate Cart for Checkout
  // ===========================

  const validateCheckoutMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.post<CheckoutValidationResponse>(
        `${API_BASE_URL}/api/checkout/validate`,
        { order_type: 'collection' },
        {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      if (data.valid) {
        navigate('/checkout/order-type');
      } else {
        const errorMessage = data.errors?.map(e => e.message).join(', ') || 'Cart validation failed';
        alert(errorMessage);
      }
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to validate cart. Please try again.');
    }
  });

  // ===========================
  // Event Handlers
  // ===========================

  const handleQuantityChange = (item_id: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    updateItemMutation.mutate({ item_id, quantity: newQuantity });
  };

  const handleRemoveItem = (item_id: string, item_name: string) => {
    if (confirm(`Remove ${item_name} from cart?`)) {
      removeItemMutation.mutate(item_id);
    }
  };

  const handleApplyDiscount = () => {
    if (!discountCode.trim()) {
      setDiscountError('Please enter a discount code');
      return;
    }

    const subtotal = Number(cartData?.subtotal || 0);
    
    validateDiscountMutation.mutate({
      code: discountCode.trim().toUpperCase(),
      order_type: 'collection',
      order_value: subtotal
    });
  };

  const handleRemoveDiscount = () => {
    // Remove discount by clearing it from cart
    // This would typically call an API endpoint to remove the discount
    setDiscountCode('');
    setDiscountError(null);
    queryClient.invalidateQueries({ queryKey: ['cart'] });
  };

  const handleProceedToCheckout = () => {
    validateCheckoutMutation.mutate();
  };

  const handleDiscountInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDiscountCode(e.target.value);
    setDiscountError(null); // Clear error on input change
  };

  // ===========================
  // Render Helpers
  // ===========================

  const renderCustomizations = (customizations: Record<string, any> | null) => {
    if (!customizations || Object.keys(customizations).length === 0) {
      return null;
    }

    const customizationArray = Object.entries(customizations).map(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        return `${key}: ${value.name || value}${value.additional_price ? ` (+€${Number(value.additional_price || 0).toFixed(2)})` : ''}`;
      }
      return `${key}: ${value}`;
    });

    return (
      <div className="mt-1 text-sm text-gray-600">
        {customizationArray.join(', ')}
      </div>
    );
  };

  // ===========================
  // Loading State
  // ===========================

  if (isCartLoading) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Loader2 className="h-12 w-12 text-orange-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600 font-medium">Loading your cart...</p>
          </div>
        </div>
      </>
    );
  }

  // ===========================
  // Error State
  // ===========================

  if (cartError) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-md">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Failed to Load Cart</h2>
            <p className="text-gray-600 mb-6">
              We couldn't load your cart. Please try again.
            </p>
            <button
              onClick={() => refetchCart()}
              className="px-6 py-3 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-colors duration-200"
            >
              Retry
            </button>
          </div>
        </div>
      </>
    );
  }

  // ===========================
  // Empty Cart State
  // ===========================

  const cartItems = cartData?.items || [];

  if (cartItems.length === 0) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-md">
            <ShoppingBag className="h-24 w-24 text-gray-400 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Your Cart is Empty</h2>
            <p className="text-gray-600 mb-8">
              Add some delicious items from our menu to get started!
            </p>
            <Link
              to="/menu"
              className="inline-flex items-center px-6 py-3 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-colors duration-200 shadow-lg hover:shadow-xl"
            >
              Browse Menu
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>
      </>
    );
  }

  // ===========================
  // Cart with Items
  // ===========================

  // Convert numeric fields from PostgreSQL strings
  const subtotal = Number(cartData?.subtotal || 0);
  const discountAmount = Number(cartData?.discount_amount || 0);
  const deliveryFee = Number(cartData?.delivery_fee || 0);
  const taxAmount = Number(cartData?.tax_amount || 0);
  const total = Number(cartData?.total || 0);
  const hasDiscount = cartData?.discount_code && discountAmount > 0;

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Shopping Cart</h1>
            <p className="mt-2 text-gray-600">
              Review your items before checkout
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items Section */}
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => {
                const unitPrice = Number(item.unit_price || 0);
                const lineTotal = Number(item.line_total || 0);
                const isUpdating = itemLoadingStates[item.item_id] || false;

                return (
                  <div
                    key={item.item_id}
                    className="bg-white rounded-xl shadow-md border border-gray-200 p-6 transition-all duration-200 hover:shadow-lg"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Item Name */}
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {item.item_name}
                        </h3>

                        {/* Customizations */}
                        {renderCustomizations(item.selected_customizations)}

                        {/* Unit Price */}
                        <p className="mt-2 text-sm text-gray-500">
                          €{unitPrice.toFixed(2)} each
                        </p>

                        {/* Quantity Selector */}
                        <div className="mt-4 flex items-center space-x-3">
                          <button
                            onClick={() => handleQuantityChange(item.item_id, item.quantity - 1)}
                            disabled={item.quantity <= 1 || isUpdating}
                            className="w-10 h-10 rounded-lg border-2 border-gray-300 flex items-center justify-center text-gray-700 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                            aria-label="Decrease quantity"
                          >
                            {isUpdating ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Minus className="h-4 w-4" />
                            )}
                          </button>

                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => {
                              const newQuantity = parseInt(e.target.value, 10);
                              if (!isNaN(newQuantity) && newQuantity > 0) {
                                handleQuantityChange(item.item_id, newQuantity);
                              }
                            }}
                            disabled={isUpdating}
                            className="w-16 h-10 text-center border-2 border-gray-300 rounded-lg font-medium text-gray-900 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 disabled:opacity-50"
                            aria-label="Item quantity"
                          />

                          <button
                            onClick={() => handleQuantityChange(item.item_id, item.quantity + 1)}
                            disabled={isUpdating}
                            className="w-10 h-10 rounded-lg border-2 border-gray-300 flex items-center justify-center text-gray-700 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                            aria-label="Increase quantity"
                          >
                            {isUpdating ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Plus className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Right Side: Line Total and Remove Button */}
                      <div className="ml-4 flex flex-col items-end space-y-3">
                        <button
                          onClick={() => handleRemoveItem(item.item_id, item.item_name)}
                          disabled={removeItemMutation.isPending}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-all duration-200 disabled:opacity-50"
                          aria-label="Remove item"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>

                        <div className="text-right">
                          <p className="text-xl font-bold text-gray-900">
                            €{lineTotal.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Continue Shopping Link */}
              <div className="pt-4">
                <Link
                  to="/menu"
                  className="inline-flex items-center text-orange-600 hover:text-orange-700 font-medium transition-colors duration-200"
                >
                  <ArrowRight className="mr-2 h-5 w-5 rotate-180" />
                  Continue Shopping
                </Link>
              </div>
            </div>

            {/* Order Summary Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 sticky top-24">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Order Summary</h2>

                {/* Discount Code Section */}
                <div className="mb-6 pb-6 border-b border-gray-200">
                  <label htmlFor="discount-code" className="block text-sm font-medium text-gray-700 mb-2">
                    Discount Code
                  </label>
                  
                  {hasDiscount ? (
                    <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                      <div className="flex items-center">
                        <Tag className="h-5 w-5 text-green-600 mr-2" />
                        <span className="font-medium text-green-900">{cartData.discount_code}</span>
                      </div>
                      <button
                        onClick={handleRemoveDiscount}
                        className="text-sm text-red-600 hover:text-red-700 font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex space-x-2">
                        <input
                          id="discount-code"
                          type="text"
                          value={discountCode}
                          onChange={handleDiscountInputChange}
                          placeholder="Enter code"
                          className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all duration-200"
                        />
                        <button
                          onClick={handleApplyDiscount}
                          disabled={validateDiscountMutation.isPending || !discountCode.trim()}
                          className="px-6 py-2 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                        >
                          {validateDiscountMutation.isPending ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            'Apply'
                          )}
                        </button>
                      </div>
                      
                      {discountError && (
                        <div className="flex items-start text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
                          <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                          <span>{discountError}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Pricing Breakdown */}
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-gray-700">
                    <span>Subtotal</span>
                    <span className="font-medium">€{subtotal.toFixed(2)}</span>
                  </div>

                  {hasDiscount && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span className="font-medium">-€{discountAmount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-gray-700">
                    <span>Delivery Fee</span>
                    <span className="font-medium">
                      {deliveryFee > 0 ? `€${deliveryFee.toFixed(2)}` : 'Free'}
                    </span>
                  </div>

                  <div className="flex justify-between text-gray-700">
                    <span>Tax (VAT)</span>
                    <span className="font-medium">€{taxAmount.toFixed(2)}</span>
                  </div>

                  <div className="pt-3 border-t-2 border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-gray-900">Total</span>
                      <span className="text-2xl font-bold text-orange-600">
                        €{total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Checkout Button */}
                <button
                  onClick={handleProceedToCheckout}
                  disabled={validateCheckoutMutation.isPending}
                  className="w-full py-4 bg-orange-600 text-white font-bold text-lg rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center"
                >
                  {validateCheckoutMutation.isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Validating...
                    </>
                  ) : (
                    <>
                      Proceed to Checkout
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </button>

                {/* Security Note */}
                <p className="mt-4 text-xs text-center text-gray-500">
                  Secure checkout powered by SumUp
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_Cart;