import React, { useState, useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { 
  Clock, 
  CheckCircle, 
  Circle, 
  RefreshCw, 
  Phone, 
  Mail, 
  MapPin,
  Package,
  AlertCircle,
  XCircle,
  Home
} from 'lucide-react';

// ===========================
// Type Definitions
// ===========================

interface OrderItem {
  item_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  selected_customizations: Record<string, string> | null;
}

interface OrderTrackingData {
  ticket_number: string;
  order_number: string;
  status: 'received' | 'preparing' | 'ready' | 'out_for_delivery' | 'completed' | 'cancelled';
  order_type: 'collection' | 'delivery';
  collection_time_slot: string | null;
  estimated_delivery_time: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  items: OrderItem[];
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  delivery_fee: number;
  total_amount: number;
  status_history: Array<{
    status: string;
    changed_at: string;
    notes?: string | null;
  }>;
}

// ===========================
// API Functions
// ===========================

const fetchOrderTracking = async (ticketNumber: string): Promise<OrderTrackingData> => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
  
  const response = await axios.get<{ success: boolean; data?: OrderTrackingData }>(
    `${API_BASE_URL}/api/orders/track?ticket=${encodeURIComponent(ticketNumber)}`
  );
  
  if (!response.data.success || !response.data.data) {
    throw new Error('Failed to fetch order tracking data');
  }
  
  return response.data.data;
};

// ===========================
// Main Component
// ===========================

