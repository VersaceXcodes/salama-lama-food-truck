import React, { useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { CheckCircle, Download, Package, MapPin, Clock, Award, TrendingUp, ArrowRight, AlertCircle } from 'lucide-react';

// ===========================
// TypeScript Interfaces
// ===========================

interface OrderItem {
  order_item_id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  selected_customizations: Record<string, string> | null;
  line_total: number;
}

interface OrderDetails {
  order_id: string;
  order_number: string;
  status: string;
  order_type: 'collection' | 'delivery';
  collection_time_slot: string | null;
  delivery_address_snapshot: {
    address_line1?: string;
    address_line2?: string;
    city?: string;
    postal_code?: string;
  } | null;
  estimated_delivery_time: string | null;
  items: OrderItem[];
  subtotal: number;
  discount_amount: number;
  delivery_fee: number | null;
  tax_amount: number;
  total_amount: number;
  loyalty_points_awarded: number;
  invoice_url: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  special_instructions: string | null;
}

interface Badge {
  badge_id: string;
  name: string;
  description: string;
  icon_url: string;
  earned_at: string;
}

interface BadgesResponse {
  earned: Badge[];
  locked: Badge[];
}

// ===========================
// API Functions
// ===========================

const fetchOrderDetails = async (order_id: string, auth_token: string): Promise<OrderDetails> => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
  
  const response = await axios.get<OrderDetails>(
    `${API_BASE_URL}/api/orders/${order_id}`,
    {
      headers: {
        Authorization: `Bearer ${auth_token}`,
      },
    }
  );
  
  return response.data;
};

const fetchBadges = async (auth_token: string): Promise<BadgesResponse> => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
  
  const response = await axios.get<BadgesResponse>(
    `${API_BASE_URL}/api/loyalty/badges`,
    {
      headers: {
        Authorization: `Bearer ${auth_token}`,
      },
    }
  );
  
  return response.data;
};

const downloadInvoice = async (order_id: string, auth_token: string): Promise<string> => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
  
  const response = await axios.get<{ invoice_url: string }>(
    `${API_BASE_URL}/api/orders/${order_id}/invoice`,
    {
      headers: {
        Authorization: `Bearer ${auth_token}`,
      },
    }
  );
  
  return response.data.invoice_url;
};

// ===========================
// Main Component
// ===========================

