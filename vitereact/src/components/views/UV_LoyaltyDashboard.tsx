import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// ===========================
// Type Definitions
// ===========================

interface LoyaltyAccount {
  loyalty_account_id: string;
  user_id: string;
  current_points_balance: number;
  total_points_earned: number;
  total_points_redeemed: number;
  total_points_expired: number;
  referral_count: number;
  spin_wheel_available_count: number;
  next_spin_available_at: string | null;
  created_at: string;
}

interface PointsTransaction {
  transaction_id: string;
  loyalty_account_id: string;
  transaction_type: 'earned' | 'redeemed' | 'expired' | 'manual_adjustment';
  points_amount: number;
  order_id: string | null;
  reason: string | null;
  running_balance: number;
  created_at: string;
}

interface Reward {
  reward_id: string;
  name: string;
  description: string;
  points_cost: number;
  reward_type: 'discount' | 'delivery' | 'physical' | 'merchandise';
  reward_value: Record<string, any>;
  stock_remaining: number | null;
  status: 'active' | 'inactive' | 'out_of_stock';
  image_url: string | null;
  availability_status: 'available' | 'limited' | 'unavailable' | null;
}

interface RedeemedReward {
  redeemed_reward_id: string;
  loyalty_account_id: string;
  reward_id: string;
  reward_code: string;
  points_deducted: number;
  redeemed_at: string;
  expires_at: string | null;
  usage_status: 'unused' | 'used' | 'expired';
  used_in_order_id: string | null;
}

interface Badge {
  badge_id: string;
  name: string;
  description: string;
  unlock_criteria: Record<string, any>;
  icon_url: string;
  is_active: boolean;
  earned_at: string | null;
}

interface ReferralInfo {
  referral_code: string;
  referral_link: string;
  referral_count: number;
  successful_referrals: number;
  total_points_earned: number;
}

