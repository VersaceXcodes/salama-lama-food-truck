import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { User, Mail, Lock, Bell, Utensils, Trash2, Check, X, Eye, EyeOff, Camera, AlertCircle, Loader2 } from 'lucide-react';

// ===========================
// TypeScript Interfaces
// ===========================

interface ProfileFormData {
  first_name: string;
  last_name: string;
  phone: string;
  dietary_preferences: string[] | null;
  marketing_opt_in: boolean;
  order_notifications_email: boolean;
  order_notifications_sms: boolean;
  marketing_emails: boolean;
  marketing_sms: boolean;
}

interface PasswordFormData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

interface FormErrors {
  [key: string]: string;
}

type ProfileSection = 'personal' | 'notifications' | 'password' | 'account';

interface UserProfile {
  user_id: string;
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  profile_photo_url: string | null;
  email_verified: boolean;
  marketing_opt_in: boolean;
  order_notifications_email: boolean;
  order_notifications_sms: boolean;
  marketing_emails: boolean;
  marketing_sms: boolean;
  dietary_preferences: string[] | null;
}

// ===========================
// API Functions
// ===========================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const fetchUserProfile = async (token: string): Promise<UserProfile> => {
  const response = await axios.get(`${API_BASE_URL}/api/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

const updateUserProfile = async (data: Partial<ProfileFormData>, token: string): Promise<UserProfile> => {
  const response = await axios.put(`${API_BASE_URL}/api/profile`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

const changePassword = async (data: { current_password: string; new_password: string }, token: string): Promise<void> => {
  const response = await axios.put(`${API_BASE_URL}/api/profile/password`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

const deleteAccount = async (password: string, token: string): Promise<void> => {
  const response = await axios.delete(`${API_BASE_URL}/api/profile`, {
    data: { password },
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

const resendEmailVerification = async (token: string): Promise<void> => {
  const response = await axios.post(`${API_BASE_URL}/api/auth/resend-verification`, {}, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

// ===========================
// Main Component
// ===========================

const UV_CustomerProfile: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // Zustand Store - Individual selectors (CRITICAL: no object destructuring)
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const updateAuthUser = useAppStore(state => state.update_auth_user);
  const logoutUser = useAppStore(state => state.logout_user);

  // Local State
  const [activeSection, setActiveSection] = useState<ProfileSection>(
    (searchParams.get('section') as ProfileSection) || 'personal'
  );
  const [profileFormData, setProfileFormData] = useState<ProfileFormData>({
    first_name: '',
    last_name: '',
    phone: '',
    dietary_preferences: null,
    marketing_opt_in: false,
    order_notifications_email: true,
    order_notifications_sms: false,
    marketing_emails: false,
    marketing_sms: false,
  });
  const [passwordFormData, setPasswordFormData] = useState<PasswordFormData>({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');

  // Available dietary preferences
  const dietaryOptions = ['vegan', 'vegetarian', 'gluten-free', 'halal', 'dairy-free', 'nut-free'];

  // React Query - Fetch Profile
  const { data: profileData, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: () => fetchUserProfile(authToken || ''),
    enabled: !!authToken,
    staleTime: 60000,
  });

  // React Query - Update Profile Mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data: Partial<ProfileFormData>) => updateUserProfile(data, authToken || ''),
    onSuccess: (data) => {
      updateAuthUser(data);
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (error: any) => {
      setFormErrors({ submit: error.response?.data?.message || 'Failed to update profile' });
    },
  });

  // React Query - Change Password Mutation
  const changePasswordMutation = useMutation({
    mutationFn: (data: { current_password: string; new_password: string }) => changePassword(data, authToken || ''),
    onSuccess: () => {
      setPasswordFormData({ current_password: '', new_password: '', confirm_password: '' });
      setSuccessMessage('Password changed successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (error: any) => {
      setFormErrors({ submit: error.response?.data?.message || 'Failed to change password' });
    },
  });

  // React Query - Delete Account Mutation
  const deleteAccountMutation = useMutation({
    mutationFn: (password: string) => deleteAccount(password, authToken || ''),
    onSuccess: () => {
      logoutUser();
      navigate('/');
    },
    onError: (error: any) => {
      setFormErrors({ submit: error.response?.data?.message || 'Failed to delete account' });
    },
  });

  // React Query - Resend Verification Mutation
  const resendVerificationMutation = useMutation({
    mutationFn: () => resendEmailVerification(authToken || ''),
    onSuccess: () => {
      setSuccessMessage('Verification email sent! Check your inbox.');
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (error: any) => {
      setFormErrors({ submit: error.response?.data?.message || 'Failed to send verification email' });
    },
  });

  // Effect: Initialize form with profile data
  useEffect(() => {
    if (profileData) {
      setProfileFormData({
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        phone: profileData.phone,
        dietary_preferences: profileData.dietary_preferences,
        marketing_opt_in: profileData.marketing_opt_in,
        order_notifications_email: profileData.order_notifications_email,
        order_notifications_sms: profileData.order_notifications_sms,
        marketing_emails: profileData.marketing_emails,
        marketing_sms: profileData.marketing_sms,
      });
    }
  }, [profileData]);

  // Effect: Update URL when section changes
  useEffect(() => {
    setSearchParams({ section: activeSection });
  }, [activeSection, setSearchParams]);

  // Effect: Clear errors when switching sections
  useEffect(() => {
    setFormErrors({});
    setSuccessMessage(null);
  }, [activeSection]);

  // Handlers
  const handleProfileInputChange = (field: keyof ProfileFormData, value: any) => {
    setProfileFormData(prev => ({ ...prev, [field]: value }));
    setFormErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handlePasswordInputChange = (field: keyof PasswordFormData, value: string) => {
    setPasswordFormData(prev => ({ ...prev, [field]: value }));
    setFormErrors(prev => ({ ...prev, [field]: '' }));
  };

  const toggleDietaryPreference = (preference: string) => {
    setProfileFormData(prev => {
      const current = prev.dietary_preferences || [];
      const updated = current.includes(preference)
        ? current.filter(p => p !== preference)
        : [...current, preference];
      return { ...prev, dietary_preferences: updated.length > 0 ? updated : null };
    });
  };

  const validateProfileForm = (): boolean => {
    const errors: FormErrors = {};
    
    if (!profileFormData.first_name.trim()) {
      errors.first_name = 'First name is required';
    }
    if (!profileFormData.last_name.trim()) {
      errors.last_name = 'Last name is required';
    }
    if (!profileFormData.phone.trim()) {
      errors.phone = 'Phone number is required';
    } else if (!/^[\d\s+\-()]+$/.test(profileFormData.phone)) {
      errors.phone = 'Invalid phone number format';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validatePasswordForm = (): boolean => {
    const errors: FormErrors = {};
    
    if (!passwordFormData.current_password) {
      errors.current_password = 'Current password is required';
    }
    if (!passwordFormData.new_password) {
      errors.new_password = 'New password is required';
    } else if (passwordFormData.new_password.length < 8) {
      errors.new_password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(passwordFormData.new_password)) {
      errors.new_password = 'Password must contain at least one letter and one number';
    }
    if (passwordFormData.new_password !== passwordFormData.confirm_password) {
      errors.confirm_password = 'Passwords do not match';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    
    if (!validateProfileForm()) return;
    
    updateProfileMutation.mutate(profileFormData);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    
    if (!validatePasswordForm()) return;
    
    changePasswordMutation.mutate({
      current_password: passwordFormData.current_password,
      new_password: passwordFormData.new_password,
    });
  };

  const handleDeleteAccount = () => {
    if (!deletePassword) {
      setFormErrors({ submit: 'Please enter your password to confirm deletion' });
      return;
    }
    
    deleteAccountMutation.mutate(deletePassword);
  };

  const getPasswordStrength = (password: string): { strength: string; color: string; width: string } => {
    if (password.length === 0) return { strength: '', color: 'bg-gray-200', width: 'w-0' };
    if (password.length < 8) return { strength: 'Weak', color: 'bg-red-500', width: 'w-1/3' };
    if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(password)) return { strength: 'Medium', color: 'bg-yellow-500', width: 'w-2/3' };
    return { strength: 'Strong', color: 'bg-green-500', width: 'w-full' };
  };

  const passwordStrength = getPasswordStrength(passwordFormData.new_password);

  // Redirect if not authenticated
  if (!currentUser || !authToken) {
    navigate('/login');
    return null;
  }

  if (isLoadingProfile) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-orange-600 mx-auto" />
            <p className="mt-4 text-gray-600">Loading profile...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
            <p className="mt-2 text-gray-600">Manage your account settings and preferences</p>
          </div>

          {/* Email Verification Banner */}
          {profileData && !profileData.email_verified && (
            <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="ml-3 flex-1">
                  <h3 className="text-sm font-medium text-yellow-800">Email not verified</h3>
                  <p className="mt-1 text-sm text-yellow-700">
                    Please verify your email address to access all features.
                  </p>
                  <button
                    onClick={() => resendVerificationMutation.mutate()}
                    disabled={resendVerificationMutation.isPending}
                    className="mt-2 text-sm font-medium text-yellow-800 hover:text-yellow-900 underline disabled:opacity-50"
                  >
                    {resendVerificationMutation.isPending ? 'Sending...' : 'Resend verification email'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 bg-green-50 border-l-4 border-green-400 p-4 rounded-lg">
              <div className="flex items-center">
                <Check className="w-5 h-5 text-green-600" />
                <p className="ml-3 text-sm font-medium text-green-800">{successMessage}</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {formErrors.submit && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
              <div className="flex items-center">
                <X className="w-5 h-5 text-red-600" />
                <p className="ml-3 text-sm font-medium text-red-800">{formErrors.submit}</p>
              </div>
            </div>
          )}

          <div className="lg:grid lg:grid-cols-12 lg:gap-8">
            {/* Section Navigation */}
            <aside className="lg:col-span-3">
              <nav className="space-y-1 bg-white rounded-lg shadow p-2 sticky top-4">
                <button
                  onClick={() => setActiveSection('personal')}
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    activeSection === 'personal'
                      ? 'bg-orange-50 text-orange-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <User className="w-5 h-5 mr-3" />
                  Personal Information
                </button>
                <button
                  onClick={() => setActiveSection('notifications')}
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    activeSection === 'notifications'
                      ? 'bg-orange-50 text-orange-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Bell className="w-5 h-5 mr-3" />
                  Notifications
                </button>
                <button
                  onClick={() => setActiveSection('password')}
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    activeSection === 'password'
                      ? 'bg-orange-50 text-orange-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Lock className="w-5 h-5 mr-3" />
                  Password & Security
                </button>
                <button
                  onClick={() => setActiveSection('account')}
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    activeSection === 'account'
                      ? 'bg-orange-50 text-orange-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Utensils className="w-5 h-5 mr-3" />
                  Dietary Preferences
                </button>
              </nav>
            </aside>

            {/* Main Content */}
            <main className="mt-8 lg:mt-0 lg:col-span-9">
              <div className="bg-white rounded-lg shadow">
                {/* Personal Information Section */}
                {activeSection === 'personal' && (
                  <div className="p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">Personal Information</h2>
                    
                    {/* Profile Photo */}
                    <div className="mb-8 pb-8 border-b border-gray-200">
                      <label className="block text-sm font-medium text-gray-700 mb-3">Profile Photo</label>
                      <div className="flex items-center space-x-6">
                        <div className="relative">
                          {profileData?.profile_photo_url ? (
                            <img
                              src={profileData.profile_photo_url}
                              alt="Profile"
                              className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
                            />
                          ) : (
                            <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center border-4 border-gray-300">
                              <User className="w-12 h-12 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div>
                          <button
                            disabled
                            className="px-4 py-2 bg-gray-100 text-gray-400 text-sm font-medium rounded-lg cursor-not-allowed flex items-center"
                          >
                            <Camera className="w-4 h-4 mr-2" />
                            Upload Photo (Coming Soon)
                          </button>
                          <p className="mt-2 text-xs text-gray-500">JPG, PNG or GIF. Max 5MB.</p>
                        </div>
                      </div>
                    </div>

                    <form onSubmit={handleSaveProfile}>
                      <div className="space-y-6">
                        {/* Email Display (read-only) */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            <Mail className="w-4 h-4 inline mr-2" />
                            Email Address
                          </label>
                          <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
                            <p className="text-sm text-gray-900">{profileData?.email}</p>
                            <p className="mt-1 text-xs text-gray-500">
                              Email changes require verification. Contact support to update.
                            </p>
                          </div>
                        </div>

                        {/* First Name */}
                        <div>
                          <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-2">
                            First Name *
                          </label>
                          <input
                            id="first_name"
                            type="text"
                            value={profileFormData.first_name}
                            onChange={(e) => handleProfileInputChange('first_name', e.target.value)}
                            className={`w-full px-4 py-3 rounded-lg border ${
                              formErrors.first_name ? 'border-red-300' : 'border-gray-300'
                            } focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors`}
                            placeholder="John"
                          />
                          {formErrors.first_name && (
                            <p className="mt-1 text-sm text-red-600">{formErrors.first_name}</p>
                          )}
                        </div>

                        {/* Last Name */}
                        <div>
                          <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-2">
                            Last Name *
                          </label>
                          <input
                            id="last_name"
                            type="text"
                            value={profileFormData.last_name}
                            onChange={(e) => handleProfileInputChange('last_name', e.target.value)}
                            className={`w-full px-4 py-3 rounded-lg border ${
                              formErrors.last_name ? 'border-red-300' : 'border-gray-300'
                            } focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors`}
                            placeholder="Doe"
                          />
                          {formErrors.last_name && (
                            <p className="mt-1 text-sm text-red-600">{formErrors.last_name}</p>
                          )}
                        </div>

                        {/* Phone */}
                        <div>
                          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                            Phone Number *
                          </label>
                          <input
                            id="phone"
                            type="tel"
                            value={profileFormData.phone}
                            onChange={(e) => handleProfileInputChange('phone', e.target.value)}
                            className={`w-full px-4 py-3 rounded-lg border ${
                              formErrors.phone ? 'border-red-300' : 'border-gray-300'
                            } focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors`}
                            placeholder="+353 1 234 5678"
                          />
                          {formErrors.phone && (
                            <p className="mt-1 text-sm text-red-600">{formErrors.phone}</p>
                          )}
                        </div>

                        {/* Save Button */}
                        <div className="pt-4 border-t border-gray-200">
                          <button
                            type="submit"
                            disabled={updateProfileMutation.isPending}
                            className="w-full sm:w-auto px-6 py-3 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                          >
                            {updateProfileMutation.isPending ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Check className="w-4 h-4 mr-2" />
                                Save Changes
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                )}

                {/* Notifications Section */}
                {activeSection === 'notifications' && (
                  <div className="p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">Notification Preferences</h2>
                    
                    <form onSubmit={handleSaveProfile}>
                      <div className="space-y-6">
                        {/* Order Notifications */}
                        <div className="pb-6 border-b border-gray-200">
                          <h3 className="text-lg font-medium text-gray-900 mb-4">Order Updates</h3>
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-900">Email Notifications</p>
                                <p className="text-sm text-gray-500">Receive order status updates via email</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleProfileInputChange('order_notifications_email', !profileFormData.order_notifications_email)}
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                                  profileFormData.order_notifications_email ? 'bg-orange-600' : 'bg-gray-200'
                                }`}
                              >
                                <span
                                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                    profileFormData.order_notifications_email ? 'translate-x-5' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                            </div>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-900">SMS Notifications</p>
                                <p className="text-sm text-gray-500">Receive order status updates via SMS</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleProfileInputChange('order_notifications_sms', !profileFormData.order_notifications_sms)}
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                                  profileFormData.order_notifications_sms ? 'bg-orange-600' : 'bg-gray-200'
                                }`}
                              >
                                <span
                                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                    profileFormData.order_notifications_sms ? 'translate-x-5' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Marketing Communications */}
                        <div>
                          <h3 className="text-lg font-medium text-gray-900 mb-4">Marketing & Promotions</h3>
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-900">Marketing Emails</p>
                                <p className="text-sm text-gray-500">Receive promotional offers and updates</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleProfileInputChange('marketing_emails', !profileFormData.marketing_emails)}
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                                  profileFormData.marketing_emails ? 'bg-orange-600' : 'bg-gray-200'
                                }`}
                              >
                                <span
                                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                    profileFormData.marketing_emails ? 'translate-x-5' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                            </div>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-900">Marketing SMS</p>
                                <p className="text-sm text-gray-500">Receive special offers via SMS</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleProfileInputChange('marketing_sms', !profileFormData.marketing_sms)}
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                                  profileFormData.marketing_sms ? 'bg-orange-600' : 'bg-gray-200'
                                }`}
                              >
                                <span
                                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                    profileFormData.marketing_sms ? 'translate-x-5' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                            </div>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-900">General Marketing</p>
                                <p className="text-sm text-gray-500">Opt in to all marketing communications</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleProfileInputChange('marketing_opt_in', !profileFormData.marketing_opt_in)}
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                                  profileFormData.marketing_opt_in ? 'bg-orange-600' : 'bg-gray-200'
                                }`}
                              >
                                <span
                                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                    profileFormData.marketing_opt_in ? 'translate-x-5' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Save Button */}
                        <div className="pt-4 border-t border-gray-200">
                          <button
                            type="submit"
                            disabled={updateProfileMutation.isPending}
                            className="w-full sm:w-auto px-6 py-3 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                          >
                            {updateProfileMutation.isPending ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Check className="w-4 h-4 mr-2" />
                                Save Preferences
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                )}

                {/* Password Section */}
                {activeSection === 'password' && (
                  <div className="p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">Password & Security</h2>
                    
                    <form onSubmit={handleChangePassword}>
                      <div className="space-y-6">
                        {/* Current Password */}
                        <div>
                          <label htmlFor="current_password" className="block text-sm font-medium text-gray-700 mb-2">
                            Current Password *
                          </label>
                          <div className="relative">
                            <input
                              id="current_password"
                              type={showCurrentPassword ? 'text' : 'password'}
                              value={passwordFormData.current_password}
                              onChange={(e) => handlePasswordInputChange('current_password', e.target.value)}
                              className={`w-full px-4 py-3 pr-12 rounded-lg border ${
                                formErrors.current_password ? 'border-red-300' : 'border-gray-300'
                              } focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors`}
                              placeholder="Enter current password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                          {formErrors.current_password && (
                            <p className="mt-1 text-sm text-red-600">{formErrors.current_password}</p>
                          )}
                        </div>

                        {/* New Password */}
                        <div>
                          <label htmlFor="new_password" className="block text-sm font-medium text-gray-700 mb-2">
                            New Password *
                          </label>
                          <div className="relative">
                            <input
                              id="new_password"
                              type={showNewPassword ? 'text' : 'password'}
                              value={passwordFormData.new_password}
                              onChange={(e) => handlePasswordInputChange('new_password', e.target.value)}
                              className={`w-full px-4 py-3 pr-12 rounded-lg border ${
                                formErrors.new_password ? 'border-red-300' : 'border-gray-300'
                              } focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors`}
                              placeholder="Enter new password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                          {formErrors.new_password && (
                            <p className="mt-1 text-sm text-red-600">{formErrors.new_password}</p>
                          )}
                          {/* Password Strength Indicator */}
                          {passwordFormData.new_password && (
                            <div className="mt-2">
                              <div className="flex items-center">
                                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full ${passwordStrength.color} transition-all duration-300 ${passwordStrength.width}`}
                                  />
                                </div>
                                {passwordStrength.strength && (
                                  <span className="ml-3 text-xs font-medium text-gray-600">{passwordStrength.strength}</span>
                                )}
                              </div>
                              <p className="mt-1 text-xs text-gray-500">
                                Use at least 8 characters with letters and numbers
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Confirm Password */}
                        <div>
                          <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700 mb-2">
                            Confirm New Password *
                          </label>
                          <div className="relative">
                            <input
                              id="confirm_password"
                              type={showConfirmPassword ? 'text' : 'password'}
                              value={passwordFormData.confirm_password}
                              onChange={(e) => handlePasswordInputChange('confirm_password', e.target.value)}
                              className={`w-full px-4 py-3 pr-12 rounded-lg border ${
                                formErrors.confirm_password ? 'border-red-300' : 'border-gray-300'
                              } focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors`}
                              placeholder="Re-enter new password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                          {formErrors.confirm_password && (
                            <p className="mt-1 text-sm text-red-600">{formErrors.confirm_password}</p>
                          )}
                        </div>

                        {/* Change Password Button */}
                        <div className="pt-4 border-t border-gray-200">
                          <button
                            type="submit"
                            disabled={changePasswordMutation.isPending}
                            className="w-full sm:w-auto px-6 py-3 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                          >
                            {changePasswordMutation.isPending ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Changing Password...
                              </>
                            ) : (
                              <>
                                <Lock className="w-4 h-4 mr-2" />
                                Change Password
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                )}

                {/* Account Section (Dietary Preferences & Delete Account) */}
                {activeSection === 'account' && (
                  <div className="p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">Dietary Preferences & Account</h2>
                    
                    {/* Dietary Preferences */}
                    <div className="mb-8 pb-8 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Dietary Preferences</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Select your dietary requirements to see personalized menu recommendations
                      </p>
                      <div className="flex flex-wrap gap-3">
                        {dietaryOptions.map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => toggleDietaryPreference(option)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                              (profileFormData.dietary_preferences || []).includes(option)
                                ? 'bg-orange-100 text-orange-700 border-2 border-orange-600'
                                : 'bg-gray-100 text-gray-700 border-2 border-gray-300 hover:bg-gray-200'
                            }`}
                          >
                            {option.charAt(0).toUpperCase() + option.slice(1).replace('-', ' ')}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={handleSaveProfile}
                        disabled={updateProfileMutation.isPending}
                        className="mt-4 w-full sm:w-auto px-6 py-3 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                      >
                        {updateProfileMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4 mr-2" />
                            Save Preferences
                          </>
                        )}
                      </button>
                    </div>

                    {/* Account Information */}
                    <div className="mb-8 pb-8 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Account Information</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Account Created</span>
                          <span className="text-sm font-medium text-gray-900">
                            {currentUser?.created_at ? new Date(currentUser.created_at).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Account Status</span>
                          <span className="text-sm font-medium text-green-600">Active</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Email Verified</span>
                          <span className={`text-sm font-medium ${profileData?.email_verified ? 'text-green-600' : 'text-yellow-600'}`}>
                            {profileData?.email_verified ? 'Yes' : 'No'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Delete Account */}
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                      <h3 className="text-lg font-medium text-red-900 mb-2 flex items-center">
                        <Trash2 className="w-5 h-5 mr-2" />
                        Delete Account
                      </h3>
                      <p className="text-sm text-red-700 mb-4">
                        Permanently delete your account and all associated data. This action cannot be undone.
                      </p>
                      <p className="text-sm text-red-700 mb-4">
                        Your order history will be anonymized but retained for legal and accounting purposes in compliance with GDPR.
                      </p>
                      <button
                        onClick={() => setShowDeleteModal(true)}
                        className="px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors flex items-center"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete My Account
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </main>
          </div>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={() => setShowDeleteModal(false)}
            />

            {/* Modal panel */}
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-6 pt-6 pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <Trash2 className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Delete Account
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Are you absolutely sure you want to delete your account? This action is permanent and cannot be undone.
                      </p>
                      <p className="mt-2 text-sm text-gray-500">
                        All your personal data will be deleted, and your order history will be anonymized.
                      </p>
                      
                      <div className="mt-4">
                        <label htmlFor="delete_password" className="block text-sm font-medium text-gray-700 mb-2">
                          Enter your password to confirm
                        </label>
                        <input
                          id="delete_password"
                          type="password"
                          value={deletePassword}
                          onChange={(e) => {
                            setDeletePassword(e.target.value);
                            setFormErrors({});
                          }}
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          placeholder="Enter password"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-4 sm:flex sm:flex-row-reverse gap-3">
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteAccountMutation.isPending || !deletePassword}
                  className="w-full sm:w-auto px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                  {deleteAccountMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Yes, Delete My Account'
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeletePassword('');
                    setFormErrors({});
                  }}
                  disabled={deleteAccountMutation.isPending}
                  className="mt-3 sm:mt-0 w-full sm:w-auto px-6 py-3 bg-white text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UV_CustomerProfile;