const UV_OrderConfirmation: React.FC = () => {
  const { order_id } = useParams<{ order_id: string }>();
  const navigate = useNavigate();
  
  // Zustand selectors - CRITICAL: Individual selectors only
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const clearCart = useAppStore(state => state.clear_cart);

  // Redirect if no order_id
  useEffect(() => {
    if (!order_id) {
      navigate('/orders');
    }
  }, [order_id, navigate]);

  // Clear cart on mount
  useEffect(() => {
    clearCart();
  }, [clearCart]);

  // Fetch order details
  const {
    data: orderDetails,
    isLoading: isLoadingOrder,
    error: orderError,
  } = useQuery({
    queryKey: ['order-confirmation', order_id],
    queryFn: () => fetchOrderDetails(order_id!, authToken!),
    enabled: !!order_id && !!authToken,
    staleTime: 0, // Always fetch fresh data
    retry: 1,
  });

  // Fetch badges to check for unlocks
  const {
    data: badgesData,
    isLoading: isLoadingBadges,
  } = useQuery({
    queryKey: ['loyalty-badges-check'],
    queryFn: () => fetchBadges(authToken!),
    enabled: !!authToken && !!orderDetails,
    staleTime: 0,
    select: (data) => {
      // Filter badges earned in the last 2 minutes (likely from this order)
      const recentBadges = data.earned.filter(badge => {
        const earnedTime = new Date(badge.earned_at).getTime();
        const twoMinutesAgo = Date.now() - (2 * 60 * 1000);
        return earnedTime > twoMinutesAgo;
      });
      return {
        ...data,
        recentlyUnlocked: recentBadges.length > 0 ? recentBadges[0] : null,
      };
    },
  });

  // Handle invoice download
  const handleDownloadInvoice = async () => {
    if (!order_id || !authToken) return;
    
    try {
      const invoiceUrl = await downloadInvoice(order_id, authToken);
      window.open(invoiceUrl, '_blank');
    } catch (error) {
      console.error('Failed to download invoice:', error);
      alert('Failed to download invoice. Please try again.');
    }
  };

  // Format customizations for display
  const formatCustomizations = (customizations: Record<string, string> | null): string => {
    if (!customizations || Object.keys(customizations).length === 0) {
      return '';
    }
    
    return Object.entries(customizations)
      .map(([group, option]) => `${group}: ${option}`)
      .join(', ');
  };

  // Format time display
  const formatEstimatedTime = (time: string | null): string => {
    if (!time) return 'Shortly';
    
    try {
      const date = new Date(time);
      return date.toLocaleTimeString('en-IE', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    } catch {
      return time;
    }
  };

  // ===========================
  // Loading State
  // ===========================
  if (isLoadingOrder) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-700 font-medium text-lg">Loading your order confirmation...</p>
          </div>
        </div>
      </>
    );
  }

  // ===========================
  // Error State
  // ===========================
  if (orderError || !orderDetails) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Not Found</h2>
            <p className="text-gray-600 mb-6">
              We couldn't find the order you're looking for. It may have been cancelled or doesn't exist.
            </p>
            <div className="space-y-3">
              <Link
                to="/orders"
                className="block w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-all duration-200"
              >
                View All Orders
              </Link>
              <Link
                to="/menu"
                className="block w-full bg-gray-100 text-gray-900 px-6 py-3 rounded-lg font-medium hover:bg-gray-200 transition-all duration-200"
              >
                Back to Menu
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ===========================
  // Success State
  // ===========================
  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-indigo-100 py-8 px-4 sm:py-12 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          
          {/* Success Header with Animation */}
          <div className="text-center mb-8 animate-fade-in">
            <div className="relative inline-block">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg animate-scale-in">
                <CheckCircle className="w-12 h-12 sm:w-14 sm:h-14 text-white" strokeWidth={2.5} />
              </div>
              {/* Pulse ring animation */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-green-400 rounded-full animate-ping opacity-20"></div>
              </div>
            </div>
            
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-3">
              Order Confirmed!
            </h1>
            <p className="text-lg sm:text-xl text-gray-700 mb-2">
              Thank you, {currentUser?.first_name || 'valued customer'}!
            </p>
            <p className="text-base text-gray-600">
              We've received your order and will start preparing it shortly.
            </p>
          </div>

          {/* Order Number Card */}
          <div className="bg-white rounded-xl shadow-xl border-2 border-green-200 p-6 sm:p-8 mb-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide mb-2">
                Order Number
              </p>
              <p className="text-3xl sm:text-4xl lg:text-5xl font-bold text-blue-600 mb-4 font-mono tracking-tight">
                {orderDetails.order_number}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-gray-700">
                {orderDetails.order_type === 'collection' ? (
                  <>
                    <div className="flex items-center gap-2">
                      <Package className="w-5 h-5 text-blue-600" />
                      <span className="font-medium">Collection</span>
                    </div>
                    {orderDetails.collection_time_slot && (
                      <>
                        <span className="hidden sm:inline text-gray-400">•</span>
                        <div className="flex items-center gap-2">
                          <Clock className="w-5 h-5 text-green-600" />
                          <span>Ready at <strong>{formatEstimatedTime(orderDetails.collection_time_slot)}</strong></span>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-blue-600" />
                      <span className="font-medium">Delivery</span>
                    </div>
                    {orderDetails.estimated_delivery_time && (
                      <>
                        <span className="hidden sm:inline text-gray-400">•</span>
                        <div className="flex items-center gap-2">
                          <Clock className="w-5 h-5 text-green-600" />
                          <span>Estimated at <strong>{formatEstimatedTime(orderDetails.estimated_delivery_time)}</strong></span>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Two Column Layout for Desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            
            {/* Order Details - Left Column (2/3 width on desktop) */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Order Items */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Package className="w-6 h-6 text-blue-600" />
                  Your Order
                </h2>
                <div className="space-y-4">
                  {orderDetails.items.map((item) => (
                    <div key={item.order_item_id} className="flex justify-between items-start border-b border-gray-200 pb-4 last:border-b-0 last:pb-0">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">
                          {item.quantity}x {item.item_name}
                        </p>
                        {item.selected_customizations && Object.keys(item.selected_customizations).length > 0 && (
                          <p className="text-sm text-gray-600 mt-1">
                            {formatCustomizations(item.selected_customizations)}
                          </p>
                        )}
                      </div>
                      <p className="font-semibold text-gray-900 ml-4">
                        €{Number(item.line_total).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Order Totals */}
                <div className="mt-6 pt-4 border-t-2 border-gray-200 space-y-2">
                  <div className="flex justify-between text-gray-700">
                    <span>Subtotal</span>
                    <span>€{Number(orderDetails.subtotal).toFixed(2)}</span>
                  </div>
                  {orderDetails.discount_amount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span>-€{Number(orderDetails.discount_amount).toFixed(2)}</span>
                    </div>
                  )}
                  {orderDetails.delivery_fee && orderDetails.delivery_fee > 0 && (
                    <div className="flex justify-between text-gray-700">
                      <span>Delivery Fee</span>
                      <span>€{Number(orderDetails.delivery_fee).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-700">
                    <span>Tax (VAT)</span>
                    <span>€{Number(orderDetails.tax_amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t border-gray-200">
                    <span>Total</span>
                    <span>€{Number(orderDetails.total_amount).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Delivery/Collection Details */}
              {orderDetails.order_type === 'delivery' && orderDetails.delivery_address_snapshot && (
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    Delivery Address
                  </h3>
                  <div className="text-gray-700 space-y-1">
                    <p>{orderDetails.delivery_address_snapshot.address_line1}</p>
                    {orderDetails.delivery_address_snapshot.address_line2 && (
                      <p>{orderDetails.delivery_address_snapshot.address_line2}</p>
                    )}
                    <p>
                      {orderDetails.delivery_address_snapshot.city}, {orderDetails.delivery_address_snapshot.postal_code}
                    </p>
                  </div>
                </div>
              )}

              {orderDetails.special_instructions && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Special Instructions</h3>
                  <p className="text-gray-700">{orderDetails.special_instructions}</p>
                </div>
              )}
            </div>

            {/* Loyalty & Actions - Right Column (1/3 width on desktop) */}
            <div className="space-y-6">
              
              {/* Loyalty Points Earned */}
              {orderDetails.loyalty_points_awarded > 0 && (
                <div className="bg-gradient-to-br from-orange-500 to-pink-600 rounded-xl shadow-lg p-6 text-white">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-medium opacity-90">You Earned</p>
                      <p className="text-3xl font-bold">{orderDetails.loyalty_points_awarded} Points</p>
                    </div>
                  </div>
                  <p className="text-sm opacity-90">
                    Keep ordering to earn more rewards and unlock exclusive benefits!
                  </p>
                  <Link
                    to="/rewards"
                    className="mt-4 block w-full bg-white text-orange-600 px-4 py-2 rounded-lg font-medium text-center hover:bg-gray-100 transition-all duration-200"
                  >
                    View Rewards
                  </Link>
                </div>
              )}

              {/* Badge Unlock Notification */}
              {!isLoadingBadges && badgesData?.recentlyUnlocked && (
                <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg p-6 text-white animate-scale-in">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                      <Award className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-medium opacity-90">Achievement Unlocked!</p>
                      <p className="text-xl font-bold">{badgesData.recentlyUnlocked.name}</p>
                    </div>
                  </div>
                  <p className="text-sm opacity-90 mb-4">
                    {badgesData.recentlyUnlocked.description}
                  </p>
                  <div className="flex items-center justify-center w-20 h-20 bg-white/20 rounded-full mx-auto">
                    <span className="text-4xl">🏆</span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                <Link
                  to={`/orders/${orderDetails.order_id}/track`}
                  className="flex items-center justify-center gap-2 w-full bg-blue-600 text-white px-6 py-4 rounded-xl font-semibold hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <Package className="w-5 h-5" />
                  Track Order
                  <ArrowRight className="w-5 h-5" />
                </Link>

                {orderDetails.invoice_url && (
                  <button
                    onClick={handleDownloadInvoice}
                    className="flex items-center justify-center gap-2 w-full bg-gray-100 text-gray-900 px-6 py-4 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-200 border-2 border-gray-300"
                  >
                    <Download className="w-5 h-5" />
                    Download Invoice
                  </button>
                )}

                <Link
                  to="/menu"
                  className="flex items-center justify-center gap-2 w-full bg-white text-blue-600 px-6 py-4 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200 border-2 border-blue-200"
                >
                  Continue Shopping
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>

              {/* Confirmation Message */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <p className="text-sm text-blue-900 text-center">
                  <strong>Confirmation sent!</strong>
                  <br />
                  We've sent order details to <strong>{orderDetails.customer_email}</strong> and <strong>{orderDetails.customer_phone}</strong>
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Links */}
          <div className="text-center space-y-2">
            <p className="text-gray-600">
              Need help? <a href="mailto:hello@salamalama.ie" className="text-blue-600 hover:text-blue-700 font-medium">Contact Support</a>
            </p>
            <Link
              to="/orders"
              className="text-blue-600 hover:text-blue-700 font-medium text-sm"
            >
              View All Orders →
            </Link>
          </div>
        </div>
      </div>

      {/* Custom CSS for animations */}
      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes scale-in {
          from {
            transform: scale(0.8);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }

        .animate-scale-in {
          animation: scale-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
    </>
  );
};

export default UV_OrderConfirmation;