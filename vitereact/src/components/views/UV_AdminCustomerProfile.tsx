import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Award, 
  ShoppingBag, 
  TrendingUp, 
  Trash2, 
  Edit, 
  ArrowLeft, 
  Save, 
  X, 
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Gift,
  Users
} from 'lucide-react';

// ===========================
// Type Definitions
// ===========================

interface CustomerProfile {
  user_id: string;
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  profile_photo_url: string | null;
  email_verified: boolean;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  last_login_at: string | null;
  marketing_opt_in: boolean;
  dietary_preferences: string[] | null;
  referral_code: string | null;
}

interface LoyaltyAccount {
  loyalty_account_id: string;
  current_points_balance: number;
  total_points_earned: number;
  total_points_redeemed: number;
  total_points_expired: number;
  referral_count: number;
}

interface OrderHistoryItem {
  order_id: string;
  order_number: string;
  order_type: 'collection' | 'delivery';
  status: string;
  total_amount: number;
  created_at: string;
}

interface PointsTransaction {
  transaction_id: string;
  transaction_type: 'earned' | 'redeemed' | 'expired' | 'manual_adjustment';
  points_amount: number;
  reason: string | null;
  created_at: string;
  running_balance: number;
}

interface CateringInquiry {
  inquiry_id: string;
  inquiry_number: string;
  event_type: string;
  event_date: string;
  guest_count: number;
  status: string;
  submitted_at: string;
}

interface CustomerData {
  user: CustomerProfile;
  loyalty_account: LoyaltyAccount;
  recent_orders: OrderHistoryItem[];
  recent_points_transactions: PointsTransaction[];
  catering_inquiries: CateringInquiry[];
  total_orders: number;
  total_spend: number;
  average_order_value: number;
}

