import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { 
  ShoppingCart, 
  Award, 
  Package, 
  User, 
  TrendingUp, 
  Clock,
  MapPin,
  Truck,
  Star,
  Gift,
  ChevronRight,
  RefreshCw,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

// ===========================
// Type Definitions
// ===========================

interface User {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  profile_photo_url: string | null;
  email_verified: boolean;
}

interface DashboardSummary {
  total_orders: number;
  total_spent: number;
  current_points_balance: number;
  next_reward_points_needed: number;
}

interface LoyaltyHighlight {
  current_points_balance: number;
  total_points_earned: number;
  next_milestone: {
    name: string;
    points_required: number;
    points_remaining: number;
  } | null;
  recent_badges: Array<{
    badge_id: string;
    name: string;
    icon_url: string;
    earned_at: string;
  }>;
}

interface RecentOrder {
  order_id: string;
  order_number: string;
  order_type: 'collection' | 'delivery';
  status: string;
  total_amount: number;
  created_at: string;
}

interface ActiveOrder {
  order_id: string;
  order_number: string;
  status: string;
  collection_time_slot: string | null;
  estimated_delivery_time: string | null;
}

interface PointsTransaction {
  transaction_id: string;
  transaction_type: 'earned' | 'redeemed' | 'expired' | 'manual_adjustment';
  points_amount: number;
  created_at: string;
  reason: string | null;
}

// ===========================
// API Configuration
// ===========================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// ===========================
// Helper Functions
// ===========================

const calculateNextRewardPoints = (currentPoints: number): number => {
  // Standard reward tiers: 500, 1000, 2500, 5000
  const tiers = [500, 1000, 2500, 5000];
  for (const tier of tiers) {
    if (currentPoints < tier) {
      return tier - currentPoints;
    }
  }
  // If above all tiers, next is at 5000 interval
  const nextTier = Math.ceil(currentPoints / 5000) * 5000;
  return nextTier - currentPoints;
};

const calculateNextMilestone = (currentPoints: number) => {
  const tiers = [
    { name: 'Bronze Reward', points: 500 },
    { name: 'Silver Reward', points: 1000 },
    { name: 'Gold Reward', points: 2500 },
    { name: 'Platinum Reward', points: 5000 },
  ];
  
  for (const tier of tiers) {
    if (currentPoints < tier.points) {
      return {
        name: tier.name,
        points_required: tier.points,
        points_remaining: tier.points - currentPoints,
      };
    }
  }
  
  // Beyond platinum, next milestone at 5000 intervals
  const nextTier = Math.ceil(currentPoints / 5000) * 5000;
  return {
    name: 'Elite Reward',
    points_required: nextTier,
    points_remaining: nextTier - currentPoints,
  };
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-IE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
};

const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return formatDate(dateString);
};

const getStatusBadgeStyles = (status: string): string => {
  const styles: Record<string, string> = {
    received: 'bg-blue-100 text-blue-800',
    preparing: 'bg-yellow-100 text-yellow-800',
    ready: 'bg-green-100 text-green-800',
    out_for_delivery: 'bg-purple-100 text-purple-800',
    completed: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-red-100 text-red-800',
  };
  return styles[status] || 'bg-gray-100 text-gray-800';
};

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    received: 'Received',
    preparing: 'Preparing',
    ready: 'Ready',
    out_for_delivery: 'Out for Delivery',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  return labels[status] || status;
};

const getInitials = (firstName: string, lastName: string): string => {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
};

// ===========================
// Main Component
// ===========================