// ===========================
// API Functions
// ===========================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const fetchLoyaltyAccount = async (token: string): Promise<LoyaltyAccount> => {
  const response = await axios.get(`${API_BASE_URL}/api/loyalty`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

const fetchPointsHistory = async (
  token: string,
  limit: number,
  offset: number
): Promise<{ transactions: PointsTransaction[]; total: number }> => {
  const response = await axios.get(`${API_BASE_URL}/api/loyalty/points/history`, {
    headers: { Authorization: `Bearer ${token}` },
    params: { limit, offset },
  });
  return response.data;
};

const fetchAvailableRewards = async (token: string): Promise<Reward[]> => {
  const response = await axios.get(`${API_BASE_URL}/api/loyalty/rewards`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data.rewards;
};

const fetchRedeemedRewards = async (token: string): Promise<RedeemedReward[]> => {
  const response = await axios.get(`${API_BASE_URL}/api/loyalty/redeemed-rewards`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data.redeemed_rewards;
};

const fetchBadges = async (
  token: string
): Promise<{ earned: Badge[]; locked: Badge[] }> => {
  const response = await axios.get(`${API_BASE_URL}/api/loyalty/badges`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

const fetchReferralInfo = async (token: string): Promise<ReferralInfo> => {
  const response = await axios.get(`${API_BASE_URL}/api/loyalty/referral`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

const redeemRewardRequest = async (
  token: string,
  reward_id: string
): Promise<RedeemedReward> => {
  const response = await axios.post(
    `${API_BASE_URL}/api/loyalty/rewards/${reward_id}/redeem`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
};

// ===========================
// Main Component
// ===========================

const UV_LoyaltyDashboard: React.FC = () => {
  // CRITICAL: Individual Zustand selectors
  const currentUser = useAppStore((state) => state.authentication_state.current_user);
  const authToken = useAppStore((state) => state.authentication_state.auth_token);

  // Local state
  const [currentPage, setCurrentPage] = useState(1);
  const [redeemingRewardId, setRedeemingRewardId] = useState<string | null>(null);
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [redeemedRewardData, setRedeemedRewardData] = useState<RedeemedReward | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const itemsPerPage = 50;
  const queryClient = useQueryClient();

  // Queries
  const {
    data: loyaltyAccount,
    isLoading: loyaltyLoading,
    error: loyaltyError,
  } = useQuery<LoyaltyAccount>({
    queryKey: ['loyalty-account', currentUser?.user_id],
    queryFn: () => fetchLoyaltyAccount(authToken!),
    enabled: !!authToken && !!currentUser,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: pointsHistoryData,
    isLoading: historyLoading,
    error: historyError,
  } = useQuery({
    queryKey: ['points-history', currentUser?.user_id, currentPage],
    queryFn: () =>
      fetchPointsHistory(authToken!, itemsPerPage, (currentPage - 1) * itemsPerPage),
    enabled: !!authToken && !!currentUser,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: availableRewards,
    isLoading: rewardsLoading,
    error: rewardsError,
  } = useQuery<Reward[]>({
    queryKey: ['available-rewards', currentUser?.user_id],
    queryFn: () => fetchAvailableRewards(authToken!),
    enabled: !!authToken && !!currentUser,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: redeemedRewards,


  } = useQuery<RedeemedReward[]>({
    queryKey: ['redeemed-rewards', currentUser?.user_id],
    queryFn: () => fetchRedeemedRewards(authToken!),
    enabled: !!authToken && !!currentUser,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: badgesData,
    isLoading: badgesLoading,
    error: badgesError,
  } = useQuery({
    queryKey: ['badges', currentUser?.user_id],
    queryFn: () => fetchBadges(authToken!),
    enabled: !!authToken && !!currentUser,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: referralInfo,


  } = useQuery<ReferralInfo>({
    queryKey: ['referral-info', currentUser?.user_id],
    queryFn: () => fetchReferralInfo(authToken!),
    enabled: !!authToken && !!currentUser,
    staleTime: 5 * 60 * 1000,
  });

  // Mutation for redeeming rewards
  const redeemRewardMutation = useMutation({
    mutationFn: (reward_id: string) => redeemRewardRequest(authToken!, reward_id),
    onSuccess: (data) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['loyalty-account', currentUser?.user_id] });
      queryClient.invalidateQueries({ queryKey: ['redeemed-rewards', currentUser?.user_id] });
      queryClient.invalidateQueries({ queryKey: ['available-rewards', currentUser?.user_id] });
      
      // Show success modal
      setRedeemedRewardData(data);
      setShowRedeemModal(false);
      setShowSuccessModal(true);
      setRedeemingRewardId(null);
    },
    onError: (error: any) => {
      setNotification({ type: 'error', message: error.response?.data?.message || 'Failed to redeem reward. Please try again.' });
      setTimeout(() => setNotification(null), 3000);
      setRedeemingRewardId(null);
      setShowRedeemModal(false);
    },
  });

  // Helper functions
  const handleRedeemClick = (reward: Reward) => {
    if (!loyaltyAccount || loyaltyAccount.current_points_balance < reward.points_cost) {
      setNotification({ type: 'error', message: `You need ${reward.points_cost - (loyaltyAccount?.current_points_balance || 0)} more points to redeem this reward.` });
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    setSelectedReward(reward);
    setShowRedeemModal(true);
  };

  const confirmRedeem = () => {
    if (selectedReward) {
      setRedeemingRewardId(selectedReward.reward_id);
      redeemRewardMutation.mutate(selectedReward.reward_id);
    }
  };

  const copyReferralCode = async () => {
    if (referralInfo?.referral_code) {
      try {
        await navigator.clipboard.writeText(referralInfo.referral_code);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const copyRewardCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setNotification({ type: 'success', message: 'Reward code copied to clipboard!' });
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const shareReferralLink = () => {
    if (referralInfo?.referral_link) {
      if (navigator.share) {
        navigator
          .share({
            title: 'Join Salama Lama Food Truck',
            text: 'Use my referral code to get rewards!',
            url: referralInfo.referral_link,
          })
          .catch((err) => console.error('Share failed:', err));
      } else {
        // Fallback: Copy to clipboard
        navigator.clipboard.writeText(referralInfo.referral_link);
        setNotification({ type: 'success', message: 'Referral link copied to clipboard!' });
        setTimeout(() => setNotification(null), 3000);
      }
    }
  };

  const totalPages = Math.ceil((pointsHistoryData?.total || 0) / itemsPerPage);

  // Calculate next milestone
  const calculateNextMilestone = () => {
    if (!loyaltyAccount) return null;
    const milestones = [100, 250, 500, 1000, 2500, 5000];
    const current = loyaltyAccount.current_points_balance;
    const next = milestones.find((m) => m > current);
    if (!next) return null;
    return {
      points: next,
      remaining: next - current,
      progress: (current / next) * 100,
    };
  };

  const nextMilestone = calculateNextMilestone();

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IE', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Format transaction type
  const formatTransactionType = (type: string) => {
    return type.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <>
      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {notification.message}
        </div>
      )}

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">My Rewards</h1>
            <p className="text-lg text-gray-600">
              Earn points, unlock rewards, and share the love with friends!
            </p>
          </div>

          {/* Points Balance Hero */}
          {loyaltyLoading ? (
            <div className="bg-white rounded-xl shadow-lg p-8 mb-12 animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/3 mx-auto mb-4"></div>
              <div className="h-16 bg-gray-200 rounded w-1/2 mx-auto"></div>
            </div>
          ) : loyaltyError ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl mb-12">
              <p className="font-medium">Failed to load loyalty account</p>
            </div>
          ) : loyaltyAccount ? (
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl shadow-xl p-8 mb-12 text-white">
              <div className="text-center mb-6">
                <p className="text-blue-100 text-lg mb-2">Your Points Balance</p>
                <p className="text-6xl font-bold mb-2">{loyaltyAccount.current_points_balance.toLocaleString()}</p>
                <p className="text-blue-100">
                  {loyaltyAccount.total_points_earned.toLocaleString()} total earned · {loyaltyAccount.total_points_redeemed.toLocaleString()} redeemed
                </p>
              </div>

              {nextMilestone && (
                <div className="max-w-2xl mx-auto">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm text-blue-100">Next Milestone</p>
                    <p className="text-sm font-medium">{nextMilestone.points.toLocaleString()} points</p>
                  </div>
                  <div className="w-full bg-blue-800 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-white h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(nextMilestone.progress, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-blue-100 mt-2 text-center">
                    Only {nextMilestone.remaining.toLocaleString()} more points to go!
                  </p>
                </div>
              )}
            </div>
          ) : null}

          {/* Available Rewards */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-gray-900">Redeem Your Points</h2>
              <Link
                to="/menu"
                className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                Earn More Points →
              </Link>
            </div>

            {rewardsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-xl shadow-lg p-6 animate-pulse">
                    <div className="h-48 bg-gray-200 rounded-lg mb-4"></div>
                    <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                  </div>
                ))}
              </div>
            ) : rewardsError ? (
              <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl">
                <p className="font-medium">Failed to load rewards</p>
              </div>
            ) : availableRewards && availableRewards.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableRewards
                  .filter((r) => r.status === 'active')
                  .map((reward) => {
                    const canAfford = loyaltyAccount && loyaltyAccount.current_points_balance >= reward.points_cost;
                    const isOutOfStock = reward.availability_status === 'unavailable' || reward.status === 'out_of_stock';
                    
                    return (
                      <div
                        key={reward.reward_id}
                        className={`bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-200 hover:shadow-xl ${
                          !canAfford || isOutOfStock ? 'opacity-60' : ''
                        }`}
                      >
                        {reward.image_url && (
                          <div className="h-48 bg-gray-200 overflow-hidden">
                            <img
                              src={reward.image_url}
                              alt={reward.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="p-6">
                          <div className="flex items-start justify-between mb-3">
                            <h3 className="text-xl font-bold text-gray-900">{reward.name}</h3>
                            {reward.availability_status === 'limited' && (
                              <span className="bg-orange-100 text-orange-700 text-xs font-medium px-2 py-1 rounded">
                                Limited
                              </span>
                            )}
                          </div>
                          <p className="text-gray-600 text-sm mb-4 leading-relaxed">{reward.description}</p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <svg className="w-5 h-5 text-blue-600 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                              </svg>
                              <span className="text-2xl font-bold text-gray-900">
                                {reward.points_cost.toLocaleString()}
                              </span>
                            </div>
                            <button
                              onClick={() => handleRedeemClick(reward)}
                              disabled={!canAfford || isOutOfStock || redeemingRewardId === reward.reward_id}
                              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                                !canAfford || isOutOfStock
                                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                  : redeemingRewardId === reward.reward_id
                                  ? 'bg-blue-400 text-white cursor-wait'
                                  : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg'
                              }`}
                            >
                              {redeemingRewardId === reward.reward_id ? (
                                <span className="flex items-center">
                                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Redeeming...
                                </span>
                              ) : isOutOfStock ? (
                                'Out of Stock'
                              ) : !canAfford ? (
                                'Not Enough Points'
                              ) : (
                                'Redeem'
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <p className="text-gray-600 mb-4">No rewards available at the moment.</p>
                <p className="text-sm text-gray-500">Check back soon for exciting new rewards!</p>
              </div>
            )}
          </div>

          {/* Achievement Badges */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Your Achievements</h2>

            {badgesLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="bg-white rounded-xl p-4 shadow-lg animate-pulse">
                    <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
                  </div>
                ))}
              </div>
            ) : badgesError ? (
              <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl">
                <p className="font-medium">Failed to load badges</p>
              </div>
            ) : badgesData ? (
              <div className="space-y-8">
                {badgesData.earned.length > 0 && (
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">Earned Badges</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {badgesData.earned.map((badge) => (
                        <div
                          key={badge.badge_id}
                          className="bg-white rounded-xl p-4 shadow-lg hover:shadow-xl transition-shadow duration-200 text-center"
                        >
                          <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                            {badge.icon_url ? (
                              <img src={badge.icon_url} alt={badge.name} className="w-10 h-10" />
                            ) : (
                              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <h4 className="font-semibold text-gray-900 text-sm mb-1">{badge.name}</h4>
                          <p className="text-xs text-gray-500 leading-tight">{badge.description}</p>
                          {badge.earned_at && (
                            <p className="text-xs text-blue-600 mt-2">{formatDate(badge.earned_at)}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {badgesData.locked.length > 0 && (
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">Locked Badges</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {badgesData.locked.map((badge) => (
                        <div
                          key={badge.badge_id}
                          className="bg-white rounded-xl p-4 shadow-lg opacity-60 text-center"
                        >
                          <div className="w-16 h-16 mx-auto mb-3 bg-gray-300 rounded-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <h4 className="font-semibold text-gray-700 text-sm mb-1">{badge.name}</h4>
                          <p className="text-xs text-gray-500 leading-tight">{badge.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Redeemed Rewards */}
          {redeemedRewards && redeemedRewards.length > 0 && (
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">My Redeemed Rewards</h2>
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Reward Code
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Points Used
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Redeemed
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Expires
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {redeemedRewards.map((reward) => (
                        <tr key={reward.redeemed_reward_id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="font-mono font-semibold text-blue-600">
                              {reward.reward_code}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {reward.points_deducted.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                reward.usage_status === 'unused'
                                  ? 'bg-green-100 text-green-800'
                                  : reward.usage_status === 'used'
                                  ? 'bg-gray-100 text-gray-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {reward.usage_status === 'unused' ? 'Active' : reward.usage_status === 'used' ? 'Used' : 'Expired'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(reward.redeemed_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {reward.expires_at ? formatDate(reward.expires_at) : 'Never'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {reward.usage_status === 'unused' && (
                              <button
                                onClick={() => copyRewardCode(reward.reward_code)}
                                className="text-blue-600 hover:text-blue-700 font-medium"
                              >
                                Copy Code
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Points History */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Points History</h2>

            {historyLoading ? (
              <div className="bg-white rounded-xl shadow-lg p-6 animate-pulse">
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center justify-between py-3 border-b border-gray-100">
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                      </div>
                      <div className="h-6 bg-gray-200 rounded w-20"></div>
                    </div>
                  ))}
                </div>
              </div>
            ) : historyError ? (
              <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl">
                <p className="font-medium">Failed to load points history</p>
              </div>
            ) : pointsHistoryData && pointsHistoryData.transactions.length > 0 ? (
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Reason
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Points
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Balance
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {pointsHistoryData.transactions.map((transaction) => (
                        <tr key={transaction.transaction_id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(transaction.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                transaction.transaction_type === 'earned'
                                  ? 'bg-green-100 text-green-800'
                                  : transaction.transaction_type === 'redeemed'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {formatTransactionType(transaction.transaction_type)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {transaction.reason || (transaction.order_id ? `Order #${transaction.order_id.slice(-8)}` : '-')}
                          </td>
                          <td
                            className={`px-6 py-4 whitespace-nowrap text-sm font-semibold text-right ${
                              transaction.points_amount > 0 ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {transaction.points_amount > 0 ? '+' : ''}
                            {transaction.points_amount.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                            {transaction.running_balance.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
                    <div className="flex-1 flex justify-between sm:hidden">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-700">
                          Showing page <span className="font-medium">{currentPage}</span> of{' '}
                          <span className="font-medium">{totalPages}</span>
                        </p>
                      </div>
                      <div>
                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                          <button
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="sr-only">Previous</span>
                            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </button>
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            const pageNumber = i + 1;
                            return (
                              <button
                                key={pageNumber}
                                onClick={() => setCurrentPage(pageNumber)}
                                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                  currentPage === pageNumber
                                    ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                }`}
                              >
                                {pageNumber}
                              </button>
                            );
                          })}
                          <button
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="sr-only">Next</span>
                            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <p className="text-gray-600 mb-4">No points transactions yet.</p>
                <p className="text-sm text-gray-500">Start ordering to earn points!</p>
              </div>
            )}
          </div>

          {/* Referral Program */}
          {referralInfo && (
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Refer a Friend</h2>
              <div className="bg-gradient-to-r from-green-600 to-teal-700 rounded-xl shadow-xl p-8 text-white">
                <div className="max-w-3xl mx-auto">
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold mb-2">Share the Love, Earn Rewards!</h3>
                    <p className="text-green-100">
                      Invite your friends and you'll both get rewarded when they place their first order.
                    </p>
                  </div>

                  <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-green-100 font-medium">Your Referral Code</span>
                      <button
                        onClick={copyReferralCode}
                        className="bg-white text-green-700 px-4 py-2 rounded-lg font-medium hover:bg-green-50 transition-colors"
                      >
                        {copiedCode ? (
                          <span className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Copied!
                          </span>
                        ) : (
                          'Copy Code'
                        )}
                      </button>
                    </div>
                    <div className="bg-white rounded-lg p-4 text-center">
                      <span className="text-3xl font-bold text-green-700 tracking-wider">
                        {referralInfo.referral_code}
                      </span>
                    </div>
                  </div>

                  <div className="text-center mb-6">
                    <button
                      onClick={shareReferralLink}
                      className="bg-white text-green-700 px-8 py-3 rounded-lg font-medium hover:bg-green-50 transition-all duration-200 hover:shadow-lg"
                    >
                      Share Referral Link
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-3xl font-bold mb-1">{referralInfo.referral_count}</p>
                      <p className="text-green-100 text-sm">Total Referrals</p>
                    </div>
                    <div>
                      <p className="text-3xl font-bold mb-1">{referralInfo.successful_referrals}</p>
                      <p className="text-green-100 text-sm">Successful</p>
                    </div>
                    <div>
                      <p className="text-3xl font-bold mb-1">{referralInfo.total_points_earned}</p>
                      <p className="text-green-100 text-sm">Points Earned</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Links */}
          <div className="text-center">
            <p className="text-gray-600 mb-4">Want to earn more points?</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to="/menu"
                className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition-all duration-200 hover:shadow-lg"
              >
                Order Now
              </Link>
              <Link
                to="/orders"
                className="bg-white text-blue-600 border-2 border-blue-600 px-8 py-3 rounded-lg font-medium hover:bg-blue-50 transition-all duration-200"
              >
                View My Orders
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Redeem Confirmation Modal */}
      {showRedeemModal && selectedReward && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Confirm Redemption</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to redeem <strong>{selectedReward.points_cost.toLocaleString()}</strong> points for{' '}
              <strong>{selectedReward.name}</strong>?
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Your new balance will be:{' '}
              <strong>
                {loyaltyAccount
                  ? (loyaltyAccount.current_points_balance - selectedReward.points_cost).toLocaleString()
                  : '0'}{' '}
                points
              </strong>
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowRedeemModal(false);
                  setSelectedReward(null);
                }}
                className="flex-1 px-6 py-3 rounded-lg font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmRedeem}
                className="flex-1 px-6 py-3 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && redeemedRewardData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Reward Redeemed!</h3>
              <p className="text-gray-600 mb-6">Your reward code is:</p>
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-4">
                <span className="text-3xl font-bold text-blue-700 tracking-wider">
                  {redeemedRewardData.reward_code}
                </span>
              </div>
              <button
                onClick={() => copyRewardCode(redeemedRewardData.reward_code)}
                className="text-blue-600 hover:text-blue-700 font-medium mb-4"
              >
                Copy Code
              </button>
              <p className="text-sm text-gray-500">
                Use this code at checkout to apply your reward.
                {redeemedRewardData.expires_at &&
                  ` Expires on ${formatDate(redeemedRewardData.expires_at)}.`}
              </p>
            </div>
            <button
              onClick={() => {
                setShowSuccessModal(false);
                setRedeemedRewardData(null);
              }}
              className="w-full px-6 py-3 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default UV_LoyaltyDashboard;