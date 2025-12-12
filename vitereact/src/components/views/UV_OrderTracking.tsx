import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { 
  Clock, 
  CheckCircle, 
  Circle, 
  RefreshCw, 
  Download, 
  Phone, 
  Mail, 
  MapPin,
  Package,
  AlertCircle,
  XCircle,
  Wifi,
  WifiOff
} from 'lucide-react';

// ===========================
// Type Definitions
// ===========================

interface OrderTrackingData {
  order_id: string;
  order_number: string;
  status: 'received' | 'preparing' | 'ready' | 'out_for_delivery' | 'completed' | 'cancelled';
  order_type: 'collection' | 'delivery';
  collection_time_slot: string | null;
  delivery_address_snapshot: {
    address_line1: string;
    address_line2?: string;
    city: string;
    postal_code: string;
  } | null;
  estimated_time: string | null;
  customer_name: string;
  customer_phone: string;
  status_history: Array<{
    status: string;
    changed_at: string;
    changed_by_user_id: string;
    notes?: string;
  }>;
}

interface TimelineStep {
  step_name: string;
  step_status: string;
  timestamp: string | null;
  is_current: boolean;
  is_completed: boolean;
}

interface TimeUntilReady {
  minutes_remaining: number | null;
  ready_at_time: string | null;
  is_overdue: boolean;
}

interface TrackingNotification {
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  timestamp: string;
  dismissed: boolean;
  id: string;
}

// ===========================
// Helper Functions
// ===========================

const calculateTimeRemaining = (estimatedTime: string | null): TimeUntilReady => {
  if (!estimatedTime) {
    return {
      minutes_remaining: null,
      ready_at_time: null,
      is_overdue: false,
    };
  }

  try {
    const targetTime = new Date(estimatedTime);
    const now = new Date();
    const diffMs = targetTime.getTime() - now.getTime();
    const minutes = Math.floor(diffMs / 60000);

    return {
      minutes_remaining: minutes > 0 ? minutes : 0,
      ready_at_time: targetTime.toLocaleTimeString('en-IE', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      }),
      is_overdue: diffMs < 0,
    };
  } catch (error) {
    console.error('Error calculating time remaining:', error);
    return {
      minutes_remaining: null,
      ready_at_time: null,
      is_overdue: false,
    };
  }
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'received':
      return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'preparing':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'ready':
    case 'out_for_delivery':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'completed':
      return 'text-green-700 bg-green-100 border-green-300';
    case 'cancelled':
      return 'text-red-600 bg-red-50 border-red-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};

const getProgressColor = (percentage: number): string => {
  if (percentage <= 33) return 'bg-blue-600';
  if (percentage <= 66) return 'bg-yellow-500';
  return 'bg-green-600';
};

// ===========================
// Main Component
// ===========================

