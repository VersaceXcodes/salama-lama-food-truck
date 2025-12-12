import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/store/main';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { User, Bell, Lock, Clock, CheckCircle, AlertCircle, Loader } from 'lucide-react';

// ===========================
// Type Definitions
// ===========================

interface StaffProfile {
  user_id: string;
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  role: string;
  staff_permissions: {
    audio_notifications?: boolean;
    new_order_alerts?: boolean;
    low_stock_alerts?: boolean;
    mute_duration_minutes?: number;
  } | null;
}

interface NotificationPreferences {
  audio_notifications: boolean;
  new_order_alerts: boolean;
  low_stock_alerts: boolean;
  mute_duration_minutes: number;
}

interface PasswordChangeForm {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

interface UpdateProfilePayload {
  first_name?: string;
  last_name?: string;
  phone?: string;
  staff_permissions?: NotificationPreferences;
}

interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
}

interface ValidationErrors {
  [key: string]: string;
}

// ===========================
// API Functions
// ===========================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const fetchStaffProfile = async (token: string): Promise<StaffProfile> => {
  const response = await axios.get(`${API_BASE_URL}/api/staff/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

const updateStaffProfile = async (payload: { token: string; data: UpdateProfilePayload }): Promise<StaffProfile> => {
  const response = await axios.put(
    `${API_BASE_URL}/api/staff/profile`,
    payload.data,
    { headers: { Authorization: `Bearer ${payload.token}` } }
  );
  return response.data;
};

const changePassword = async (payload: { token: string; data: ChangePasswordPayload }): Promise<void> => {
  await axios.put(
    `${API_BASE_URL}/api/profile/password`,
    payload.data,
    { headers: { Authorization: `Bearer ${payload.token}` } }
  );
};

// ===========================
// Main Component
// ===========================

const UV_StaffProfile: React.FC = () => {
  // ===========================
  // Global State (Individual Selectors)
  // ===========================
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  // const currentUser = useAppStore(state => state.authentication_state.current_user);

  // ===========================
  // Local State
  // ===========================
  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
  });

  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>({
    audio_notifications: true,
    new_order_alerts: true,
    low_stock_alerts: true,
    mute_duration_minutes: 0,
  });

  const [passwordForm, setPasswordForm] = useState<PasswordChangeForm>({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong'>('weak');

  // ===========================
  // React Query Setup
  // ===========================
  const queryClient = useQueryClient();

  const { data: staffProfile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['staff-profile'],
    queryFn: () => fetchStaffProfile(authToken!),
    enabled: !!authToken,
    staleTime: 5 * 60 * 1000,
  });

  const updateProfileMutation = useMutation({
    mutationFn: updateStaffProfile,
    onSuccess: (data) => {
      queryClient.setQueryData(['staff-profile'], data);
      setSuccessMessage('Profile updated successfully!');
      setValidationErrors({});
      setTimeout(() => setSuccessMessage(null), 5000);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Failed to update profile';
      setValidationErrors({ general: errorMessage });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      setShowPasswordSection(false);
      setSuccessMessage('Password changed successfully!');
      setValidationErrors({});
      setTimeout(() => setSuccessMessage(null), 5000);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Failed to change password';
      setValidationErrors({ password: errorMessage });
    },
  });

  // ===========================
  // Effects
  // ===========================

  // Initialize form from fetched profile
  useEffect(() => {
    if (staffProfile) {
      setProfileForm({
        first_name: staffProfile.first_name,
        last_name: staffProfile.last_name,
        phone: staffProfile.phone,
      });

      if (staffProfile.staff_permissions) {
        setNotificationPreferences({
          audio_notifications: staffProfile.staff_permissions.audio_notifications ?? true,
          new_order_alerts: staffProfile.staff_permissions.new_order_alerts ?? true,
          low_stock_alerts: staffProfile.staff_permissions.low_stock_alerts ?? true,
          mute_duration_minutes: staffProfile.staff_permissions.mute_duration_minutes ?? 0,
        });
      }
    }
  }, [staffProfile]);

  // Clear success message when user starts typing
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Calculate password strength
  useEffect(() => {
    const password = passwordForm.new_password;
    if (password.length === 0) {
      setPasswordStrength('weak');
      return;
    }

    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    if (strength <= 1) setPasswordStrength('weak');
    else if (strength <= 3) setPasswordStrength('medium');
    else setPasswordStrength('strong');
  }, [passwordForm.new_password]);

  // ===========================
  // Validation Functions
  // ===========================

  const validateProfileForm = (): boolean => {
    const errors: ValidationErrors = {};

    if (!profileForm.first_name.trim()) {
      errors.first_name = 'First name is required';
    }

    if (!profileForm.last_name.trim()) {
      errors.last_name = 'Last name is required';
    }

    if (!profileForm.phone.trim()) {
      errors.phone = 'Phone number is required';
    } else if (profileForm.phone.trim().length < 10) {
      errors.phone = 'Phone number must be at least 10 characters';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validatePasswordForm = (): boolean => {
    const errors: ValidationErrors = {};

    if (!passwordForm.current_password) {
      errors.current_password = 'Current password is required';
    }

    if (!passwordForm.new_password) {
      errors.new_password = 'New password is required';
    } else if (passwordForm.new_password.length < 8) {
      errors.new_password = 'Password must be at least 8 characters';
    } else if (!/[a-zA-Z]/.test(passwordForm.new_password) || !/\d/.test(passwordForm.new_password)) {
      errors.new_password = 'Password must include letters and numbers';
    }

    if (!passwordForm.confirm_password) {
      errors.confirm_password = 'Please confirm your password';
    } else if (passwordForm.new_password !== passwordForm.confirm_password) {
      errors.confirm_password = 'Passwords do not match';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ===========================
  // Event Handlers
  // ===========================

  const handleProfileInputChange = (field: keyof typeof profileForm, value: string) => {
    setProfileForm(prev => ({ ...prev, [field]: value }));
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  };

  const handlePasswordInputChange = (field: keyof PasswordChangeForm, value: string) => {
    setPasswordForm(prev => ({ ...prev, [field]: value }));
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      delete newErrors.password;
      return newErrors;
    });
  };

  const handleNotificationToggle = (field: keyof NotificationPreferences) => {
    setNotificationPreferences(prev => ({
      ...prev,
      [field]: typeof prev[field] === 'boolean' ? !prev[field] : prev[field],
    }));
  };

  const handleMuteDurationChange = (minutes: number) => {
    setNotificationPreferences(prev => ({
      ...prev,
      mute_duration_minutes: minutes,
    }));
  };

  const handleSaveProfile = () => {
    if (!validateProfileForm()) return;

    updateProfileMutation.mutate({
      token: authToken!,
      data: {
        first_name: profileForm.first_name,
        last_name: profileForm.last_name,
        phone: profileForm.phone,
      },
    });
  };

  const handleSaveNotifications = () => {
    updateProfileMutation.mutate({
      token: authToken!,
      data: {
        staff_permissions: notificationPreferences,
      },
    });
  };

  const handleChangePassword = () => {
    if (!validatePasswordForm()) return;

    changePasswordMutation.mutate({
      token: authToken!,
      data: {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      },
    });
  };

  // ===========================
  // Render Loading State
  // ===========================

  if (isLoadingProfile) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="text-center">
            <Loader className="w-12 h-12 text-orange-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600 font-medium">Loading profile...</p>
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
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Staff Profile</h1>
            <p className="text-gray-600">Manage your account settings and preferences</p>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-green-800 font-medium">{successMessage}</p>
              </div>
            </div>
          )}

          {/* General Error Message */}
          {validationErrors.general && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-red-800 font-medium">{validationErrors.general}</p>
              </div>
            </div>
          )}

          {/* Profile Information Section */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden mb-6">
            <div className="bg-gradient-to-r from-orange-600 to-orange-700 px-6 py-4">
              <div className="flex items-center">
                <User className="w-6 h-6 text-white mr-3" />
                <h2 className="text-xl font-semibold text-white">Profile Information</h2>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* First Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={profileForm.first_name}
                    onChange={(e) => handleProfileInputChange('first_name', e.target.value)}
                    className={`w-full px-4 py-3 rounded-lg border-2 ${
                      validationErrors.first_name ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-orange-500'
                    } focus:ring-4 focus:ring-orange-100 transition-all outline-none`}
                    placeholder="Enter your first name"
                  />
                  {validationErrors.first_name && (
                    <p className="mt-2 text-sm text-red-600">{validationErrors.first_name}</p>
                  )}
                </div>

                {/* Last Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={profileForm.last_name}
                    onChange={(e) => handleProfileInputChange('last_name', e.target.value)}
                    className={`w-full px-4 py-3 rounded-lg border-2 ${
                      validationErrors.last_name ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-orange-500'
                    } focus:ring-4 focus:ring-orange-100 transition-all outline-none`}
                    placeholder="Enter your last name"
                  />
                  {validationErrors.last_name && (
                    <p className="mt-2 text-sm text-red-600">{validationErrors.last_name}</p>
                  )}
                </div>

                {/* Email (Read-only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={staffProfile?.email || ''}
                    disabled
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) => handleProfileInputChange('phone', e.target.value)}
                    className={`w-full px-4 py-3 rounded-lg border-2 ${
                      validationErrors.phone ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-orange-500'
                    } focus:ring-4 focus:ring-orange-100 transition-all outline-none`}
                    placeholder="Enter your phone number"
                  />
                  {validationErrors.phone && (
                    <p className="mt-2 text-sm text-red-600">{validationErrors.phone}</p>
                  )}
                </div>

                {/* Role (Read-only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role
                  </label>
                  <input
                    type="text"
                    value={staffProfile?.role || ''}
                    disabled
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed capitalize"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSaveProfile}
                  disabled={updateProfileMutation.isPending}
                  className="px-6 py-3 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-4 focus:ring-orange-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {updateProfileMutation.isPending ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    'Save Profile'
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Password Section */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden mb-6">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Lock className="w-6 h-6 text-white mr-3" />
                  <h2 className="text-xl font-semibold text-white">Password</h2>
                </div>
                {!showPasswordSection && (
                  <button
                    onClick={() => setShowPasswordSection(true)}
                    className="text-white hover:text-blue-100 text-sm font-medium transition-colors"
                  >
                    Change Password
                  </button>
                )}
              </div>
            </div>

            {showPasswordSection ? (
              <div className="p-6">
                {validationErrors.password && (
                  <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
                    <p className="text-sm text-red-800">{validationErrors.password}</p>
                  </div>
                )}

                <div className="space-y-4 mb-6">
                  {/* Current Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={passwordForm.current_password}
                      onChange={(e) => handlePasswordInputChange('current_password', e.target.value)}
                      className={`w-full px-4 py-3 rounded-lg border-2 ${
                        validationErrors.current_password ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
                      } focus:ring-4 focus:ring-blue-100 transition-all outline-none`}
                      placeholder="Enter current password"
                    />
                    {validationErrors.current_password && (
                      <p className="mt-2 text-sm text-red-600">{validationErrors.current_password}</p>
                    )}
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={passwordForm.new_password}
                      onChange={(e) => handlePasswordInputChange('new_password', e.target.value)}
                      className={`w-full px-4 py-3 rounded-lg border-2 ${
                        validationErrors.new_password ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
                      } focus:ring-4 focus:ring-blue-100 transition-all outline-none`}
                      placeholder="Enter new password"
                    />
                    {validationErrors.new_password && (
                      <p className="mt-2 text-sm text-red-600">{validationErrors.new_password}</p>
                    )}
                    
                    {/* Password Strength Indicator */}
                    {passwordForm.new_password && (
                      <div className="mt-2">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${
                                passwordStrength === 'weak' ? 'w-1/3 bg-red-500' :
                                passwordStrength === 'medium' ? 'w-2/3 bg-yellow-500' :
                                'w-full bg-green-500'
                              }`}
                            />
                          </div>
                          <span className={`text-xs font-medium ${
                            passwordStrength === 'weak' ? 'text-red-600' :
                            passwordStrength === 'medium' ? 'text-yellow-600' :
                            'text-green-600'
                          }`}>
                            {passwordStrength === 'weak' ? 'Weak' :
                             passwordStrength === 'medium' ? 'Medium' : 'Strong'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          Must be at least 8 characters with letters and numbers
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm New Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={passwordForm.confirm_password}
                      onChange={(e) => handlePasswordInputChange('confirm_password', e.target.value)}
                      className={`w-full px-4 py-3 rounded-lg border-2 ${
                        validationErrors.confirm_password ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
                      } focus:ring-4 focus:ring-blue-100 transition-all outline-none`}
                      placeholder="Confirm new password"
                    />
                    {validationErrors.confirm_password && (
                      <p className="mt-2 text-sm text-red-600">{validationErrors.confirm_password}</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowPasswordSection(false);
                      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
                      setValidationErrors({});
                    }}
                    className="px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-4 focus:ring-gray-100 transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleChangePassword}
                    disabled={changePasswordMutation.isPending}
                    className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {changePasswordMutation.isPending ? (
                      <>
                        <Loader className="w-5 h-5 animate-spin mr-2" />
                        Changing...
                      </>
                    ) : (
                      'Change Password'
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6">
                <p className="text-gray-600">
                  Keep your account secure by using a strong password.
                </p>
              </div>
            )}
          </div>

          {/* Notification Preferences Section */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4">
              <div className="flex items-center">
                <Bell className="w-6 h-6 text-white mr-3" />
                <h2 className="text-xl font-semibold text-white">Notification Preferences</h2>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-6 mb-6">
                {/* Audio Notifications */}
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900 mb-1">Audio Notifications</h3>
                    <p className="text-sm text-gray-500">Play sound alerts for new orders</p>
                  </div>
                  <button
                    onClick={() => handleNotificationToggle('audio_notifications')}
                    className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-4 focus:ring-purple-100 ${
                      notificationPreferences.audio_notifications ? 'bg-purple-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        notificationPreferences.audio_notifications ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* New Order Alerts */}
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900 mb-1">New Order Alerts</h3>
                    <p className="text-sm text-gray-500">Get notified when new orders arrive</p>
                  </div>
                  <button
                    onClick={() => handleNotificationToggle('new_order_alerts')}
                    className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-4 focus:ring-purple-100 ${
                      notificationPreferences.new_order_alerts ? 'bg-purple-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        notificationPreferences.new_order_alerts ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Low Stock Alerts */}
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900 mb-1">Low Stock Alerts</h3>
                    <p className="text-sm text-gray-500">Get notified when items are running low</p>
                  </div>
                  <button
                    onClick={() => handleNotificationToggle('low_stock_alerts')}
                    className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-4 focus:ring-purple-100 ${
                      notificationPreferences.low_stock_alerts ? 'bg-purple-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        notificationPreferences.low_stock_alerts ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Temporary Mute */}
                <div className="pt-3">
                  <div className="flex items-center mb-3">
                    <Clock className="w-5 h-5 text-gray-600 mr-2" />
                    <h3 className="text-sm font-medium text-gray-900">Temporary Mute</h3>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">
                    Mute all notifications for a set duration during busy periods
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[0, 15, 30, 60].map((minutes) => (
                      <button
                        key={minutes}
                        onClick={() => handleMuteDurationChange(minutes)}
                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                          notificationPreferences.mute_duration_minutes === minutes
                            ? 'bg-purple-600 text-white shadow-lg'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {minutes === 0 ? 'Unmuted' : `${minutes} min`}
                      </button>
                    ))}
                  </div>
                  {notificationPreferences.mute_duration_minutes > 0 && (
                    <p className="mt-3 text-sm text-purple-600 font-medium">
                      Notifications will be muted for {notificationPreferences.mute_duration_minutes} minutes
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSaveNotifications}
                  disabled={updateProfileMutation.isPending}
                  className="px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-4 focus:ring-purple-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {updateProfileMutation.isPending ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    'Save Preferences'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_StaffProfile;