const UV_OrderTracking: React.FC = () => {
  const { ticketNumber } = useParams<{ ticketNumber: string }>();
  const [searchParams] = useSearchParams();

  const [isPolling, setIsPolling] = useState(true);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());

  // Fetch order tracking data with polling
  const {
    data: trackingData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['order-tracking', ticketNumber],
    queryFn: () => fetchOrderTracking(ticketNumber!),
    enabled: !!ticketNumber,
    refetchInterval: (query) => {
      // Poll every 10 seconds while order is not completed/cancelled
      const data = query.state.data;
      if (data && (data.status === 'completed' || data.status === 'cancelled')) {
        return false;
      }
      return isPolling ? 10000 : false;
    },
    staleTime: 0,
  });

  // Update last update time and polling status when data changes
  useEffect(() => {
    if (trackingData) {
      setLastUpdateTime(new Date());
      if (trackingData.status === 'completed' || trackingData.status === 'cancelled') {
        setIsPolling(false);
      }
    }
  }, [trackingData]);

  // Handle missing ticket number
  if (!ticketNumber) {
    return (
      <div className="min-h-screen bg-[#F2EFE9] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#2C1A16] mb-4">
            Tracking Link Invalid
          </h2>
          <p className="text-[#6B5B4F] mb-6">
            Please use the tracking link from your confirmation screen or go to the Track Order page.
          </p>
          <Link
            to="/track-order"
            className="inline-flex items-center justify-center bg-[#D4831D] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#C07519] transition-colors"
          >
            <Home className="h-5 w-5 mr-2" />
            Track Order
          </Link>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F2EFE9] flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 text-[#D4831D] animate-spin mx-auto mb-4" />
          <p className="text-[#2C1A16] font-medium">Loading order status...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !trackingData) {
    return (
      <div className="min-h-screen bg-[#F2EFE9] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#2C1A16] mb-4">
            Unable to Load Order
          </h2>
          <p className="text-[#6B5B4F] mb-6">
            {error instanceof Error ? error.message : "We couldn't find this order. Please check your ticket number."}
          </p>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center justify-center bg-[#D4831D] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#C07519] transition-colors mb-4 w-full"
          >
            <RefreshCw className="h-5 w-5 mr-2" />
            Try Again
          </button>
          <Link
            to="/menu"
            className="block text-[#2C1A16] hover:text-[#D4831D] font-medium"
          >
            Back to Menu
          </Link>
        </div>
      </div>
    );
  }

  // Helper functions
  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      received: 'bg-blue-100 text-blue-800',
      preparing: 'bg-yellow-100 text-yellow-800',
      ready: 'bg-green-100 text-green-800',
      out_for_delivery: 'bg-purple-100 text-purple-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusDisplay = (status: string): string => {
    const displays: Record<string, string> = {
      received: 'Received',
      preparing: 'Preparing',
      ready: 'Ready',
      out_for_delivery: 'Out for Delivery',
      completed: 'Completed',
      cancelled: 'Cancelled',
    };
    return displays[status] || status;
  };

  const formatCurrency = (amount: number): string => {
    return `€${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('en-IE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCustomizations = (customizations: Record<string, string> | null): string => {
    if (!customizations || Object.keys(customizations).length === 0) {
      return '';
    }
    return Object.entries(customizations)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
  };

  // Progress steps
  const progressSteps = trackingData.order_type === 'collection'
    ? ['received', 'preparing', 'ready', 'completed']
    : ['received', 'preparing', 'out_for_delivery', 'completed'];

  const currentStepIndex = progressSteps.indexOf(trackingData.status);
  const isCancelled = trackingData.status === 'cancelled';

  return (
    <div className="min-h-screen bg-[#F2EFE9] pb-20">
      {/* Header */}
      <div className="bg-white border-b border-[#D4C5B9]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#2C1A16]">
                Track Order
              </h1>
              <p className="text-[#6B5B4F] mt-1">
                Ticket: <span className="font-mono font-semibold text-[#D4831D]">{trackingData.ticket_number}</span>
              </p>
            </div>
            <button
              onClick={() => {
                setIsPolling(true);
                refetch();
              }}
              disabled={!isPolling && (trackingData.status === 'completed' || trackingData.status === 'cancelled')}
              className="flex items-center gap-2 px-4 py-2 bg-[#D4C5B9] text-[#2C1A16] rounded-lg hover:bg-[#C4B5A9] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`h-5 w-5 ${isPolling ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
          {isPolling && (
            <p className="text-xs text-[#6B5B4F] mt-2">
              Last updated: {lastUpdateTime.toLocaleTimeString()} • Auto-refreshing every 10 seconds
            </p>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-[#2C1A16]">Current Status</h2>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(trackingData.status)}`}>
              {getStatusDisplay(trackingData.status)}
            </span>
          </div>

          {/* Progress Timeline */}
          {!isCancelled && (
            <div className="relative">
              <div className="flex items-center justify-between mb-8">
                {progressSteps.map((step, index) => {
                  const isCompleted = index <= currentStepIndex;
                  const isCurrent = index === currentStepIndex;

                  return (
                    <div key={step} className="flex-1 relative">
                      <div className="flex flex-col items-center">
                        {/* Circle */}
                        <div
                          className={`h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all ${
                            isCompleted
                              ? 'bg-[#D4831D] border-[#D4831D] text-white'
                              : 'bg-white border-[#D4C5B9] text-[#6B5B4F]'
                          } ${isCurrent ? 'ring-4 ring-[#D4831D]/30' : ''}`}
                        >
                          {isCompleted ? (
                            <CheckCircle className="h-6 w-6" />
                          ) : (
                            <Circle className="h-6 w-6" />
                          )}
                        </div>
                        {/* Label */}
                        <p className={`mt-2 text-xs sm:text-sm text-center ${isCompleted ? 'text-[#2C1A16] font-medium' : 'text-[#6B5B4F]'}`}>
                          {getStatusDisplay(step)}
                        </p>
                      </div>
                      {/* Connecting Line */}
                      {index < progressSteps.length - 1 && (
                        <div
                          className={`absolute top-5 left-1/2 w-full h-0.5 -z-10 ${
                            index < currentStepIndex ? 'bg-[#D4831D]' : 'bg-[#D4C5B9]'
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Cancelled Message */}
          {isCancelled && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
              <XCircle className="h-5 w-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800">
                <p className="font-medium mb-1">Order Cancelled</p>
                <p>This order has been cancelled. If you have questions, please contact us.</p>
              </div>
            </div>
          )}

          {/* Order Type */}
          <div className="mt-4 flex items-center text-[#6B5B4F]">
            {trackingData.order_type === 'collection' ? (
              <Package className="h-5 w-5 mr-2" />
            ) : (
              <MapPin className="h-5 w-5 mr-2" />
            )}
            <span>{trackingData.order_type === 'collection' ? 'Collection Order' : 'Delivery Order'}</span>
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-[#2C1A16] mb-4">Order Items</h2>
          <div className="space-y-4">
            {trackingData.items.map((item, index) => (
              <div key={index} className="flex justify-between items-start pb-4 border-b border-[#D4C5B9] last:border-0">
                <div className="flex-1">
                  <p className="font-medium text-[#2C1A16]">{item.item_name}</p>
                  {item.selected_customizations && (
                    <p className="text-sm text-[#6B5B4F] mt-1">
                      {formatCustomizations(item.selected_customizations)}
                    </p>
                  )}
                  <p className="text-sm text-[#6B5B4F] mt-1">Qty: {item.quantity}</p>
                </div>
                <p className="font-medium text-[#2C1A16]">
                  {formatCurrency(item.line_total)}
                </p>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="mt-4 pt-4 border-t border-[#D4C5B9] space-y-2">
            <div className="flex justify-between text-[#6B5B4F]">
              <span>Subtotal</span>
              <span>{formatCurrency(trackingData.subtotal)}</span>
            </div>
            {trackingData.discount_amount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-{formatCurrency(trackingData.discount_amount)}</span>
              </div>
            )}
            {trackingData.delivery_fee > 0 && (
              <div className="flex justify-between text-[#6B5B4F]">
                <span>Delivery Fee</span>
                <span>{formatCurrency(trackingData.delivery_fee)}</span>
              </div>
            )}
            <div className="flex justify-between text-[#6B5B4F]">
              <span>Tax</span>
              <span>{formatCurrency(trackingData.tax_amount)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-[#2C1A16] pt-2 border-t border-[#D4C5B9]">
              <span>Total</span>
              <span>{formatCurrency(trackingData.total_amount)}</span>
            </div>
          </div>
        </div>

        {/* Status History */}
        {trackingData.status_history.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-[#2C1A16] mb-4">Order History</h2>
            <div className="space-y-3">
              {trackingData.status_history.map((entry, index) => (
                <div key={index} className="flex items-start">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-[#D4831D]/10 flex items-center justify-center mr-3">
                    <Clock className="h-4 w-4 text-[#D4831D]" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-[#2C1A16]">
                        {getStatusDisplay(entry.status)}
                      </p>
                      <p className="text-sm text-[#6B5B4F]">
                        {formatDate(entry.changed_at)}
                      </p>
                    </div>
                    {entry.notes && (
                      <p className="text-sm text-[#6B5B4F] mt-1">{entry.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Need Help */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-[#2C1A16] mb-4">Need Help?</h2>
          <div className="space-y-3">
            <a
              href="tel:+353871234567"
              className="flex items-center text-[#2C1A16] hover:text-[#D4831D] transition-colors"
            >
              <Phone className="h-5 w-5 mr-3" />
              <span>+353 87 123 4567</span>
            </a>
            <a
              href="mailto:info@coffeeshop.ie"
              className="flex items-center text-[#2C1A16] hover:text-[#D4831D] transition-colors"
            >
              <Mail className="h-5 w-5 mr-3" />
              <span>info@coffeeshop.ie</span>
            </a>
          </div>
        </div>

        {/* Back to Menu */}
        <div className="mt-6 text-center">
          <Link
            to="/menu"
            className="inline-flex items-center text-[#2C1A16] hover:text-[#D4831D] font-medium transition-colors"
          >
            <Home className="h-5 w-5 mr-2" />
            Back to Menu
          </Link>
        </div>
      </div>
    </div>
  );
};

export default UV_OrderTracking;
