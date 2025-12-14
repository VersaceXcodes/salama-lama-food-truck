import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/store/main';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';
import { ShoppingBag, Trash2, Minus, Plus, Tag, ArrowRight, AlertCircle, Loader2, X, CheckCircle, ShoppingCart } from 'lucide-react';

// ===========================
// Types & Interfaces
// ===========================

interface CartItem {
  cart_item_id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  selected_customizations: Record<string, any> | null;
  line_total: number;
  is_available?: boolean;
}

/* interface PricingSummary {
  subtotal: number;
  discount_code: string | null;
  discount_amount: number;
  delivery_fee: number;
  tax_amount: number;
  total: number;
} */

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
  errors?: Array<{ field: string; message: string; error?: string }>;
}

interface ConfirmDialog {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
}

// ===========================
// Main Component
// ===========================

const UV_Cart: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Global state (individual selectors to avoid infinite loops)
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  
  // Local state
  const [discountCode, setDiscountCode] = useState('');
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [itemLoadingStates, setItemLoadingStates] = useState<Record<string, boolean>>({});
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });
  const [validationErrors, setValidationErrors] = useState<Array<{ field: string; message: string; error?: string }>>([]);

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
    mutationFn: async ({ cart_item_id, quantity }: { cart_item_id: string; quantity: number }) => {
      setItemLoadingStates(prev => ({ ...prev, [cart_item_id]: true }));
      
      const response = await axios.put(
        `${API_BASE_URL}/api/cart/item/${cart_item_id}`,
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
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update quantity. Please try again.'
      });
    },
    onSettled: (_data, _error, variables) => {
      setItemLoadingStates(prev => ({ ...prev, [variables.cart_item_id]: false }));
    }
  });

  // ===========================
  // React Query: Remove Cart Item
  // ===========================

  const removeItemMutation = useMutation({
    mutationFn: async (cart_item_id: string) => {
      const response = await axios.delete(
        `${API_BASE_URL}/api/cart/item/${cart_item_id}`,
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
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || 'Failed to remove item. Please try again.'
      });
    }
  });

  // ===========================
  // React Query: Clear Cart
  // ===========================

  const clearCartMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.delete(
        `${API_BASE_URL}/api/cart`,
        {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast({
        title: 'Success',
        description: 'Cart cleared successfully'
      });
    },
    onError: (error: any) => {
      console.error('Failed to clear cart:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || 'Failed to clear cart. Please try again.'
      });
    }
  });

  // ===========================
  // React Query: Validate Discount Code
  // ===========================

  const validateDiscountMutation = useMutation({
    mutationFn: async (payload: DiscountValidationRequest) => {
      const response = await axios.post<DiscountValidationResponse>(
        `${API_BASE_URL}/api/discount/validate`,
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
        toast({
          title: 'Success',
          description: 'Discount code applied successfully!'
        });
      } else {
        const errorMessage = data.message || 'Invalid discount code';
        setDiscountError(errorMessage);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: errorMessage
        });
      }
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Failed to validate discount code';
      setDiscountError(errorMessage);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage
      });
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
        // Store validation errors to display them
        setValidationErrors(data.errors || []);
        // Also show a toast notification
        toast({
          variant: 'destructive',
          title: 'Items Unavailable',
          description: 'Some items in your cart are no longer available. Please review and remove them.'
        });
      }
    },
    onError: (error: any) => {
      // Handle authentication errors specifically
      if (error.response?.status === 401) {
        toast({
          variant: 'destructive',
          title: 'Authentication Required',
          description: 'Please sign in to proceed with checkout'
        });
        navigate('/login?redirect=/cart');
        return;
      }
      
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || 'Failed to validate cart. Please try again.'
      });
    }
  });

  // ===========================
  // Event Handlers
  // ===========================

  const handleQuantityChange = (cart_item_id: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    updateItemMutation.mutate({ cart_item_id, quantity: newQuantity });
  };

  const handleRemoveItem = (cart_item_id: string, item_name: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Remove Item',
      message: `Remove ${item_name} from cart?`,
      onConfirm: () => {
        removeItemMutation.mutate(cart_item_id);
        setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: () => {} });
      }
    });
  };

  const handleClearCart = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Clear Cart',
      message: `Are you sure you want to remove all items from your cart?`,
      onConfirm: () => {
        clearCartMutation.mutate();
        setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: () => {} });
      }
    });
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

  const handleRemoveDiscount = async () => {
    try {
      await axios.delete(`${API_BASE_URL}/api/discount/remove`, {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      });
      setDiscountCode('');
      setDiscountError(null);
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast({
        title: 'Success',
        description: 'Discount removed successfully'
      });
    } catch (error: any) {
      console.error('Failed to remove discount:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || 'Failed to remove discount'
      });
    }
  };

  const handleProceedToCheckout = () => {
    // Check if user is authenticated before proceeding to checkout
    if (!authToken) {
      toast({
        variant: 'destructive',
        title: 'Authentication Required',
        description: 'Please sign in to proceed with checkout'
      });
      // Redirect to login page with return URL to cart
      navigate('/login?redirect=/cart');
      return;
    }
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
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: 'var(--primary-bg)' }}>
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" style={{ color: 'var(--primary-text)' }} />
          <p className="font-medium" style={{ color: '#4A3B32' }}>Loading your cart...</p>
        </div>
      </div>
    );
  }

  // ===========================
  // Error State
  // ===========================

  if (cartError) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: 'var(--primary-bg)' }}>
        <div className="text-center max-w-md">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--primary-text)' }}>Failed to Load Cart</h2>
          <p className="mb-6" style={{ color: '#4A3B32' }}>
            We couldn't load your cart. Please try again.
          </p>
            <button
              onClick={() => refetchCart()}
              className="px-6 py-3 font-medium rounded-lg transition-colors duration-200"
              style={{ 
                backgroundColor: 'var(--btn-bg)', 
                color: 'var(--btn-text)',
                minHeight: '48px'
              }}
            >
              Retry
            </button>
        </div>
      </div>
    );
  }

  // ===========================
  // Empty Cart State
  // ===========================

  const cartItems = cartData?.items || [];

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: 'var(--primary-bg)' }}>
        <div className="text-center max-w-md">
          <ShoppingBag className="h-24 w-24 text-gray-400 mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-4" style={{ color: 'var(--primary-text)' }}>Your Cart is Empty</h2>
          <p className="mb-8" style={{ color: '#4A3B32' }}>
            Add some delicious items from our menu to get started!
          </p>
            <Link
              to="/menu"
              className="inline-flex items-center px-6 py-3 font-medium rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
              style={{ 
                backgroundColor: 'var(--btn-bg)', 
                color: 'var(--btn-text)',
                minHeight: '48px'
              }}
            >
              Browse Menu
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
        </div>
      </div>
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

  // Helper function to get item name from validation error field
  const getItemNameFromField = (field: string) => {
    // Backend sends item_id directly as the field (not prefixed with 'item_')
    const item = cartItems.find(item => item.item_id === field);
    return item?.item_name || 'Unknown item';
  };

  return (
    <>
      {/* Confirmation Modal */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
            <h3 className="text-xl font-bold text-gray-900 mb-3">{confirmDialog.title}</h3>
            <p className="text-gray-600 mb-6">{confirmDialog.message}</p>
            <div className="flex space-x-3 justify-end">
              <button
                onClick={() => setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: () => {} })}
                className="px-6 py-2.5 border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="px-6 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors duration-200"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Validation Errors Banner */}
      {validationErrors.length > 0 && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-40 max-w-2xl w-full mx-4">
          <div className="bg-red-50 border-2 border-red-300 rounded-xl shadow-lg p-6">
            <div className="flex items-start">
              <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="ml-4 flex-1">
                <h3 className="text-lg font-bold text-red-900 mb-2">Items Unavailable</h3>
                <p className="text-sm text-red-800 mb-3">
                  The following items in your cart are no longer available:
                </p>
                <ul className="space-y-2 mb-4">
                  {validationErrors.map((error, index) => (
                    <li key={index} className="flex items-start text-sm text-red-800">
                      <span className="mr-2">•</span>
                      <span>
                        <strong>{getItemNameFromField(error.field)}</strong> - {error.message}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="text-sm text-red-800 mb-4">
                  Please remove these items from your cart to continue with checkout.
                </p>
                <button
                  onClick={() => setValidationErrors([])}
                  className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors duration-200"
                >
                  Got it
                </button>
              </div>
              <button
                onClick={() => setValidationErrors([])}
                className="ml-4 text-red-600 hover:text-red-800 transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

    
      <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: 'var(--primary-bg)' }}>
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold" style={{ color: 'var(--primary-text)' }}>Shopping Cart</h1>
            <p className="mt-2" style={{ color: '#4A3B32' }}>
              Review your items before checkout
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items Section */}
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => {
                const unitPrice = Number(item.unit_price || 0);
                const lineTotal = Number(item.line_total || 0);
                const isUpdating = itemLoadingStates[item.cart_item_id] || false;
                const isAvailable = item.is_available !== false;

                return (
                  <div
                    key={item.cart_item_id}
                    className={`rounded-xl shadow-md border p-6 transition-all duration-200 hover:shadow-lg ${
                      isAvailable 
                        ? 'bg-white border-gray-200' 
                        : 'bg-red-50 border-red-300 opacity-75'
                    }`}
                  >
                    {!isAvailable && (
                      <div className="mb-3 flex items-start space-x-2 bg-red-100 border border-red-300 rounded-lg p-3">
                        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-red-900">Item No Longer Available</p>
                          <p className="text-xs text-red-700 mt-1">Please remove this item to continue with checkout</p>
                        </div>
                      </div>
                    )}
                    {/* COMMANDMENT #4: Mobile Cart Card Layout */}
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                      <div className="flex-1 w-full">
                        {/* Item Name */}
                        <h3 className={`text-lg lg:text-xl font-bold mb-2 ${isAvailable ? 'text-gray-900' : 'text-gray-500 line-through'}`}>
                          {item.item_name}
                        </h3>

                        {/* Customizations */}
                        {renderCustomizations(item.selected_customizations)}

                        {/* Unit Price */}
                        {isAvailable && (
                          <p className="mt-2 text-base text-gray-600 font-medium">
                            €{unitPrice.toFixed(2)} each
                          </p>
                        )}

                        {/* COMMANDMENT #1: Quantity Controls - 48px min-height */}
                        {isAvailable && (
                          <div className="mt-4 flex items-center justify-between sm:justify-start gap-4">
                            <div className="flex items-center space-x-3">
                              <button
                                onClick={() => handleQuantityChange(item.cart_item_id, item.quantity - 1)}
                                disabled={item.quantity <= 1 || isUpdating}
                                className="w-12 h-12 rounded-xl border-2 border-gray-300 flex items-center justify-center text-gray-700 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                                style={{ minHeight: '48px', minWidth: '48px' }}
                                aria-label="Decrease quantity"
                              >
                                {isUpdating ? (
                                  <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                  <Minus className="h-5 w-5" />
                                )}
                              </button>

                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => {
                                  const newQuantity = parseInt(e.target.value, 10);
                                  if (!isNaN(newQuantity) && newQuantity > 0) {
                                    handleQuantityChange(item.cart_item_id, newQuantity);
                                  }
                                }}
                                disabled={isUpdating}
                                className="w-20 h-12 text-center border-2 border-gray-300 rounded-xl font-bold text-lg text-gray-900 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 disabled:opacity-50"
                                style={{ minHeight: '48px', fontSize: '16px' }}
                                aria-label="Item quantity"
                              />

                              <button
                                onClick={() => handleQuantityChange(item.cart_item_id, item.quantity + 1)}
                                disabled={isUpdating}
                                className="w-12 h-12 rounded-xl border-2 border-gray-300 flex items-center justify-center text-gray-700 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                                style={{ minHeight: '48px', minWidth: '48px' }}
                                aria-label="Increase quantity"
                              >
                                {isUpdating ? (
                                  <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                  <Plus className="h-5 w-5" />
                                )}
                              </button>
                            </div>
                            
                            <div className="text-right sm:hidden">
                              <p className="text-xl font-bold text-gray-900">
                                €{lineTotal.toFixed(2)}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right Side: Line Total and Remove Button */}
                      <div className="flex sm:flex-col items-center sm:items-end gap-3 w-full sm:w-auto">
                        {!isAvailable ? (
                          <button
                            onClick={() => handleRemoveItem(item.cart_item_id, item.item_name)}
                            disabled={removeItemMutation.isPending}
                            className="w-full sm:w-auto px-6 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all duration-200 disabled:opacity-50 flex items-center justify-center space-x-2"
                            style={{ minHeight: '48px' }}
                            aria-label="Remove unavailable item"
                          >
                            <Trash2 className="h-5 w-5" />
                            <span>Remove</span>
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => handleRemoveItem(item.cart_item_id, item.item_name)}
                              disabled={removeItemMutation.isPending}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 p-3 rounded-xl transition-all duration-200 disabled:opacity-50 sm:block hidden"
                              style={{ minHeight: '48px', minWidth: '48px' }}
                              aria-label="Remove item"
                            >
                              <Trash2 className="h-6 w-6" />
                            </button>

                            <div className="text-right hidden sm:block">
                              <p className="text-2xl font-bold text-gray-900">
                                €{lineTotal.toFixed(2)}
                              </p>
                            </div>
                            
                            <button
                              onClick={() => handleRemoveItem(item.cart_item_id, item.item_name)}
                              disabled={removeItemMutation.isPending}
                              className="sm:hidden flex items-center justify-center px-5 py-3 text-red-600 hover:text-red-700 hover:bg-red-50 font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 border-2 border-red-300"
                              style={{ minHeight: '48px' }}
                              aria-label="Remove item"
                            >
                              <Trash2 className="h-5 w-5 mr-2" />
                              Remove
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Continue Shopping and Empty Cart Actions */}
              <div className="pt-4 flex items-center justify-between">
                <Link
                  to="/menu"
                  className="inline-flex items-center text-orange-600 hover:text-orange-700 font-medium transition-colors duration-200"
                >
                  <ArrowRight className="mr-2 h-5 w-5 rotate-180" />
                  Continue Shopping
                </Link>
                <button
                  onClick={handleClearCart}
                  disabled={clearCartMutation.isPending}
                  className="inline-flex items-center px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 font-medium rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Empty cart"
                >
                  {clearCartMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Clearing...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="mr-2 h-5 w-5" />
                      Empty Cart
                    </>
                  )}
                </button>
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
                    className="w-full py-4 font-bold text-lg rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center checkout-btn"
                    style={{ 
                      backgroundColor: 'var(--btn-bg)', 
                      color: 'var(--btn-text)',
                      minHeight: '48px'
                    }}
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
        
        {/* COMMANDMENT #4: Sticky Footer Bar for Mobile - Total Price & Checkout Button */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t-4 border-gray-200 shadow-2xl z-40 lg:hidden" style={{ marginBottom: '16px' }}>
          <div className="px-6 py-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-gray-600 font-medium">Total</p>
              <p className="text-2xl font-bold text-orange-600">
                €{total.toFixed(2)}
              </p>
            </div>
            <button
              onClick={handleProceedToCheckout}
              disabled={validateCheckoutMutation.isPending}
              className="flex-1 max-w-xs py-4 font-bold text-lg rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center"
              style={{ 
                backgroundColor: 'var(--btn-bg)', 
                color: 'var(--btn-text)',
                minHeight: '56px'
              }}
            >
              {validateCheckoutMutation.isPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Validating...
                </>
              ) : (
                <>
                  Checkout
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </button>
          </div>
        </div>
        
        {/* Spacer for sticky footer on mobile */}
        <div className="h-24 lg:hidden" aria-hidden="true" />
      </div>
    </>
  );
};

export default UV_Cart;