const UV_CustomerDashboard: React.FC = () => {
  // ===========================
  // Zustand Store Access (Individual Selectors)
  // ===========================
  
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const addToCart = useAppStore(state => state.add_to_cart);

  // ===========================
  // Local State
  // ===========================
  
  const [reorderingOrderId, setReorderingOrderId] = useState<string | null>(null);
  const [reorderError, setReorderError] = useState<string | null>(null);
  const [reorderSuccess, setReorderSuccess] = useState<string | null>(null);

  // ===========================
  // Data Fetching with React Query
  // ===========================

  // Fetch Dashboard Overview (Profile + Stats)
  const {
    data: profileData,
    isLoading: isLoadingProfile,
    error: profileError,
    refetch: refetchProfile,
  } = useQuery({
    queryKey: ['dashboard-profile', currentUser?.user_id],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/profile`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      return response.data;
    },
    enabled: !!authToken && !!currentUser,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // Fetch Loyalty Details
  const {
    data: loyaltyData,
    isLoading: isLoadingLoyalty,
    error: loyaltyError,
    refetch: refetchLoyalty,
  } = useQuery({
    queryKey: ['loyalty-account', currentUser?.user_id],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/loyalty`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      return response.data;
    },
    enabled: !!authToken && !!currentUser,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    select: (data) => {
      // Transform to frontend format with computed next milestone
      return {
        loyalty_account_id: data.loyalty_account_id,
        current_points_balance: Number(data.current_points_balance || 0),
        total_points_earned: Number(data.total_points_earned || 0),
        referral_count: Number(data.referral_count || 0),
        next_milestone: calculateNextMilestone(Number(data.current_points_balance || 0)),
      };
    },
  });

  // Fetch Recent Orders (Last 5)
  const {
    data: recentOrdersData,
    isLoading: isLoadingRecentOrders,
    error: recentOrdersError,
    refetch: refetchRecentOrders,
  } = useQuery({
    queryKey: ['recent-orders', currentUser?.user_id],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/orders`, {
        headers: { Authorization: `Bearer ${authToken}` },
        params: {
          limit: 5,
          sort_by: 'created_at',
          sort_order: 'desc',
        },
      });
      return response.data;
    },
    enabled: !!authToken && !!currentUser,
    staleTime: 2 * 60 * 1000,
    retry: 1,
    select: (data) => {
      // Transform orders data
      return {
        orders: data.orders.map((order: any) => ({
          order_id: order.order_id,
          order_number: order.order_number,
          order_type: order.order_type,
          status: order.status,
          total_amount: Number(order.total_amount || 0),
          created_at: order.created_at,
        })),
        total: data.total,
      };
    },
  });

  // Fetch Active Orders (In-progress only)
  const {
    data: activeOrdersData,
    isLoading: isLoadingActiveOrders,
    error: activeOrdersError,
    refetch: refetchActiveOrders,
  } = useQuery({
    queryKey: ['active-orders', currentUser?.user_id],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/orders`, {
        headers: { Authorization: `Bearer ${authToken}` },
        params: {
          status: 'received,preparing,ready,out_for_delivery',
          limit: 10,
          sort_by: 'created_at',
          sort_order: 'desc',
        },
      });
      return response.data;
    },
    enabled: !!authToken && !!currentUser,
    staleTime: 1 * 60 * 1000, // 1 minute - more frequent updates for active orders
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: 1,
    select: (data) => {
      // Transform active orders
      return {
        orders: data.orders.map((order: any) => ({
          order_id: order.order_id,
          order_number: order.order_number,
          status: order.status,
          collection_time_slot: order.collection_time_slot,
          estimated_delivery_time: order.estimated_delivery_time,
        })),
      };
    },
  });

  // Fetch Points History (for recent activity)
  const {
    data: pointsHistoryData,
  } = useQuery({
    queryKey: ['points-history', currentUser?.user_id],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/loyalty/points/history`, {
        headers: { Authorization: `Bearer ${authToken}` },
        params: {
          limit: 5,
        },
      });
      return response.data;
    },
    enabled: !!authToken && !!currentUser,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    select: (data) => {
      return {
        transactions: data.transactions.map((txn: any) => ({
          transaction_id: txn.transaction_id,
          transaction_type: txn.transaction_type,
          points_amount: Number(txn.points_amount || 0),
          created_at: txn.created_at,
          reason: txn.reason,
        })),
      };
    },
  });

  // Fetch Earned Badges
  const {
    data: badgesData,
  } = useQuery({
    queryKey: ['earned-badges', currentUser?.user_id],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/loyalty/badges`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      return response.data;
    },
    enabled: !!authToken && !!currentUser,
    staleTime: 10 * 60 * 1000,
    retry: 1,
    select: (data) => {
      // Get only earned badges, sorted by most recent
      const earnedBadges = data.earned || [];
      return earnedBadges
        .sort((a: any, b: any) => new Date(b.earned_at).getTime() - new Date(a.earned_at).getTime())
        .slice(0, 3); // Show only 3 most recent
    },
  });

  // ===========================
  // Computed Values
  // ===========================

  const userProfile: User | null = currentUser;
  
  const dashboardSummary: DashboardSummary = {
    total_orders: recentOrdersData?.total || 0,
    total_spent: profileData?.stats?.total_spent || 0,
    current_points_balance: loyaltyData?.current_points_balance || 0,
    next_reward_points_needed: calculateNextRewardPoints(loyaltyData?.current_points_balance || 0),
  };

  const loyaltyHighlights: LoyaltyHighlight = {
    current_points_balance: loyaltyData?.current_points_balance || 0,
    total_points_earned: loyaltyData?.total_points_earned || 0,
    next_milestone: loyaltyData?.next_milestone || null,
    recent_badges: badgesData || [],
  };

  const recentOrders: RecentOrder[] = recentOrdersData?.orders || [];
  const activeOrders: ActiveOrder[] = activeOrdersData?.orders || [];

  const isLoadingAll = isLoadingProfile || isLoadingLoyalty || isLoadingRecentOrders || isLoadingActiveOrders;

  const progressPercentage = loyaltyHighlights.next_milestone
    ? ((loyaltyHighlights.next_milestone.points_required - loyaltyHighlights.next_milestone.points_remaining) / 
       loyaltyHighlights.next_milestone.points_required) * 100
    : 100;

  // ===========================
  // Reorder Functionality
  // ===========================

  const handleReorder = async (orderId: string) => {
    setReorderingOrderId(orderId);
    setReorderError(null);
    setReorderSuccess(null);

    try {
      // Fetch full order details including items
      const response = await axios.get(`${API_BASE_URL}/api/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const orderData = response.data;

      // Add each item to cart
      if (orderData.items && orderData.items.length > 0) {
        for (const item of orderData.items) {
          const cartItem = {
            item_id: item.item_id,
            item_name: item.item_name,
            quantity: Number(item.quantity || 1),
            unit_price: Number(item.unit_price || 0),
            customizations: item.selected_customizations 
              ? Object.entries(item.selected_customizations).map(([group, option]: [string, any]) => ({
                  group_name: group,
                  option_name: typeof option === 'string' ? option : option.name,
                  additional_price: typeof option === 'object' && option.price ? Number(option.price) : 0,
                }))
              : [],
            line_total: Number(item.line_total || 0),
          };

          addToCart(cartItem);
        }

        setReorderSuccess(`${orderData.items.length} item(s) added to cart!`);
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setReorderSuccess(null);
        }, 3000);
      } else {
        setReorderError('No items found in this order');
      }
    } catch (error: any) {
      console.error('Reorder error:', error);
      setReorderError(error.response?.data?.message || 'Failed to add items to cart');
    } finally {
      setReorderingOrderId(null);
    }
  };

  // ===========================
  // JSX Render
  // ===========================

  return (
    <>
      {/* Main Content with proper spacing below sticky header */}
      <div className="min-h-screen bg-[#F2EFE9] py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          
          {/* Loading State */}
          {isLoadingAll && (
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600 font-medium">Loading your dashboard...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {!isLoadingAll && (profileError || loyaltyError || recentOrdersError || activeOrdersError) && (
            <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg shadow-lg mb-8">
              <div className="flex items-start">
                <AlertCircle className="h-6 w-6 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Dashboard</h3>
                  <p className="text-red-700 text-sm mb-4">
                    {(profileError as any)?.message || 
                     (loyaltyError as any)?.message || 
                     (recentOrdersError as any)?.message ||
                     (activeOrdersError as any)?.message ||
                     'Failed to load dashboard data'}
                  </p>
                  <button
                    onClick={() => {
                      refetchProfile();
                      refetchLoyalty();
                      refetchRecentOrders();
                      refetchActiveOrders();
                    }}
                    className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Retry</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Main Content */}
          {!isLoadingAll && userProfile && (
            <>
              {/* Welcome Section */}
              <div className="mb-8">
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 lg:p-8">
                  <div className="flex items-center space-x-4">
                    {/* Profile Photo or Avatar */}
                    {userProfile.profile_photo_url ? (
                      <img
                        src={userProfile.profile_photo_url}
                        alt={`${userProfile.first_name} ${userProfile.last_name}`}
                        className="h-16 w-16 rounded-full object-cover border-4 border-blue-500"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold">
                        {getInitials(userProfile.first_name, userProfile.last_name)}
                      </div>
                    )}

                    {/* Welcome Text */}
                    <div className="flex-1">
                      <h1 className="text-3xl font-bold text-gray-900">
                        Welcome back, {userProfile.first_name}! 👋
                      </h1>
                      <div className="flex items-center space-x-3 mt-1">
                        <p className="text-gray-600">{userProfile.email}</p>
                        {userProfile.email_verified && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Verified
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Email Verification Banner */}
              {!userProfile.email_verified && (
                <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-lg shadow">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-yellow-500 mr-3 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-yellow-800 mb-1">
                        Email Verification Required
                      </h3>
                      <p className="text-sm text-yellow-700 mb-3">
                        Please verify your email address to access all features and receive important updates about your orders.
                      </p>
                      <Link
                        to="/profile"
                        className="inline-flex items-center text-yellow-800 hover:text-yellow-900 font-semibold text-sm"
                      >
                        Verify Email
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* Reorder Success Message */}
              {reorderSuccess && (
                <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded-lg shadow">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    <p className="text-green-800 font-medium">{reorderSuccess}</p>
                    <Link
                      to="/cart"
                      className="ml-auto text-green-700 hover:text-green-900 font-semibold flex items-center"
                    >
                      View Cart
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Link>
                  </div>
                </div>
              )}

              {/* Reorder Error Message */}
              {reorderError && (
                <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg shadow">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
                    <p className="text-red-800 font-medium">{reorderError}</p>
                    <button
                      onClick={() => setReorderError(null)}
                      className="ml-auto text-red-700 hover:text-red-900"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              {/* Dashboard Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Total Orders Card */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <Package className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">Total Orders</p>
                  <p className="text-3xl font-bold text-gray-900">{dashboardSummary.total_orders}</p>
                </div>

                {/* Total Spent Card */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-green-100 rounded-lg">
                      <TrendingUp className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">Total Spent</p>
                  <p className="text-3xl font-bold text-gray-900">{formatCurrency(dashboardSummary.total_spent)}</p>
                </div>

                {/* Loyalty Points Card */}
                <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-200 cursor-pointer"
                     onClick={() => window.location.href = '/rewards'}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-white/20 rounded-lg backdrop-blur">
                      <Award className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <p className="text-sm text-white/90 mb-1">Loyalty Points</p>
                  <p className="text-4xl font-bold text-white">{loyaltyHighlights.current_points_balance}</p>
                  <p className="text-xs text-white/80 mt-1">
                    {dashboardSummary.next_reward_points_needed} more to next reward
                  </p>
                </div>

                {/* Quick Action Card */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-200">
                  <Link
                    to="/menu"
                    className="flex flex-col h-full items-center justify-center text-center group"
                  >
                    <div className="p-4 bg-blue-100 rounded-full mb-3 group-hover:bg-blue-200 transition-colors">
                      <ShoppingCart className="h-8 w-8 text-blue-600" />
                    </div>
                    <p className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                      Order Now
                    </p>
                    <p className="text-sm text-gray-600 mt-1">Browse our menu</p>
                  </Link>
                </div>
              </div>

              {/* Main Grid Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Left Column - Loyalty & Active Orders */}
                <div className="lg:col-span-2 space-y-8">
                  
                  {/* Loyalty Progress Card */}
                  <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 lg:p-8">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                        <Star className="h-6 w-6 text-yellow-500 mr-2" />
                        Loyalty Progress
                      </h2>
                      <Link
                        to="/rewards"
                        className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center"
                      >
                        View All Rewards
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Link>
                    </div>

                    {/* Progress Bar */}
                    {loyaltyHighlights.next_milestone && (
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">
                            Progress to {loyaltyHighlights.next_milestone.name}
                          </span>
                          <span className="text-sm font-bold text-blue-600">
                            {Math.round(progressPercentage)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          Only {loyaltyHighlights.next_milestone.points_remaining} more points needed!
                        </p>
                      </div>
                    )}

                    {/* Points Summary */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Current Balance</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {loyaltyHighlights.current_points_balance}
                        </p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Total Earned</p>
                        <p className="text-2xl font-bold text-green-600">
                          {loyaltyHighlights.total_points_earned}
                        </p>
                      </div>
                    </div>

                    {/* Recent Badges */}
                    {loyaltyHighlights.recent_badges.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent Achievements</h3>
                        <div className="flex space-x-3">
                          {loyaltyHighlights.recent_badges.map((badge) => (
                            <div
                              key={badge.badge_id}
                              className="flex-shrink-0 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-lg p-3 text-center hover:scale-105 transition-transform"
                              title={`${badge.name} - Earned ${formatRelativeTime(badge.earned_at)}`}
                            >
                              {badge.icon_url ? (
                                <img src={badge.icon_url} alt={badge.name} className="h-10 w-10 mx-auto mb-1" />
                              ) : (
                                <Gift className="h-10 w-10 text-orange-600 mx-auto mb-1" />
                              )}
                              <p className="text-xs font-medium text-gray-700 truncate max-w-[60px]">
                                {badge.name}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recent Points Activity */}
                    {pointsHistoryData?.transactions && pointsHistoryData.transactions.length > 0 && (
                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent Activity</h3>
                        <div className="space-y-2">
                          {pointsHistoryData.transactions.slice(0, 3).map((txn: PointsTransaction) => (
                            <div key={txn.transaction_id} className="flex items-center justify-between text-sm">
                              <div className="flex items-center space-x-2">
                                {txn.transaction_type === 'earned' ? (
                                  <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                                ) : (
                                  <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                                )}
                                <span className="text-gray-700">
                                  {txn.transaction_type === 'earned' ? 'Earned' : 'Redeemed'}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className={`font-semibold ${
                                  txn.transaction_type === 'earned' ? 'text-green-600' : 'text-blue-600'
                                }`}>
                                  {txn.transaction_type === 'earned' ? '+' : '-'}{Math.abs(txn.points_amount)}
                                </span>
                                <span className="text-gray-500 text-xs">
                                  {formatRelativeTime(txn.created_at)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Active Orders Card */}
                  {activeOrders.length > 0 && (
                    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 lg:p-8">
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                          <Clock className="h-6 w-6 text-blue-600 mr-2" />
                          Active Orders
                        </h2>
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                          {activeOrders.length} in progress
                        </span>
                      </div>

                      <div className="space-y-4">
                        {activeOrders.map((order) => (
                          <div
                            key={order.order_id}
                            className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-3">
                                <div className="p-2 bg-blue-100 rounded">
                                  {order.collection_time_slot ? (
                                    <MapPin className="h-5 w-5 text-blue-600" />
                                  ) : (
                                    <Truck className="h-5 w-5 text-blue-600" />
                                  )}
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-900">{order.order_number}</p>
                                  <p className="text-xs text-gray-600">
                                    {order.collection_time_slot 
                                      ? `Collection: ${formatDate(order.collection_time_slot)}`
                                      : `Delivery: ${order.estimated_delivery_time || 'Processing'}`
                                    }
                                  </p>
                                </div>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeStyles(order.status)}`}>
                                {getStatusLabel(order.status)}
                              </span>
                            </div>

                            <div className="flex space-x-2">
                              <Link
                                to={`/orders/${order.order_id}/track`}
                                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-center text-sm font-medium"
                              >
                                Track Order
                              </Link>
                              <Link
                                to={`/orders/${order.order_id}`}
                                className="flex-1 bg-gray-100 text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-center text-sm font-medium"
                              >
                                View Details
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent Orders Card */}
                  <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 lg:p-8">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                        <Package className="h-6 w-6 text-gray-600 mr-2" />
                        Recent Orders
                      </h2>
                      <Link
                        to="/orders"
                        className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center"
                      >
                        View All Orders
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Link>
                    </div>

                    {recentOrders.length === 0 ? (
                      <div className="text-center py-12">
                        <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600 mb-4">You haven't placed any orders yet</p>
                        <Link
                          to="/menu"
                          className="inline-flex items-center bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                          Browse Menu
                          <ChevronRight className="h-4 w-4 ml-2" />
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {recentOrders.map((order) => (
                          <div
                            key={order.order_id}
                            className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <p className="font-semibold text-gray-900">{order.order_number}</p>
                                <p className="text-sm text-gray-600">{formatDate(order.created_at)}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-gray-900">{formatCurrency(order.total_amount)}</p>
                                <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadgeStyles(order.status)}`}>
                                  {getStatusLabel(order.status)}
                                </span>
                              </div>
                            </div>

                            <div className="flex space-x-2">
                              <Link
                                to={`/orders/${order.order_id}`}
                                className="flex-1 bg-gray-100 text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-center text-sm font-medium"
                              >
                                View Details
                              </Link>
                              <button
                                onClick={() => handleReorder(order.order_id)}
                                disabled={reorderingOrderId === order.order_id}
                                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-center text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                              >
                                {reorderingOrderId === order.order_id ? (
                                  <>
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                    Adding...
                                  </>
                                ) : (
                                  <>
                                    <ShoppingCart className="h-4 w-4 mr-2" />
                                    Reorder
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column - Quick Actions */}
                <div className="space-y-6">
                  
                  {/* Quick Actions Card */}
                  <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
                    <div className="space-y-3">
                      <Link
                        to="/menu"
                        className="flex items-center justify-between bg-blue-50 hover:bg-blue-100 p-4 rounded-lg transition-colors group"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-blue-600 rounded-lg">
                            <ShoppingCart className="h-5 w-5 text-white" />
                          </div>
                          <span className="font-medium text-gray-900">Order Now</span>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600" />
                      </Link>

                      <Link
                        to="/orders"
                        className="flex items-center justify-between bg-gray-50 hover:bg-gray-100 p-4 rounded-lg transition-colors group"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-gray-600 rounded-lg">
                            <Package className="h-5 w-5 text-white" />
                          </div>
                          <span className="font-medium text-gray-900">My Orders</span>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600" />
                      </Link>

                      <Link
                        to="/rewards"
                        className="flex items-center justify-between bg-orange-50 hover:bg-orange-100 p-4 rounded-lg transition-colors group"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-orange-600 rounded-lg">
                            <Award className="h-5 w-5 text-white" />
                          </div>
                          <span className="font-medium text-gray-900">My Rewards</span>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-orange-600" />
                      </Link>

                      <Link
                        to="/profile"
                        className="flex items-center justify-between bg-gray-50 hover:bg-gray-100 p-4 rounded-lg transition-colors group"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-gray-600 rounded-lg">
                            <User className="h-5 w-5 text-white" />
                          </div>
                          <span className="font-medium text-gray-900">Edit Profile</span>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600" />
                      </Link>
                    </div>
                  </div>

                  {/* Account Info Card */}
                  <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl shadow-lg p-6 text-white">
                    <h3 className="text-lg font-semibold mb-3">Your Account</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-blue-100">Member Since</span>
                        <span className="font-semibold">
                          {new Date().getFullYear()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-blue-100">Total Orders</span>
                        <span className="font-semibold">{dashboardSummary.total_orders}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-blue-100">Loyalty Points</span>
                        <span className="font-semibold">{loyaltyHighlights.current_points_balance}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default UV_CustomerDashboard;