interface UpdateProfilePayload {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

interface AdjustPointsPayload {
  points_amount: number;
  reason: string;
}

interface UpdateStatusPayload {
  status: 'active' | 'suspended';
  reason: string;
}

// ===========================
// Main Component
// ===========================

const UV_AdminCustomerProfile: React.FC = () => {
  const { customer_id } = useParams<{ customer_id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Global state - CRITICAL: Individual selectors
  const auth_token = useAppStore(state => state.authentication_state.auth_token);

  // Local state
  const [edit_mode, set_edit_mode] = useState(false);
  const [edited_profile, set_edited_profile] = useState<Partial<CustomerProfile>>({});
  const [show_points_modal, set_show_points_modal] = useState(false);
  const [points_adjustment_amount, set_points_adjustment_amount] = useState('');
  const [points_adjustment_reason, set_points_adjustment_reason] = useState('');
  const [show_status_modal, set_show_status_modal] = useState(false);
  const [selected_action, set_selected_action] = useState<'suspend' | 'activate' | null>(null);
  const [status_change_reason, set_status_change_reason] = useState('');
  const [show_delete_modal, set_show_delete_modal] = useState(false);
  const [delete_confirmation_text, set_delete_confirmation_text] = useState('');

  // API base URL
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

  // ===========================
  // Data Fetching
  // ===========================

  const { data: customer_data, isLoading, error } = useQuery<CustomerData>({
    queryKey: ['admin', 'customer', customer_id],
    queryFn: async () => {
      const response = await axios.get(
        `${API_BASE_URL}/api/admin/customers/${customer_id}`,
        {
          headers: { Authorization: `Bearer ${auth_token}` }
        }
      );
      // Transform backend response to match frontend expectations
      const data = response.data;
      return {
        user: data.customer || data.user,
        loyalty_account: data.loyalty_account || {
          loyalty_account_id: '',
          current_points_balance: 0,
          total_points_earned: 0,
          total_points_redeemed: 0,
          total_points_expired: 0,
          referral_count: 0,
        },
        recent_orders: data.recent_orders || [],
        recent_points_transactions: data.recent_points_transactions || [],
        catering_inquiries: data.catering_inquiries || [],
        total_orders: data.stats?.total_orders || data.total_orders || 0,
        total_spend: data.stats?.total_spend || data.total_spend || 0,
        average_order_value: data.stats?.average_order_value || data.average_order_value || 0,
      };
    },
    enabled: !!customer_id && !!auth_token,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
  });

  // ===========================
  // Mutations
  // ===========================

  const update_profile_mutation = useMutation({
    mutationFn: async (payload: UpdateProfilePayload) => {
      const response = await axios.put(
        `${API_BASE_URL}/api/admin/customers/${customer_id}`,
        payload,
        {
          headers: { 
            Authorization: `Bearer ${auth_token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['admin', 'customer', customer_id], (old_data: CustomerData | undefined) => 
        old_data ? { ...old_data, user: data } : old_data
      );
      set_edit_mode(false);
      set_edited_profile({});
    },
  });

  const adjust_points_mutation = useMutation({
    mutationFn: async (payload: AdjustPointsPayload) => {
      const response = await axios.post(
        `${API_BASE_URL}/api/admin/customers/${customer_id}/adjust-points`,
        payload,
        {
          headers: { 
            Authorization: `Bearer ${auth_token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['admin', 'customer', customer_id], (old_data: CustomerData | undefined) => 
        old_data ? { ...old_data, loyalty_account: data } : old_data
      );
      set_show_points_modal(false);
      set_points_adjustment_amount('');
      set_points_adjustment_reason('');
      queryClient.invalidateQueries({ queryKey: ['admin', 'customer', customer_id] });
    },
  });

  const update_status_mutation = useMutation({
    mutationFn: async (payload: UpdateStatusPayload) => {
      const response = await axios.put(
        `${API_BASE_URL}/api/admin/customers/${customer_id}/status`,
        payload,
        {
          headers: { 
            Authorization: `Bearer ${auth_token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['admin', 'customer', customer_id], (old_data: CustomerData | undefined) => 
        old_data ? { ...old_data, user: { ...old_data.user, status: data.status } } : old_data
      );
      set_show_status_modal(false);
      set_selected_action(null);
      set_status_change_reason('');
    },
  });

  const delete_account_mutation = useMutation({
    mutationFn: async () => {
      const response = await axios.delete(
        `${API_BASE_URL}/api/admin/customers/${customer_id}`,
        {
          headers: { Authorization: `Bearer ${auth_token}` }
        }
      );
      return response.data;
    },
    onSuccess: () => {
      navigate('/admin/customers');
    },
  });

  // ===========================
  // Event Handlers
  // ===========================

  const handle_edit_toggle = () => {
    if (edit_mode) {
      set_edited_profile({});
    } else if (customer_data?.user) {
      set_edited_profile({
        first_name: customer_data.user.first_name,
        last_name: customer_data.user.last_name,
        email: customer_data.user.email,
        phone: customer_data.user.phone,
      });
    }
    set_edit_mode(!edit_mode);
  };

  const handle_save_profile = () => {
    if (edited_profile.first_name && edited_profile.last_name && edited_profile.email && edited_profile.phone) {
      update_profile_mutation.mutate({
        first_name: edited_profile.first_name,
        last_name: edited_profile.last_name,
        email: edited_profile.email,
        phone: edited_profile.phone,
      });
    }
  };

  const handle_adjust_points = () => {
    const amount = parseInt(points_adjustment_amount);
    if (!isNaN(amount) && points_adjustment_reason.trim()) {
      adjust_points_mutation.mutate({
        points_amount: amount,
        reason: points_adjustment_reason.trim(),
      });
    }
  };

  const handle_status_change = () => {
    if (selected_action && status_change_reason.trim()) {
      update_status_mutation.mutate({
        status: selected_action === 'activate' ? 'active' : 'suspended',
        reason: status_change_reason.trim(),
      });
    }
  };

  const handle_delete_account = () => {
    if (delete_confirmation_text === 'DELETE') {
      delete_account_mutation.mutate();
    }
  };

  const open_status_modal = (action: 'suspend' | 'activate') => {
    set_selected_action(action);
    set_show_status_modal(true);
  };

  // ===========================
  // Helper Functions
  // ===========================

  const format_date = (date_string: string) => {
    return new Date(date_string).toLocaleDateString('en-IE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const format_currency = (amount: number) => {
    return `€${Number(amount).toFixed(2)}`;
  };

  const get_status_badge = (status: string) => {
    const badges = {
      active: 'bg-green-100 text-green-800 border-green-200',
      suspended: 'bg-red-100 text-red-800 border-red-200',
      inactive: 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return badges[status as keyof typeof badges] || badges.inactive;
  };

  const get_order_status_badge = (status: string) => {
    const badges = {
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      received: 'bg-blue-100 text-blue-800',
      preparing: 'bg-yellow-100 text-yellow-800',
      ready: 'bg-purple-100 text-purple-800',
    };
    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800';
  };

  // ===========================
  // Render Loading/Error States
  // ===========================

  if (isLoading) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading customer profile...</p>
          </div>
        </div>
      </>
    );
  }

  if (error || !customer_data) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
            <div className="bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Customer Not Found</h2>
            <p className="text-gray-600 mb-6">
              Unable to load customer profile. The customer may not exist or you may not have permission.
            </p>
            <Link
              to="/admin/customers"
              className="inline-flex items-center px-6 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Customers
            </Link>
          </div>
        </div>
      </>
    );
  }

  const { user, loyalty_account, recent_orders, recent_points_transactions, catering_inquiries, total_orders, total_spend, average_order_value } = customer_data;

  // ===========================
  // Main Render
  // ===========================

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Header */}
          <div className="mb-8">
            <Link
              to="/admin/customers"
              className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Customers
            </Link>
            
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {user.first_name} {user.last_name}
                </h1>
                <p className="mt-1 text-sm text-gray-500">Customer ID: {user.user_id}</p>
              </div>
              
              <div className="mt-4 sm:mt-0 flex items-center space-x-3">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${get_status_badge(user.status)}`}>
                  {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                </span>
                
                {user.status === 'active' && (
                  <button
                    onClick={() => open_status_modal('suspend')}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                  >
                    Suspend Account
                  </button>
                )}
                
                {user.status === 'suspended' && (
                  <button
                    onClick={() => open_status_modal('activate')}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                  >
                    Activate Account
                  </button>
                )}
                
                <button
                  onClick={() => set_show_delete_modal(true)}
                  className="p-2 bg-gray-100 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  title="Delete Account"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Orders</p>
                  <p className="text-3xl font-bold text-gray-900">{total_orders}</p>
                </div>
                <div className="bg-blue-100 rounded-full p-3">
                  <ShoppingBag className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Spend</p>
                  <p className="text-3xl font-bold text-gray-900">{format_currency(total_spend)}</p>
                </div>
                <div className="bg-green-100 rounded-full p-3">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Avg Order Value</p>
                  <p className="text-3xl font-bold text-gray-900">{format_currency(average_order_value)}</p>
                </div>
                <div className="bg-purple-100 rounded-full p-3">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column - Profile & Loyalty */}
            <div className="lg:col-span-1 space-y-6">
              
              {/* Customer Profile Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 px-6 py-4 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">Profile</h2>
                  <button
                    onClick={handle_edit_toggle}
                    className="p-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors"
                  >
                    {edit_mode ? <X className="w-5 h-5 text-white" /> : <Edit className="w-5 h-5 text-white" />}
                  </button>
                </div>

                <div className="p-6">
                  {/* Profile Photo */}
                  <div className="flex justify-center mb-6">
                    <div className="relative">
                      {user.profile_photo_url ? (
                        <img
                          src={user.profile_photo_url}
                          alt={`${user.first_name} ${user.last_name}`}
                          className="w-24 h-24 rounded-full object-cover border-4 border-orange-100"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-orange-100 flex items-center justify-center border-4 border-orange-200">
                          <User className="w-12 h-12 text-orange-600" />
                        </div>
                      )}
                      {user.email_verified && (
                        <div className="absolute bottom-0 right-0 bg-green-500 rounded-full p-1">
                          <CheckCircle className="w-5 h-5 text-white" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Profile Information */}
                  {edit_mode ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                        <input
                          type="text"
                          value={edited_profile.first_name || ''}
                          onChange={(e) => set_edited_profile({ ...edited_profile, first_name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                        <input
                          type="text"
                          value={edited_profile.last_name || ''}
                          onChange={(e) => set_edited_profile({ ...edited_profile, last_name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                          type="email"
                          value={edited_profile.email || ''}
                          onChange={(e) => set_edited_profile({ ...edited_profile, email: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                        <input
                          type="tel"
                          value={edited_profile.phone || ''}
                          onChange={(e) => set_edited_profile({ ...edited_profile, phone: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        />
                      </div>

                      <button
                        onClick={handle_save_profile}
                        disabled={update_profile_mutation.isPending}
                        className="w-full flex items-center justify-center px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors disabled:opacity-50"
                      >
                        {update_profile_mutation.isPending ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-5 h-5 mr-2" />
                            Save Changes
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-start">
                        <Mail className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-600">Email</p>
                          <p className="text-sm font-medium text-gray-900">{user.email}</p>
                        </div>
                      </div>

                      <div className="flex items-start">
                        <Phone className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-600">Phone</p>
                          <p className="text-sm font-medium text-gray-900">{user.phone}</p>
                        </div>
                      </div>

                      <div className="flex items-start">
                        <Calendar className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-600">Member Since</p>
                          <p className="text-sm font-medium text-gray-900">{format_date(user.created_at)}</p>
                        </div>
                      </div>

                      {user.last_login_at && (
                        <div className="flex items-start">
                          <Clock className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                          <div>
                            <p className="text-sm text-gray-600">Last Login</p>
                            <p className="text-sm font-medium text-gray-900">{format_date(user.last_login_at)}</p>
                          </div>
                        </div>
                      )}

                      {user.dietary_preferences && user.dietary_preferences.length > 0 && (
                        <div className="pt-4 border-t border-gray-200">
                          <p className="text-sm text-gray-600 mb-2">Dietary Preferences</p>
                          <div className="flex flex-wrap gap-2">
                            {user.dietary_preferences.map((pref, index) => (
                              <span key={index} className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                                {pref}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Marketing Opt-in</span>
                          <span className={`text-sm font-medium ${user.marketing_opt_in ? 'text-green-600' : 'text-gray-400'}`}>
                            {user.marketing_opt_in ? 'Yes' : 'No'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm text-gray-600">Email Verified</span>
                          <span className={`text-sm font-medium ${user.email_verified ? 'text-green-600' : 'text-red-600'}`}>
                            {user.email_verified ? 'Yes' : 'No'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Loyalty Account Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 px-6 py-4">
                  <h2 className="text-xl font-bold text-white">Loyalty Account</h2>
                </div>

                <div className="p-6">
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-purple-100 rounded-full mb-3">
                      <Award className="w-10 h-10 text-purple-600" />
                    </div>
                    <p className="text-sm text-gray-600 mb-2">Current Points Balance</p>
                    <p className="text-4xl font-bold text-gray-900">{loyalty_account.current_points_balance.toLocaleString()}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-green-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-600 mb-1">Total Earned</p>
                      <p className="text-lg font-bold text-green-600">{loyalty_account.total_points_earned.toLocaleString()}</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-600 mb-1">Total Redeemed</p>
                      <p className="text-lg font-bold text-blue-600">{loyalty_account.total_points_redeemed.toLocaleString()}</p>
                    </div>
                  </div>

                  {user.referral_code && (
                    <div className="mb-6 p-4 bg-purple-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Referral Code</span>
                        <span className="text-sm font-bold text-purple-600">{user.referral_code}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Users className="w-4 h-4 mr-1" />
                        {loyalty_account.referral_count} successful referrals
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => set_show_points_modal(true)}
                    className="w-full flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
                  >
                    <Gift className="w-5 h-5 mr-2" />
                    Adjust Points
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column - Orders & Transactions */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Recent Orders */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">Recent Orders</h2>
                  <Link
                    to={`/admin/orders?customer_id=${user.user_id}`}
                    className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                  >
                    View All →
                  </Link>
                </div>

                <div className="overflow-x-auto">
                  {recent_orders.length > 0 ? (
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {recent_orders.map((order) => (
                          <tr key={order.order_id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Link
                                to={`/admin/orders/${order.order_id}`}
                                className="text-sm font-medium text-orange-600 hover:text-orange-700"
                              >
                                {order.order_number}
                              </Link>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-900 capitalize">{order.order_type}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${get_order_status_badge(order.status)}`}>
                                {order.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {format_currency(order.total_amount)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {format_date(order.created_at)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="px-6 py-12 text-center">
                      <ShoppingBag className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600">No orders yet</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Points Transaction History */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900">Points Transaction History</h2>
                </div>

                <div className="overflow-x-auto">
                  {recent_points_transactions.length > 0 ? (
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {recent_points_transactions.map((transaction) => (
                          <tr key={transaction.transaction_id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-900 capitalize">{transaction.transaction_type.replace('_', ' ')}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`text-sm font-medium ${transaction.points_amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {transaction.points_amount >= 0 ? '+' : ''}{transaction.points_amount}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-gray-600">{transaction.reason || '-'}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {transaction.running_balance}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {format_date(transaction.created_at)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="px-6 py-12 text-center">
                      <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600">No transactions yet</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Catering Inquiries */}
              {catering_inquiries.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">Catering Inquiries</h2>
                  </div>

                  <div className="divide-y divide-gray-200">
                    {catering_inquiries.map((inquiry) => (
                      <Link
                        key={inquiry.inquiry_id}
                        to={`/admin/catering/${inquiry.inquiry_id}`}
                        className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                      >
                        <div>
                          <p className="text-sm font-medium text-orange-600">{inquiry.inquiry_number}</p>
                          <p className="text-sm text-gray-900 capitalize">{inquiry.event_type} - {inquiry.guest_count} guests</p>
                          <p className="text-xs text-gray-500 mt-1">{format_date(inquiry.event_date)}</p>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${get_order_status_badge(inquiry.status)}`}>
                            {inquiry.status}
                          </span>
                          <p className="text-xs text-gray-500 mt-1">{format_date(inquiry.submitted_at)}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Points Adjustment Modal */}
      {show_points_modal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Adjust Loyalty Points</h3>
              <button
                onClick={() => {
                  set_show_points_modal(false);
                  set_points_adjustment_amount('');
                  set_points_adjustment_reason('');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-600 mb-1">Current Balance</p>
                <p className="text-3xl font-bold text-purple-600">{loyalty_account.current_points_balance}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Points Amount <span className="text-gray-500">(use negative for deduction)</span>
                </label>
                <input
                  type="number"
                  value={points_adjustment_amount}
                  onChange={(e) => set_points_adjustment_amount(e.target.value)}
                  placeholder="e.g., 100 or -50"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <select
                  value={points_adjustment_reason}
                  onChange={(e) => set_points_adjustment_reason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 mb-2"
                >
                  <option value="">Select reason...</option>
                  <option value="Compensation for service issue">Compensation for service issue</option>
                  <option value="Correction of system error">Correction of system error</option>
                  <option value="Promotional bonus">Promotional bonus</option>
                  <option value="Manual adjustment by admin">Manual adjustment by admin</option>
                </select>
                {points_adjustment_reason === 'Manual adjustment by admin' && (
                  <input
                    type="text"
                    placeholder="Additional details..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    onChange={(e) => set_points_adjustment_reason(`Manual adjustment: ${e.target.value}`)}
                  />
                )}
              </div>

              {points_adjustment_amount && !isNaN(parseInt(points_adjustment_amount)) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">New balance after adjustment:</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {loyalty_account.current_points_balance + parseInt(points_adjustment_amount)}
                  </p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-gray-50 rounded-b-xl flex justify-end space-x-3">
              <button
                onClick={() => {
                  set_show_points_modal(false);
                  set_points_adjustment_amount('');
                  set_points_adjustment_reason('');
                }}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handle_adjust_points}
                disabled={!points_adjustment_amount || !points_adjustment_reason || adjust_points_mutation.isPending}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {adjust_points_mutation.isPending ? 'Adjusting...' : 'Confirm Adjustment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Change Modal */}
      {show_status_modal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                {selected_action === 'suspend' ? 'Suspend Account' : 'Activate Account'}
              </h3>
              <button
                onClick={() => {
                  set_show_status_modal(false);
                  set_selected_action(null);
                  set_status_change_reason('');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className={`rounded-lg p-4 ${selected_action === 'suspend' ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                <div className="flex items-start">
                  <AlertTriangle className={`w-5 h-5 mt-0.5 mr-3 ${selected_action === 'suspend' ? 'text-red-600' : 'text-green-600'}`} />
                  <div>
                    <p className={`text-sm font-medium ${selected_action === 'suspend' ? 'text-red-900' : 'text-green-900'}`}>
                      {selected_action === 'suspend' 
                        ? 'This will prevent the customer from logging in and placing orders.'
                        : 'This will restore the customer\'s ability to login and place orders.'
                      }
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason (required)</label>
                <textarea
                  value={status_change_reason}
                  onChange={(e) => set_status_change_reason(e.target.value)}
                  placeholder="Enter reason for status change..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 rounded-b-xl flex justify-end space-x-3">
              <button
                onClick={() => {
                  set_show_status_modal(false);
                  set_selected_action(null);
                  set_status_change_reason('');
                }}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handle_status_change}
                disabled={!status_change_reason.trim() || update_status_mutation.isPending}
                className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  selected_action === 'suspend'
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {update_status_mutation.isPending ? 'Processing...' : `Confirm ${selected_action === 'suspend' ? 'Suspend' : 'Activate'}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {show_delete_modal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Delete Customer Account</h3>
              <button
                onClick={() => {
                  set_show_delete_modal(false);
                  set_delete_confirmation_text('');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-900 mb-2">GDPR-Compliant Account Deletion</p>
                    <ul className="text-xs text-red-800 space-y-1 list-disc list-inside">
                      <li>Customer data will be anonymized</li>
                      <li>Order history will be retained for legal compliance</li>
                      <li>Personal identifiable information will be removed</li>
                      <li>This action cannot be undone</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type <span className="font-bold text-red-600">DELETE</span> to confirm
                </label>
                <input
                  type="text"
                  value={delete_confirmation_text}
                  onChange={(e) => set_delete_confirmation_text(e.target.value)}
                  placeholder="DELETE"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 rounded-b-xl flex justify-end space-x-3">
              <button
                onClick={() => {
                  set_show_delete_modal(false);
                  set_delete_confirmation_text('');
                }}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handle_delete_account}
                disabled={delete_confirmation_text !== 'DELETE' || delete_account_mutation.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {delete_account_mutation.isPending ? 'Deleting...' : 'Delete Account Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UV_AdminCustomerProfile;