const UV_OrderTracking: React.FC = () => {
  const { order_id } = useParams<{ order_id: string }>();
  const navigate = useNavigate();

  // Global state access (CRITICAL: Individual selectors only)
  const auth_token = useAppStore(state => state.authentication_state.auth_token);
  const is_authenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const websocket_connected = useAppStore(state => state.websocket_state.connected);
  const subscribe_to_order_updates = useAppStore(state => state.subscribe_to_order_updates);
  const unsubscribe_from_order_updates = useAppStore(state => state.unsubscribe_from_order_updates);
  const add_notification = useAppStore(state => state.add_notification);

  // Local state
  const [status_timeline, setStatusTimeline] = useState<TimelineStep[]>([]);
  const [progress_percentage, setProgressPercentage] = useState<number>(0);
  const [time_until_ready, setTimeUntilReady] = useState<TimeUntilReady>({
    minutes_remaining: null,
    ready_at_time: null,
    is_overdue: false,
  });
  const [tracking_notifications, setTrackingNotifications] = useState<TrackingNotification[]>([]);
  const [tracking_error, setTrackingError] = useState<string | null>(null);

  // API Base URL
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

  // ===========================
  // Redirect if not authenticated
  // ===========================
  useEffect(() => {
    if (!is_authenticated) {
      navigate('/login?redirect=' + encodeURIComponent(window.location.pathname));
    }
  }, [is_authenticated, navigate]);

  // ===========================
  // React Query: Fetch Order Tracking Data
  // ===========================
  const {
    data: order_tracking_data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery<OrderTrackingData>({
    queryKey: ['orderTracking', order_id],
    queryFn: async () => {
      if (!order_id || !auth_token) {
        throw new Error('Missing order ID or authentication token');
      }

      const response = await axios.get<OrderTrackingData>(
        `${API_BASE_URL}/api/orders/${order_id}/track`,
        {
          headers: {
            Authorization: `Bearer ${auth_token}`,
          },
        }
      );

      return response.data;
    },
    enabled: !!order_id && !!auth_token,
    staleTime: websocket_connected ? 5 * 60 * 1000 : 30 * 1000, // 5 min if WebSocket, 30s if polling
    refetchInterval: websocket_connected ? false : 30000, // Poll every 30s if no WebSocket
    retry: 2,
  });

  // ===========================
  // Compute Status Timeline
  // ===========================
  useEffect(() => {
    if (!order_tracking_data) return;

    const statusSteps: Array<{ name: string; status: string }> = [
      { name: 'Order Received', status: 'received' },
      { name: 'Preparing', status: 'preparing' },
      {
        name: order_tracking_data.order_type === 'collection' ? 'Ready for Collection' : 'Out for Delivery',
        status: order_tracking_data.order_type === 'collection' ? 'ready' : 'out_for_delivery',
      },
      { name: 'Completed', status: 'completed' },
    ];

    const currentStatusIndex = statusSteps.findIndex(
      (step) => step.status === order_tracking_data.status
    );

    const timeline: TimelineStep[] = statusSteps.map((step, index) => {
      const historyEntry = order_tracking_data.status_history.find(
        (h) => h.status === step.status
      );

      return {
        step_name: step.name,
        step_status: step.status,
        timestamp: historyEntry?.changed_at || null,
        is_current: index === currentStatusIndex,
        is_completed:
          index < currentStatusIndex ||
          (index === currentStatusIndex && order_tracking_data.status !== 'cancelled'),
      };
    });

    setStatusTimeline(timeline);

    // Calculate progress percentage
    const progressValue =
      currentStatusIndex >= 0
        ? Math.round(((currentStatusIndex + 1) / statusSteps.length) * 100)
        : 0;
    setProgressPercentage(progressValue);

    // Calculate time until ready
    const estimatedTime = order_tracking_data.estimated_time || order_tracking_data.collection_time_slot;
    if (estimatedTime) {
      setTimeUntilReady(calculateTimeRemaining(estimatedTime));
    }

    // Clear any previous errors
    setTrackingError(null);
  }, [order_tracking_data]);

  // ===========================
  // WebSocket Subscription
  // ===========================
  useEffect(() => {
    if (!order_id || !auth_token) return;

    // Subscribe to order updates
    subscribe_to_order_updates(order_id);

    // Cleanup on unmount
    return () => {
      unsubscribe_from_order_updates(order_id);
    };
  }, [order_id, auth_token, subscribe_to_order_updates, unsubscribe_from_order_updates]);

  // ===========================
  // Listen to Global Notifications (WebSocket)
  // ===========================
  const global_notifications = useAppStore(state => state.notification_state.notifications);

  useEffect(() => {
    // Filter notifications related to this order
    const orderNotifications = global_notifications.filter(
      (notif) => 
        notif.type === 'order_status_update' && 
        notif.message.includes(order_tracking_data?.order_number || '')
    );

    // Convert global notifications to tracking notifications
    const newTrackingNotifications: TrackingNotification[] = orderNotifications.map((notif) => ({
      message: notif.message,
      type: 'info' as const,
      timestamp: notif.created_at,
      dismissed: notif.read,
      id: notif.id,
    }));

    // Only add notifications that aren't already in the list
    setTrackingNotifications((prev) => {
      const existingIds = new Set(prev.map((n) => n.id));
      const uniqueNew = newTrackingNotifications.filter((n) => !existingIds.has(n.id));
      return [...uniqueNew, ...prev].slice(0, 5); // Keep last 5 notifications
    });
  }, [global_notifications, order_tracking_data?.order_number]);

  // ===========================
  // Countdown Timer Update
  // ===========================
  useEffect(() => {
    if (!order_tracking_data) return;

    const estimatedTime = order_tracking_data.estimated_time || order_tracking_data.collection_time_slot;
    if (!estimatedTime) return;

    const interval = setInterval(() => {
      setTimeUntilReady(calculateTimeRemaining(estimatedTime));
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [order_tracking_data]);

  // ===========================
  // Manual Refresh Handler
  // ===========================
  const handleRefresh = () => {
    refetch();
    add_notification({
      type: 'info',
      message: 'Refreshing order status...',
    });
  };

  // ===========================
  // Download Invoice Handler
  // ===========================
  const handleDownloadInvoice = async () => {
    if (!order_id || !auth_token) return;

    try {
      const response = await axios.get<{ invoice_url: string }>(
        `${API_BASE_URL}/api/orders/${order_id}/invoice`,
        {
          headers: {
            Authorization: `Bearer ${auth_token}`,
          },
        }
      );

      if (response.data.invoice_url) {
        window.open(response.data.invoice_url, '_blank');
        add_notification({
          type: 'success',
          message: 'Invoice opened in new tab',
        });
      }
    } catch (error) {
      console.error('Error downloading invoice:', error);
      add_notification({
        type: 'error',
        message: 'Failed to download invoice. Please try again.',
      });
    }
  };

  // ===========================
  // Dismiss Notification Handler
  // ===========================
  const dismissNotification = (id: string) => {
    setTrackingNotifications((prev) =>
      prev.map((notif) => (notif.id === id ? { ...notif, dismissed: true } : notif))
    );
  };

  // ===========================
  // Error Handling
  // ===========================
  useEffect(() => {
    if (isError) {
      const errorMessage = axios.isAxiosError(error)
        ? error.response?.status === 404
          ? 'Order not found or you do not have access to this order.'
          : error.response?.status === 401
          ? 'Please log in to view order tracking.'
          : 'Unable to load tracking data. Please check your connection.'
        : 'Something went wrong. Please try again later.';

      setTrackingError(errorMessage);
    }
  }, [isError, error]);

  // ===========================
  // Loading State
  // ===========================
  if (isLoading) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-600 mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading order tracking...</p>
          </div>
        </div>
      </>
    );
  }

  // ===========================
  // Error State
  // ===========================
  if (tracking_error || !order_tracking_data) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
            <AlertCircle className="size-16 text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Unable to Load Tracking</h2>
            <p className="text-gray-600 mb-6">
              {tracking_error || 'Order tracking data is not available.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleRefresh}
                className="px-6 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors"
              >
                Try Again
              </button>
              <Link
                to="/orders"
                className="px-6 py-3 bg-gray-100 text-gray-900 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Back to Orders
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ===========================
  // Main Render
  // ===========================
  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  Order {order_tracking_data.order_number}
                </h1>
                <p className="text-gray-600 mt-1">Real-time tracking</p>
              </div>
              <div className="flex items-center gap-3">
                {/* WebSocket Status Indicator */}
                <div className="flex items-center gap-2">
                  {websocket_connected ? (
                    <>
                      <Wifi className="size-4 text-green-600" />
                      <span className="text-xs text-green-600 font-medium hidden sm:inline">Live</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="size-4 text-gray-400" />
                      <span className="text-xs text-gray-400 font-medium hidden sm:inline">Offline</span>
                    </>
                  )}
                </div>

                {/* Refresh Button */}
                <button
                  onClick={handleRefresh}
                  disabled={isFetching}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Refresh tracking data"
                >
                  <RefreshCw className={`size-4 ${isFetching ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Progress</span>
                <span className="text-sm font-bold text-gray-900">{progress_percentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ease-out rounded-full ${getProgressColor(progress_percentage)}`}
                  style={{ width: `${progress_percentage}%` }}
                />
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex items-center gap-2 mt-4">
              <span
                className={`px-4 py-2 rounded-full text-sm font-semibold border ${getStatusColor(order_tracking_data.status)}`}
              >
                {order_tracking_data.status.charAt(0).toUpperCase() + order_tracking_data.status.slice(1).replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* Real-time Notifications */}
          {tracking_notifications.filter((n) => !n.dismissed).length > 0 && (
            <div className="mb-6 space-y-2">
              {tracking_notifications
                .filter((n) => !n.dismissed)
                .slice(0, 3)
                .map((notif) => (
                  <div
                    key={notif.id}
                    className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start justify-between"
                  >
                    <div className="flex items-start gap-3">
                      <div className="size-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Clock className="size-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-blue-900 font-medium">{notif.message}</p>
                        <p className="text-blue-600 text-xs mt-1">
                          {new Date(notif.timestamp).toLocaleTimeString('en-IE', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => dismissNotification(notif.id)}
                      className="text-blue-400 hover:text-blue-600 transition-colors"
                      aria-label="Dismiss notification"
                    >
                      <XCircle className="size-5" />
                    </button>
                  </div>
                ))}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Status Timeline (Left Column) */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Order Status Timeline</h2>

              <ol className="relative border-l-2 border-gray-200 ml-4 space-y-8">
                {status_timeline.map((step, index) => (
                  <li key={index} className="ml-6 relative">
                    {/* Timeline Icon */}
                    <span
                      className={`absolute -left-9 flex items-center justify-center size-8 rounded-full ${
                        step.is_completed
                          ? 'bg-green-100 border-4 border-green-600'
                          : step.is_current
                          ? 'bg-yellow-100 border-4 border-yellow-500'
                          : 'bg-gray-100 border-4 border-gray-300'
                      }`}
                    >
                      {step.is_completed ? (
                        <CheckCircle className="size-4 text-green-600" />
                      ) : step.is_current ? (
                        <div className="size-3 bg-yellow-500 rounded-full animate-pulse" />
                      ) : (
                        <Circle className="size-4 text-gray-400" />
                      )}
                    </span>

                    {/* Step Content */}
                    <div>
                      <h3
                        className={`text-lg font-semibold mb-1 ${
                          step.is_current
                            ? 'text-yellow-600'
                            : step.is_completed
                            ? 'text-green-700'
                            : 'text-gray-500'
                        }`}
                      >
                        {step.step_name}
                      </h3>

                      {step.timestamp && (
                        <p className="text-sm text-gray-600">
                          {new Date(step.timestamp).toLocaleString('en-IE', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      )}

                      {step.is_current && !step.timestamp && (
                        <p className="text-sm text-yellow-600 font-medium">In progress...</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {/* Order Info & Actions (Right Column) */}
            <div className="space-y-6">
              {/* Estimated Time Card */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="size-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <Clock className="size-5 text-orange-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {order_tracking_data.order_type === 'collection' ? 'Pickup Time' : 'Delivery Time'}
                  </h3>
                </div>

                {time_until_ready.ready_at_time ? (
                  <>
                    <div className="text-center py-4 mb-4 bg-orange-50 rounded-lg">
                      <p className="text-3xl font-bold text-orange-600">
                        {time_until_ready.ready_at_time}
                      </p>
                      {time_until_ready.minutes_remaining !== null && time_until_ready.minutes_remaining > 0 && (
                        <p className="text-gray-600 mt-1">
                          {time_until_ready.minutes_remaining} minutes remaining
                        </p>
                      )}
                      {time_until_ready.is_overdue && (
                        <p className="text-red-600 font-medium mt-1">Ready now!</p>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-gray-600 text-sm">
                    We'll notify you when your order is ready
                  </p>
                )}

                {/* Order Type Badge */}
                <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                  <Package className="size-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">
                    {order_tracking_data.order_type === 'collection' ? 'Collection' : 'Delivery'}
                  </span>
                </div>

                {/* Address or Pickup Info */}
                {order_tracking_data.order_type === 'delivery' && order_tracking_data.delivery_address_snapshot && (
                  <div className="flex items-start gap-2 mt-3">
                    <MapPin className="size-5 text-gray-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-gray-700">
                      <p>{order_tracking_data.delivery_address_snapshot.address_line1}</p>
                      {order_tracking_data.delivery_address_snapshot.address_line2 && (
                        <p>{order_tracking_data.delivery_address_snapshot.address_line2}</p>
                      )}
                      <p>
                        {order_tracking_data.delivery_address_snapshot.city}, {order_tracking_data.delivery_address_snapshot.postal_code}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions Card */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Actions</h3>

                <div className="space-y-3">
                  {/* Download Invoice */}
                  {order_tracking_data.status === 'completed' && (
                    <button
                      onClick={handleDownloadInvoice}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors"
                    >
                      <Download className="size-5" />
                      Download Invoice
                    </button>
                  )}

                  {/* Contact Support */}
                  <a
                    href={`tel:${order_tracking_data.customer_phone}`}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-900 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                  >
                    <Phone className="size-5" />
                    Call Support
                  </a>

                  <a
                    href="mailto:support@salamalama.ie"
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-900 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                  >
                    <Mail className="size-5" />
                    Email Support
                  </a>

                  {/* Back to Orders */}
                  <Link
                    to="/orders"
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-900 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                  >
                    Back to Orders
                  </Link>
                </div>
              </div>

              {/* Customer Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-600 mb-1">Order for</p>
                <p className="font-semibold text-gray-900">{order_tracking_data.customer_name}</p>
                <p className="text-sm text-gray-600">{order_tracking_data.customer_phone}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_OrderTracking;