import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/store/main';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';
import { ShoppingBag, Trash2, Minus, Plus, Tag, ArrowRight, AlertCircle, Loader2, X, ShoppingCart, WifiOff } from 'lucide-react';
import { CHECKOUT_PATH } from '@/lib/constants';
import { calculateCartTotals, parseCartData, logCartTotals, getGuestCartId } from '@/utils/cartTotals';
import OrderSummary from '@/components/checkout/OrderSummary';

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
  is_builder_item?: boolean;
  builder_selections?: any;
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
  
  // Local cart state from Zustand store (synced from API as single source of truth)
  const localCartItems = useAppStore(state => state.cart_state.items);
  const localCartSubtotal = useAppStore(state => state.cart_state.subtotal);
  const localCartDiscountCode = useAppStore(state => state.cart_state.discount_code);
  const localCartDiscountAmount = useAppStore(state => state.cart_state.discount_amount);
  const localCartDeliveryFee = useAppStore(state => state.cart_state.delivery_fee);
  const localCartTaxAmount = useAppStore(state => state.cart_state.tax_amount);
  const localCartTotal = useAppStore(state => state.cart_state.total);
  const isCartHydrated = useAppStore(state => state.cart_state.isHydrated);
  
  // Cart actions for local state updates
  const updateCartQuantity = useAppStore(state => state.update_cart_quantity);
  const removeFromCart = useAppStore(state => state.remove_from_cart);
  const clearCart = useAppStore(state => state.clear_cart);
  const syncCartFromApi = useAppStore(state => state.sync_cart_from_api);
  const setCartHydrated = useAppStore(state => state.set_cart_hydrated);
  
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
  const [syncWarning, setSyncWarning] = useState<string | null>(null); // Warning when API sync fails
  const [usingLocalCart, setUsingLocalCart] = useState(false); // Track if we're using local fallback

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
  
  // Create axios instance with credentials (for guest session cookies)
  const axiosWithCredentials = useMemo(() => {
    return axios.create({
      baseURL: API_BASE_URL,
      withCredentials: true, // Send cookies for guest sessions
    });
  }, [API_BASE_URL]);

  // Get guest cart ID for tracking (initialize early for guest users)
  const guestCartId = !authToken ? getGuestCartId() : null;
  
  // Initialize guest cart tracking on mount (only runs once)
  useEffect(() => {
    if (!authToken) {
      getGuestCartId(); // Ensure guest cart ID is created early
    }
  }, [authToken]);

  // ===========================
  // React Query: Fetch Cart
  // ===========================

  const {
    data: serverCartData,
    isLoading: isCartLoading,
    error: cartError,
    refetch: refetchCart
  } = useQuery<CartResponse>({
    queryKey: ['cart'],
    queryFn: async () => {
      const response = await axiosWithCredentials.get('/api/cart', {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      });
      // Clear sync warning on successful fetch
      setSyncWarning(null);
      setUsingLocalCart(false);
      return response.data;
    },
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
    retry: 2, // Retry twice before failing
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 3000),
  });
  
  // Build local cart data from Zustand store as fallback
  const localCartData = useMemo<CartResponse | null>(() => {
    if (localCartItems.length === 0) return null;
    
    return {
      items: localCartItems.map((item, index) => ({
        cart_item_id: item.item_id || `local_${index}`,
        item_id: item.item_id,
        item_name: item.item_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        selected_customizations: item.customizations ? 
          item.customizations.reduce((acc, c) => ({ ...acc, [c.group_name]: { name: c.option_name, additional_price: c.additional_price } }), {}) 
          : null,
        line_total: item.line_total,
        is_available: true
      })),
      subtotal: localCartSubtotal,
      discount_code: localCartDiscountCode,
      discount_amount: localCartDiscountAmount,
      delivery_fee: localCartDeliveryFee,
      tax_amount: localCartTaxAmount,
      total: localCartTotal
    };
  }, [localCartItems, localCartSubtotal, localCartDiscountCode, localCartDiscountAmount, localCartDeliveryFee, localCartTaxAmount, localCartTotal]);
  
  // Use server data if available, otherwise fallback to local cart
  const cartData = useMemo<CartResponse | null>(() => {
    // If server data is available and no error, use it
    if (serverCartData && !cartError) {
      return serverCartData;
    }
    
    // If there's an error but we have local cart data, use local as fallback
    if (cartError && localCartData) {
      // Set warning message based on error type
      const errorMessage = (cartError as any)?.response?.data?.message || 
                          (cartError as any)?.message || 
                          'Unknown error';
      const errorCode = (cartError as any)?.response?.data?.error_code || '';
      const statusCode = (cartError as any)?.response?.status;
      
      // Log the error for debugging
      console.warn('[CART] API fetch failed, using local cart:', {
        status: statusCode,
        error_code: errorCode,
        message: errorMessage
      });
      
      // Only show sync warning if we haven't already
      if (!usingLocalCart) {
        setUsingLocalCart(true);
        setSyncWarning("We couldn't sync your cart with the server. Your items are still saved locally.");
      }
      
      return localCartData;
    }
    
    // If server data is available (even if there was a previous error), use it
    if (serverCartData) {
      return serverCartData;
    }
    
    // Last resort: return local cart data if available
    return localCartData;
  }, [serverCartData, cartError, localCartData, usingLocalCart]);
  
  // ===========================
  // Sync API cart data to Zustand (single source of truth)
  // ===========================
  
  useEffect(() => {
    if (serverCartData && !cartError) {
      // Sync API data to Zustand so floating cart bar shows the same data
      syncCartFromApi(serverCartData);
      
      // Dev logging for cart consistency
      if (import.meta.env.DEV) {
        console.log('[CART PAGE] API data synced to Zustand:', {
          itemCount: serverCartData.items?.length || 0,
          total: serverCartData.total,
          hydrated: true,
        });
      }
    }
  }, [serverCartData, cartError, syncCartFromApi]);

  // Mark cart as hydrated even if API fails but we have local data
  useEffect(() => {
    if (!isCartLoading && cartError && localCartItems.length > 0 && !isCartHydrated) {
      setCartHydrated(true);
    }
  }, [isCartLoading, cartError, localCartItems.length, isCartHydrated, setCartHydrated]);

  // Mark cart as hydrated when API returns empty
  useEffect(() => {
    if (!isCartLoading && serverCartData && serverCartData.items?.length === 0 && !isCartHydrated) {
      setCartHydrated(true);
    }
  }, [isCartLoading, serverCartData, isCartHydrated, setCartHydrated]);
  
  // Log cart totals in dev mode (only when cartData changes, not on every render)
  useEffect(() => {
    if (cartData) {
      const totalsForLogging = calculateCartTotals(parseCartData(cartData));
      logCartTotals('Shopping Cart Page', cartData, totalsForLogging, guestCartId || 'authenticated');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartData]);

  // ===========================
  // React Query: Update Item Quantity
  // ===========================

  const updateItemMutation = useMutation({
    mutationFn: async ({ cart_item_id, quantity, item_id }: { cart_item_id: string; quantity: number; item_id?: string }) => {
      setItemLoadingStates(prev => ({ ...prev, [cart_item_id]: true }));
      
      try {
        const response = await axiosWithCredentials.put(
          `/api/cart/item/${cart_item_id}`,
          { quantity },
          {
            headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
          }
        );
        return response.data;
      } catch (error: any) {
        // If server update fails, update local state as fallback
        if (item_id && usingLocalCart) {
          updateCartQuantity(item_id, quantity);
          return { success: true, local: true };
        }
        throw error;
      }
    },
    onSuccess: (data) => {
      if (!data?.local) {
        queryClient.invalidateQueries({ queryKey: ['cart'] });
      }
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
    mutationFn: async ({ cart_item_id, item_id }: { cart_item_id: string; item_id?: string }) => {
      try {
        const response = await axiosWithCredentials.delete(
          `/api/cart/item/${cart_item_id}`,
          {
            headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
          }
        );
        return response.data;
      } catch (error: any) {
        // If server delete fails, update local state as fallback
        if (item_id && usingLocalCart) {
          removeFromCart(item_id);
          return { success: true, local: true };
        }
        throw error;
      }
    },
    onSuccess: (data) => {
      if (!data?.local) {
        queryClient.invalidateQueries({ queryKey: ['cart'] });
      }
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
      try {
        const response = await axiosWithCredentials.delete(
          '/api/cart',
          {
            headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
          }
        );
        return response.data;
      } catch (error: any) {
        // If server clear fails, clear local state as fallback
        if (usingLocalCart) {
          clearCart();
          return { success: true, local: true };
        }
        throw error;
      }
    },
    onSuccess: (data) => {
      if (data?.local) {
        toast({
          title: 'Success',
          description: 'Cart cleared locally'
        });
      } else {
        queryClient.invalidateQueries({ queryKey: ['cart'] });
        toast({
          title: 'Success',
          description: 'Cart cleared successfully'
        });
      }
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
      const response = await axiosWithCredentials.post<DiscountValidationResponse>(
        '/api/discount/validate',
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
      const response = await axiosWithCredentials.post<CheckoutValidationResponse>(
        '/api/checkout/validate',
        { order_type: 'collection' },
        {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      if (data.valid) {
        navigate(CHECKOUT_PATH);
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

  const handleQuantityChange = (cart_item_id: string, newQuantity: number, item_id?: string) => {
    if (newQuantity < 1) return;
    updateItemMutation.mutate({ cart_item_id, quantity: newQuantity, item_id });
  };

  const handleRemoveItem = (cart_item_id: string, item_name: string, item_id?: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Remove Item',
      message: `Remove ${item_name} from cart?`,
      onConfirm: () => {
        removeItemMutation.mutate({ cart_item_id, item_id });
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
    
    validateDiscountMutation.mutate({
      code: discountCode.trim().toUpperCase(),
      order_type: 'collection',
      order_value: totals.subtotalCents / 100 // Convert cents to euros
    });
  };

  const handleRemoveDiscount = async () => {
    try {
      await axiosWithCredentials.delete('/api/discount/remove', {
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
    // Guest checkout is now supported - no authentication required
    validateCheckoutMutation.mutate();
  };

  const handleDiscountInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDiscountCode(e.target.value);
    setDiscountError(null); // Clear error on input change
  };

  // ===========================
  // Render Helpers
  // ===========================

  const renderCustomizations = (customizations: Record<string, any> | null, isBuilderItem?: boolean, builderSelections?: any) => {
    // For builder items, render the builder selections in a structured way
    if (isBuilderItem && builderSelections && Array.isArray(builderSelections)) {
      return (
        <div className="mt-2 space-y-1">
          {builderSelections.map((selection: any, index: number) => {
            if (!selection.items || selection.items.length === 0) return null;
            return (
              <div key={index} className="text-sm">
                <span className="text-gray-500 text-xs uppercase tracking-wide">{selection.step_name}:</span>
                <span className="ml-1 text-gray-700">
                  {selection.items.map((item: any) => item.name).join(', ')}
                </span>
              </div>
            );
          })}
        </div>
      );
    }

    if (!customizations || Object.keys(customizations).length === 0) {
      return null;
    }

    // Convert customizations to array and group by modifier group
    const customizationEntries = Object.entries(customizations);
    
    // Handle both old format (flat) and new format (grouped)
    const formattedCustomizations: string[] = [];
    
    customizationEntries.forEach(([key, value]) => {
      if (Array.isArray(value)) {
        // New format: value is an array of options
        const optionNames = value
          .map((opt: any) => {
            const name = typeof opt === 'object' ? opt.option_name || opt.name : String(opt);
            const price = typeof opt === 'object' && opt.additional_price ? Number(opt.additional_price) : 0;
            return price > 0 ? `${name} (+€${price.toFixed(2)})` : name;
          })
          .join(', ');
        formattedCustomizations.push(`${key}: ${optionNames}`);
      } else if (typeof value === 'object' && value !== null) {
        // Old format: single object with name and price
        const name = value.name || value.option_name || String(value);
        const price = value.additional_price ? Number(value.additional_price) : 0;
        const displayText = price > 0 ? `${name} (+€${price.toFixed(2)})` : name;
        formattedCustomizations.push(`${key}: ${displayText}`);
      } else {
        // Fallback: simple string value
        formattedCustomizations.push(`${key}: ${value}`);
      }
    });

    return (
      <div className="mt-2 space-y-1">
        {formattedCustomizations.map((text, index) => (
          <div key={index} className="text-xs sm:text-sm text-gray-600 leading-relaxed">
            {text}
          </div>
        ))}
      </div>
    );
  };

  // ===========================
  // Loading State - Show skeleton until cart is fully hydrated
  // ===========================

  if (isCartLoading || (!isCartHydrated && !cartData)) {
    return (
      <div className="min-h-screen py-4 sm:py-6 lg:py-8 px-4 sm:px-6 lg:px-10 bg-[#F2EFE9]">
        <div className="max-w-6xl mx-auto">
          {/* Page Header Skeleton */}
          <div className="mb-4 sm:mb-6 lg:mb-8">
            <div className="h-8 sm:h-10 lg:h-12 bg-gray-200 rounded-lg w-48 animate-pulse"></div>
            <div className="h-4 sm:h-5 bg-gray-200 rounded w-64 mt-2 animate-pulse"></div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items Skeleton */}
            <div className="lg:col-span-2 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl shadow-md border-2 border-[#E8E1D6] p-5 sm:p-6 animate-pulse">
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                    <div className="flex-1 w-full">
                      <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
                      <div className="h-5 bg-gray-200 rounded w-24"></div>
                      <div className="mt-4 flex items-center gap-3">
                        <div className="h-11 w-11 bg-gray-200 rounded-full"></div>
                        <div className="h-8 w-16 bg-gray-200 rounded"></div>
                        <div className="h-11 w-11 bg-gray-200 rounded-full"></div>
                      </div>
                    </div>
                    <div className="h-8 w-24 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Order Summary Skeleton */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-lg border-2 border-[#E8E1D6] p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-36 mb-6"></div>
                <div className="space-y-3 mb-6 pb-6 border-b border-gray-200">
                  <div className="h-10 bg-gray-200 rounded"></div>
                  <div className="h-10 bg-gray-200 rounded w-24"></div>
                </div>
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between">
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                  </div>
                  <div className="flex justify-between">
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                    <div className="h-4 bg-gray-200 rounded w-12"></div>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <div className="h-5 bg-gray-200 rounded w-14"></div>
                    <div className="h-5 bg-gray-200 rounded w-20"></div>
                  </div>
                </div>
                <div className="h-14 bg-gray-200 rounded-lg"></div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Mobile loading indicator */}
        <div className="fixed bottom-0 left-0 right-0 bg-white shadow-2xl z-40 lg:hidden border-t-2 border-[#E8E1D6] p-4">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[#2C1A16] mr-2" />
            <span className="text-sm text-[#4A3B32]">Loading your cart...</span>
          </div>
        </div>
      </div>
    );
  }

  // ===========================
  // Error State - Only show if BOTH server AND local cart are unavailable
  // ===========================

  // If there's an error but we have cartData (from fallback), don't show error screen
  // The syncWarning banner will inform the user instead
  if (cartError && !cartData) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#F2EFE9]">
        <div className="text-center max-w-md">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2 text-[#2C1A16]">Failed to Load Cart</h2>
          <p className="mb-6 text-[#4A3B32]">
            We couldn't load your cart. Please try again.
          </p>
            <button
              onClick={() => refetchCart()}
              className="px-6 py-3 font-medium rounded-lg transition-colors duration-200 bg-[#2C1A16] text-[#F2EFE9]"
              style={{ minHeight: '48px' }}
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
  
  // Calculate totals using shared utility
  const totals = calculateCartTotals(parseCartData(cartData));

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#F2EFE9]">
        <div className="text-center max-w-md">
          <ShoppingBag className="h-24 w-24 text-gray-400 mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-4 text-[#2C1A16]">Your Cart is Empty</h2>
          <p className="mb-8 text-[#4A3B32]">
            Add some delicious items from our menu to get started!
          </p>
            <Link
              to="/menu"
              className="inline-flex items-center px-6 py-3 font-medium rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl bg-[#2C1A16] text-[#F2EFE9]"
              style={{ minHeight: '48px' }}
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

  // Use shared totals calculation
  const hasDiscount = !!(cartData?.discount_code && totals.discountCents > 0);

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

      {/* Sync Warning Banner - Shows when using local cart due to API failure */}
      {syncWarning && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-40 max-w-2xl w-full mx-4">
          <div className="bg-amber-50 border-2 border-amber-300 rounded-xl shadow-lg p-4">
            <div className="flex items-center">
              <WifiOff className="h-5 w-5 text-amber-600 flex-shrink-0" />
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-amber-900">{syncWarning}</p>
              </div>
              <button
                onClick={() => {
                  setSyncWarning(null);
                  refetchCart();
                }}
                className="ml-4 px-3 py-1.5 text-sm font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors"
              >
                Retry Sync
              </button>
              <button
                onClick={() => setSyncWarning(null)}
                className="ml-2 text-amber-600 hover:text-amber-800 transition-colors"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

    
      <div className="min-h-screen py-4 sm:py-6 lg:py-8 px-4 sm:px-6 lg:px-8 bg-[#F2EFE9]">
        <div className="max-w-6xl mx-auto">
          {/* Page Header - Mobile first */}
          <div className="mb-4 sm:mb-6 lg:mb-8">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#2C1A16]">Shopping Cart</h1>
            <p className="mt-1 text-sm text-[#4A3B32]">
              {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'} in your cart
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {/* Cart Items Section */}
            <div className="lg:col-span-2 space-y-3 sm:space-y-4">
              {cartItems.map((item) => {
                const unitPrice = Number(item.unit_price || 0);
                const lineTotal = Number(item.line_total || 0);
                const isUpdating = itemLoadingStates[item.cart_item_id] || false;
                const isAvailable = item.is_available !== false;

                  return (
                    <div
                      key={item.cart_item_id}
                      className={`rounded-xl sm:rounded-2xl shadow-sm sm:shadow-md border p-4 sm:p-5 transition-all duration-200 hover:shadow-md ${
                        isAvailable 
                          ? 'bg-white border-[#E8E1D6]' 
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
                    {/* Mobile-first Cart Card Layout */}
                    <div className="flex flex-col gap-3">
                      {/* Top Row: Item name and price */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className={`text-base sm:text-lg font-bold leading-tight ${isAvailable ? 'text-[#2C1A16]' : 'text-gray-500 line-through'}`}>
                            {item.item_name}
                          </h3>
                          {/* Customizations */}
                          {renderCustomizations(item.selected_customizations, item.is_builder_item, item.builder_selections)}
                          {/* Unit Price */}
                          {isAvailable && (
                            <p className="mt-1 text-sm text-gray-500">
                              €{unitPrice.toFixed(2)} each
                            </p>
                          )}
                        </div>
                        {/* Line Total - Always visible */}
                        {isAvailable && (
                          <div className="text-right flex-shrink-0">
                            <p className="text-lg sm:text-xl font-bold text-[#2C1A16]">
                              €{lineTotal.toFixed(2)}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Bottom Row: Quantity Controls and Remove Button */}
                      {isAvailable ? (
                        <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-100">
                          {/* Quantity Stepper */}
                          <div className="flex items-center bg-[#F2EFE9] rounded-lg p-1">
                            <button
                              onClick={() => handleQuantityChange(item.cart_item_id, item.quantity - 1, item.item_id)}
                              disabled={item.quantity <= 1 || isUpdating}
                              className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-white border border-[#E8E1D6] flex items-center justify-center text-[#2C1A16] hover:border-[#2C1A16] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
                              aria-label="Decrease quantity"
                            >
                              {isUpdating ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Minus className="h-4 w-4" />
                              )}
                            </button>

                            <span className="w-10 sm:w-12 text-center font-bold text-lg text-[#2C1A16]">
                              {item.quantity}
                            </span>

                            <button
                              onClick={() => handleQuantityChange(item.cart_item_id, item.quantity + 1, item.item_id)}
                              disabled={isUpdating}
                              className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-white border border-[#E8E1D6] flex items-center justify-center text-[#2C1A16] hover:border-[#2C1A16] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
                              aria-label="Increase quantity"
                            >
                              {isUpdating ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Plus className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                          
                          {/* Remove Button */}
                          <button
                            onClick={() => handleRemoveItem(item.cart_item_id, item.item_name, item.item_id)}
                            disabled={removeItemMutation.isPending}
                            className="flex items-center justify-center px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-50"
                            aria-label="Remove item"
                          >
                            <Trash2 className="h-4 w-4 mr-1.5" />
                            <span>Remove</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleRemoveItem(item.cart_item_id, item.item_name, item.item_id)}
                          disabled={removeItemMutation.isPending}
                          className="w-full py-2.5 bg-red-600 text-white font-semibold text-sm rounded-lg hover:bg-red-700 transition-all duration-200 disabled:opacity-50 flex items-center justify-center"
                          aria-label="Remove unavailable item"
                        >
                          <Trash2 className="h-4 w-4 mr-1.5" />
                          <span>Remove Unavailable Item</span>
                        </button>
                      )}
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

            {/* Mobile Order Summary - Visible only on mobile */}
            <div className="lg:hidden">
              <div className="bg-white rounded-xl shadow-sm border border-[#E8E1D6] p-4">
                <h2 className="text-lg font-bold text-[#2C1A16] mb-4">Order Summary</h2>
                
                {/* Discount Code Section - Mobile */}
                <div className="mb-4 pb-4 border-b border-gray-100">
                  <label htmlFor="discount-code-mobile" className="block text-sm font-medium text-gray-700 mb-2">
                    Discount Code
                  </label>
                  
                  {hasDiscount ? (
                    <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                      <div className="flex items-center">
                        <Tag className="h-4 w-4 text-green-600 mr-1.5" />
                        <span className="font-medium text-green-900 text-sm">{cartData?.discount_code}</span>
                      </div>
                      <button
                        onClick={handleRemoveDiscount}
                        className="text-xs text-red-600 hover:text-red-700 font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        id="discount-code-mobile"
                        type="text"
                        value={discountCode}
                        onChange={handleDiscountInputChange}
                        placeholder="Enter code"
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-orange-500 focus:ring-1 focus:ring-orange-200"
                      />
                      <button
                        onClick={handleApplyDiscount}
                        disabled={validateDiscountMutation.isPending || !discountCode.trim()}
                        className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {validateDiscountMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Apply'
                        )}
                      </button>
                    </div>
                  )}
                  
                  {discountError && (
                    <div className="mt-2 flex items-start text-xs text-red-600 bg-red-50 px-2 py-1.5 rounded">
                      <AlertCircle className="h-3.5 w-3.5 mr-1.5 mt-0.5 flex-shrink-0" />
                      <span>{discountError}</span>
                    </div>
                  )}
                </div>
                
                {/* Pricing Breakdown - Mobile */}
                <OrderSummary
                  totals={totals}
                  discountCode={cartData?.discount_code}
                  hasDiscount={hasDiscount}
                  showDeliveryFee={true}
                  showTax={true}
                />
              </div>
            </div>

            {/* Order Summary Sidebar - Desktop only */}
            <div className="lg:col-span-1 hidden lg:block">
              <div className="bg-white rounded-2xl shadow-lg border-2 border-[#E8E1D6] p-6 sticky top-24">
                <h2 className="text-xl font-bold text-[#2C1A16] mb-6">Order Summary</h2>

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

                {/* Pricing Breakdown - Using Shared OrderSummary Component */}
                <div className="mb-6">
                  <OrderSummary
                    totals={totals}
                    discountCode={cartData?.discount_code}
                    hasDiscount={hasDiscount}
                    showDeliveryFee={true}
                    showTax={true}
                  />
                </div>

                {/* Checkout Button */}
                  <button
                    onClick={handleProceedToCheckout}
                    disabled={validateCheckoutMutation.isPending}
                    className="w-full py-4 font-bold text-lg rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center checkout-btn bg-[#2C1A16] text-[#F2EFE9]"
                    style={{ minHeight: '48px' }}
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
        
        {/* Premium Sticky Footer Bar for Mobile - Fixed at bottom with safe area */}
        <div 
          className="fixed bottom-0 left-0 right-0 bg-white z-40 lg:hidden border-t-2 border-[#E8E1D6]" 
          style={{ 
            paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)',
            boxShadow: '0 -8px 32px 0 rgb(44 26 22 / 0.15)'
          }}
        >
          <div className="px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex-shrink-0">
              <p className="text-xs text-gray-500 font-medium mb-0.5">Total</p>
              <p className="text-xl sm:text-2xl font-bold text-[#2C1A16]" style={{ letterSpacing: '-0.02em' }}>
                €{totals.total}
              </p>
            </div>
            <button
              onClick={handleProceedToCheckout}
              disabled={validateCheckoutMutation.isPending}
              className="flex-1 max-w-[200px] py-3.5 font-bold text-base rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98] flex items-center justify-center bg-[#2C1A16] text-[#F2EFE9]"
              style={{ minHeight: '48px' }}
            >
              {validateCheckoutMutation.isPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  <span>Validating...</span>
                </>
              ) : (
                <>
                  <span>Checkout</span>
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </button>
          </div>
        </div>
        
        {/* Spacer for sticky footer on mobile - accounts for safe area */}
        <div className="h-28 lg:hidden" aria-hidden="true" />
      </div>
    </>
  );
};

export default UV_Cart;