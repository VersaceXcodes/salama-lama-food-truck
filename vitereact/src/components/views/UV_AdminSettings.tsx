import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { 
  Settings, 
  Building2, 
  Clock, 
  Receipt, 
  Bell, 
  Gift, 
  CreditCard, 
  Mail,
  Save,
  AlertCircle,
  CheckCircle,
  X,
  Plus,
  Trash2,
  Upload,
  Image as ImageIcon
} from 'lucide-react';

// ===========================
// Type Definitions
// ===========================

interface BusinessInfoSettings {
  name: string;
  phone: string;
  email: string;
  address: string | {
    line1: string;
    line2?: string | null;
    city: string;
    postal_code: string;
  };
  logo_url: string | null;
}

interface DaySchedule {
  open: string;
  close: string;
  closed: boolean;
}

interface SpecialHours {
  date: string;
  status: 'closed' | 'custom';
  custom_hours: { open: string; close: string } | null;
}

interface OperatingHoursSettings {
  weekly_schedule: {
    monday: DaySchedule;
    tuesday: DaySchedule;
    wednesday: DaySchedule;
    thursday: DaySchedule;
    friday: DaySchedule;
    saturday: DaySchedule;
    sunday: DaySchedule;
  };
  special_hours: SpecialHours[];
}

interface TaxSettings {
  vat_rate: number;
  tax_registration_number: string | null;
  apply_tax_to_all: boolean;
}

interface NotificationSettings {
  order_notifications_enabled: boolean;
  notification_emails: string[];
  catering_notifications_enabled: boolean;
  customer_email_notifications: boolean;
  customer_sms_notifications: boolean;
}

interface LoyaltySettings {
  earning_rate: number;
  points_expiry_enabled: boolean;
  points_expiry_months: number;
  referral_enabled: boolean;
  referrer_reward_points: number;
  referee_reward_points: number;
  gamification_enabled: boolean;
}

interface PaymentSettings {
  sumup_api_key: string | null;
  sumup_merchant_id: string | null;
  test_mode_enabled: boolean;
  saved_methods_enabled: boolean;
}

interface EmailSettings {
  email_provider: 'sendgrid' | 'mailgun' | 'smtp';
  smtp_host: string | null;
  smtp_port: number | null;
  api_key: string | null;
  sender_email: string;
  sender_name: string;
}

interface AllSettings {
  business_info: BusinessInfoSettings;
  operating_hours: OperatingHoursSettings;
  tax_settings: TaxSettings;
  notification_settings: NotificationSettings;
  loyalty_settings: LoyaltySettings;
  payment_settings: PaymentSettings;
  email_settings: EmailSettings;
}

type SettingsSection = 'business_info' | 'operating_hours' | 'tax' | 'notifications' | 'loyalty' | 'payment' | 'email';

// ===========================
// API Functions
// ===========================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const fetchAllSettings = async (token: string): Promise<AllSettings> => {
  const response = await axios.get(`${API_BASE_URL}/api/admin/settings`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

const updateBusinessInfo = async (token: string, data: BusinessInfoSettings): Promise<void> => {
  await axios.put(`${API_BASE_URL}/api/admin/settings/business`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

const updateOperatingHours = async (token: string, data: OperatingHoursSettings): Promise<void> => {
  await axios.put(`${API_BASE_URL}/api/admin/settings/operating-hours`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

const updateLoyaltySettings = async (token: string, data: LoyaltySettings): Promise<void> => {
  await axios.put(`${API_BASE_URL}/api/admin/settings/loyalty`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

// ===========================
// Main Component
// ===========================

const UV_AdminSettings: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  
  // Zustand state - individual selectors
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const updateBusinessSettings = useAppStore(state => state.update_business_settings);
  const fetch_business_settings = useAppStore(state => state.fetch_business_settings);

  // Local state
  const [activeSection, setActiveSection] = useState<SettingsSection>(
    (searchParams.get('section') as SettingsSection) || 'business_info'
  );

  const [businessInfoSettings, setBusinessInfoSettings] = useState<BusinessInfoSettings>({
    name: '',
    phone: '',
    email: '',
    address: '',
    logo_url: null,
  });

  const [operatingHoursSettings, setOperatingHoursSettings] = useState<OperatingHoursSettings>({
    weekly_schedule: {
      monday: { open: '11:00', close: '20:00', closed: false },
      tuesday: { open: '11:00', close: '20:00', closed: false },
      wednesday: { open: '11:00', close: '20:00', closed: false },
      thursday: { open: '11:00', close: '20:00', closed: false },
      friday: { open: '11:00', close: '20:00', closed: false },
      saturday: { open: '12:00', close: '22:00', closed: false },
      sunday: { open: '12:00', close: '20:00', closed: false },
    },
    special_hours: [],
  });

  const [taxSettings, setTaxSettings] = useState<TaxSettings>({
    vat_rate: 23,
    tax_registration_number: null,
    apply_tax_to_all: true,
  });

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    order_notifications_enabled: true,
    notification_emails: [],
    catering_notifications_enabled: true,
    customer_email_notifications: true,
    customer_sms_notifications: false,
  });

  const [loyaltySettings, setLoyaltySettings] = useState<LoyaltySettings>({
    earning_rate: 1,
    points_expiry_enabled: false,
    points_expiry_months: 12,
    referral_enabled: true,
    referrer_reward_points: 100,
    referee_reward_points: 50,
    gamification_enabled: true,
  });

  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
    sumup_api_key: null,
    sumup_merchant_id: null,
    test_mode_enabled: true,
    saved_methods_enabled: true,
  });

  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    email_provider: 'sendgrid',
    smtp_host: null,
    smtp_port: null,
    api_key: null,
    sender_email: '',
    sender_name: '',
  });

  const [unsavedChanges, setUnsavedChanges] = useState<Record<SettingsSection, boolean>>({
    business_info: false,
    operating_hours: false,
    tax: false,
    notifications: false,
    loyalty: false,
    payment: false,
    email: false,
  });

  const [showApiKeyFields, setShowApiKeyFields] = useState({
    sumup: false,
    email: false,
  });

  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Fetch all settings
  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ['adminSettings'],
    queryFn: () => fetchAllSettings(authToken!),
    enabled: !!authToken,
    staleTime: 30 * 1000, // 30 seconds - shorter to ensure fresh data
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: false,
  });

  // Update settings state when data is fetched
  useEffect(() => {
    if (settingsData) {
      // Convert address object to string for editing if needed
      const businessInfo = { ...settingsData.business_info };
      if (businessInfo.address && typeof businessInfo.address === 'object') {
        businessInfo.address = `${businessInfo.address.line1}${businessInfo.address.line2 ? ', ' + businessInfo.address.line2 : ''}, ${businessInfo.address.city}, ${businessInfo.address.postal_code}`;
      }
      setBusinessInfoSettings(businessInfo);
      setLogoPreview(businessInfo.logo_url || null);
      setOperatingHoursSettings(settingsData.operating_hours);
      setTaxSettings(settingsData.tax_settings);
      setNotificationSettings(settingsData.notification_settings);
      setLoyaltySettings(settingsData.loyalty_settings);
      setPaymentSettings(settingsData.payment_settings);
      setEmailSettings(settingsData.email_settings);
    }
  }, [settingsData]);

  // Update URL when section changes
  useEffect(() => {
    setSearchParams({ section: activeSection });
  }, [activeSection, setSearchParams]);

  // Mutations
  const businessInfoMutation = useMutation({
    mutationFn: (data: BusinessInfoSettings) => updateBusinessInfo(authToken!, data),
    onSuccess: async () => {
      // Refetch the settings to get the latest data from backend
      await queryClient.invalidateQueries({ queryKey: ['adminSettings'] });
      await queryClient.refetchQueries({ queryKey: ['adminSettings'] });
      setUnsavedChanges(prev => ({ ...prev, business_info: false }));
      setToastMessage({ type: 'success', message: 'Business information updated successfully!' });
      // Update Zustand store with the saved settings including logo_url
      updateBusinessSettings({ 
        business_info: {
          name: businessInfoSettings.name,
          phone: businessInfoSettings.phone,
          email: businessInfoSettings.email,
          address: businessInfoSettings.address,
          logo_url: businessInfoSettings.logo_url,
        }
      });
      // Also refetch business settings from API to ensure store is in sync
      await fetch_business_settings();
    },
    onError: (error: any) => {
      setToastMessage({ 
        type: 'error', 
        message: error.response?.data?.message || 'Failed to update business information' 
      });
    },
  });

  const operatingHoursMutation = useMutation({
    mutationFn: (data: OperatingHoursSettings) => updateOperatingHours(authToken!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminSettings'] });
      setUnsavedChanges(prev => ({ ...prev, operating_hours: false }));
      setToastMessage({ type: 'success', message: 'Operating hours updated successfully!' });
      updateBusinessSettings({ operating_hours: operatingHoursSettings.weekly_schedule });
    },
    onError: (error: any) => {
      setToastMessage({ 
        type: 'error', 
        message: error.response?.data?.message || 'Failed to update operating hours' 
      });
    },
  });

  const loyaltySettingsMutation = useMutation({
    mutationFn: (data: LoyaltySettings) => updateLoyaltySettings(authToken!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminSettings'] });
      setUnsavedChanges(prev => ({ ...prev, loyalty: false }));
      setToastMessage({ type: 'success', message: 'Loyalty settings updated successfully!' });
      updateBusinessSettings({ 
        loyalty_settings: { 
          earning_rate: loyaltySettings.earning_rate,
          referral_enabled: loyaltySettings.referral_enabled,
        } 
      });
    },
    onError: (error: any) => {
      setToastMessage({ 
        type: 'error', 
        message: error.response?.data?.message || 'Failed to update loyalty settings' 
      });
    },
  });

  // Handle save for each section
  const handleSave = (section: SettingsSection) => {
    switch (section) {
      case 'business_info':
        businessInfoMutation.mutate(businessInfoSettings);
        break;
      case 'operating_hours':
        operatingHoursMutation.mutate(operatingHoursSettings);
        break;
      case 'loyalty':
        loyaltySettingsMutation.mutate(loyaltySettings);
        break;
      case 'tax':
      case 'notifications':
      case 'payment':
      case 'email':
        setToastMessage({ 
          type: 'error', 
          message: `${section.replace('_', ' ').toUpperCase()} settings endpoint not yet implemented in backend` 
        });
        break;
    }
  };

  // Handle section change
  const handleSectionChange = (section: SettingsSection) => {
    if (unsavedChanges[activeSection]) {
      if (window.confirm('You have unsaved changes. Are you sure you want to leave this section?')) {
        setActiveSection(section);
      }
    } else {
      setActiveSection(section);
    }
  };

  // Add special hours
  const addSpecialHours = () => {
    setOperatingHoursSettings(prev => ({
      ...prev,
      special_hours: [...prev.special_hours, { date: '', status: 'closed', custom_hours: null }],
    }));
    setUnsavedChanges(prev => ({ ...prev, operating_hours: true }));
  };

  // Remove special hours
  const removeSpecialHours = (index: number) => {
    setOperatingHoursSettings(prev => ({
      ...prev,
      special_hours: prev.special_hours.filter((_, i) => i !== index),
    }));
    setUnsavedChanges(prev => ({ ...prev, operating_hours: true }));
  };

  // Toast auto-dismiss
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Handle logo file upload
  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setToastMessage({ type: 'error', message: 'Please select an image file' });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setToastMessage({ type: 'error', message: 'Image size must be less than 5MB' });
      return;
    }

    setIsUploadingLogo(true);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await axios.post(`${API_BASE_URL}/api/admin/upload/image`, formData, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      const uploadedUrl = `${API_BASE_URL}${response.data.url}`;
      setBusinessInfoSettings({ ...businessInfoSettings, logo_url: uploadedUrl });
      setLogoPreview(uploadedUrl);
      setUnsavedChanges(prev => ({ ...prev, business_info: true }));
      setToastMessage({ type: 'success', message: 'Logo uploaded successfully! Remember to save changes.' });
    } catch (error: any) {
      setToastMessage({ 
        type: 'error', 
        message: error.response?.data?.message || 'Failed to upload logo' 
      });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // Handle logo removal
  const handleRemoveLogo = () => {
    setBusinessInfoSettings({ ...businessInfoSettings, logo_url: null });
    setLogoPreview(null);
    setUnsavedChanges(prev => ({ ...prev, business_info: true }));
  };

  const sections = [
    { id: 'business_info', label: 'Business Info', icon: Building2 },
    { id: 'operating_hours', label: 'Operating Hours', icon: Clock },
    { id: 'tax', label: 'Tax Settings', icon: Receipt },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'loyalty', label: 'Loyalty Program', icon: Gift },
    { id: 'payment', label: 'Payment Integration', icon: CreditCard },
    { id: 'email', label: 'Email Configuration', icon: Mail },
  ] as const;

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

  if (settingsLoading) {
    return (
      <>
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading settings...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Settings className="h-8 w-8 text-orange-600" />
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
                  <p className="text-sm text-gray-600 mt-1">Configure your business settings and integrations</p>
                </div>
              </div>
              {unsavedChanges[activeSection] && (
                <div className="flex items-center space-x-2 text-yellow-600 bg-yellow-50 px-4 py-2 rounded-lg">
                  <AlertCircle className="h-5 w-5" />
                  <span className="text-sm font-medium">Unsaved changes</span>
                </div>
              )}
            </div>
          </div>

          {/* Section Tabs */}
          <div className="border-t border-gray-200">
            <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1 overflow-x-auto">
              {sections.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => handleSectionChange(id as SettingsSection)}
                  className={`flex items-center space-x-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                    activeSection === id
                      ? 'border-orange-600 text-orange-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                  {unsavedChanges[id as SettingsSection] && (
                    <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            {/* Business Info Section */}
            {activeSection === 'business_info' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Business Information</h2>
                  <p className="text-gray-600">Update your business details and contact information</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Business Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={businessInfoSettings.name}
                      onChange={(e) => {
                        setBusinessInfoSettings({ ...businessInfoSettings, name: e.target.value });
                        setUnsavedChanges(prev => ({ ...prev, business_info: true }));
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Salama Lama Food Truck"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={businessInfoSettings.phone}
                      onChange={(e) => {
                        setBusinessInfoSettings({ ...businessInfoSettings, phone: e.target.value });
                        setUnsavedChanges(prev => ({ ...prev, business_info: true }));
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="+353-1-234-5678"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={businessInfoSettings.email}
                      onChange={(e) => {
                        setBusinessInfoSettings({ ...businessInfoSettings, email: e.target.value });
                        setUnsavedChanges(prev => ({ ...prev, business_info: true }));
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="hello@salamalama.ie"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Business Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={typeof businessInfoSettings.address === 'string' 
                        ? businessInfoSettings.address 
                        : businessInfoSettings.address 
                          ? `${businessInfoSettings.address.line1}${businessInfoSettings.address.line2 ? ', ' + businessInfoSettings.address.line2 : ''}, ${businessInfoSettings.address.city}, ${businessInfoSettings.address.postal_code}`
                          : ''}
                      onChange={(e) => {
                        setBusinessInfoSettings({ ...businessInfoSettings, address: e.target.value });
                        setUnsavedChanges(prev => ({ ...prev, business_info: true }));
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Dublin, Ireland"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Business Logo
                    </label>
                    
                    {/* Logo Preview */}
                    {logoPreview && (
                      <div className="mb-4 p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">Current Logo:</span>
                          <button
                            type="button"
                            onClick={handleRemoveLogo}
                            className="text-sm text-red-600 hover:text-red-800 font-medium flex items-center space-x-1"
                          >
                            <X className="h-4 w-4" />
                            <span>Remove</span>
                          </button>
                        </div>
                        <div className="flex items-center justify-center bg-white p-4 rounded-lg border border-gray-200">
                          <img 
                            src={logoPreview} 
                            alt="Business Logo Preview" 
                            className="max-h-24 max-w-full object-contain"
                          />
                        </div>
                      </div>
                    )}

                    {/* Upload Section */}
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <label className="flex-1">
                          <div className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-colors cursor-pointer">
                            <div className="flex items-center space-x-3">
                              {isUploadingLogo ? (
                                <>
                                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-600"></div>
                                  <span className="text-sm font-medium text-gray-700">Uploading...</span>
                                </>
                              ) : (
                                <>
                                  <Upload className="h-5 w-5 text-gray-500" />
                                  <span className="text-sm font-medium text-gray-700">
                                    {logoPreview ? 'Upload New Logo' : 'Upload Logo'}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            disabled={isUploadingLogo}
                            className="hidden"
                          />
                        </label>
                      </div>
                      
                      <div className="text-xs text-gray-500 flex items-start space-x-2">
                        <ImageIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
                        <span>
                          Recommended: PNG or SVG format, transparent background, max 5MB. 
                          Logo will be displayed in the navigation header.
                        </span>
                      </div>

                      {/* Optional: Manual URL Entry */}
                      <div className="pt-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Or enter logo URL manually:
                        </label>
                        <input
                          type="url"
                          value={businessInfoSettings.logo_url || ''}
                          onChange={(e) => {
                            const url = e.target.value || null;
                            setBusinessInfoSettings({ ...businessInfoSettings, logo_url: url });
                            setLogoPreview(url);
                            setUnsavedChanges(prev => ({ ...prev, business_info: true }));
                          }}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          placeholder="https://example.com/logo.png"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => handleSave('business_info')}
                    disabled={businessInfoMutation.isPending || !unsavedChanges.business_info}
                    className="flex items-center space-x-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {businessInfoMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        <span>Save Business Info</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Operating Hours Section */}
            {activeSection === 'operating_hours' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Operating Hours</h2>
                  <p className="text-gray-600">Set your weekly schedule and special hours</p>
                </div>

                {/* Weekly Schedule */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Schedule</h3>
                  <div className="space-y-4">
                    {days.map((day) => (
                      <div key={day} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                        <div className="w-32">
                          <span className="text-sm font-medium text-gray-700 capitalize">{day}</span>
                        </div>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={operatingHoursSettings.weekly_schedule[day].closed}
                            onChange={(e) => {
                              setOperatingHoursSettings(prev => ({
                                ...prev,
                                weekly_schedule: {
                                  ...prev.weekly_schedule,
                                  [day]: { ...prev.weekly_schedule[day], closed: e.target.checked },
                                },
                              }));
                              setUnsavedChanges(prev => ({ ...prev, operating_hours: true }));
                            }}
                            className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                          />
                          <span className="text-sm text-gray-600">Closed</span>
                        </label>
                        {!operatingHoursSettings.weekly_schedule[day].closed && (
                          <div className="flex items-center space-x-2 flex-1">
                            <input
                              type="time"
                              value={operatingHoursSettings.weekly_schedule[day].open}
                              onChange={(e) => {
                                setOperatingHoursSettings(prev => ({
                                  ...prev,
                                  weekly_schedule: {
                                    ...prev.weekly_schedule,
                                    [day]: { ...prev.weekly_schedule[day], open: e.target.value },
                                  },
                                }));
                                setUnsavedChanges(prev => ({ ...prev, operating_hours: true }));
                              }}
                              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            />
                            <span className="text-gray-500">to</span>
                            <input
                              type="time"
                              value={operatingHoursSettings.weekly_schedule[day].close}
                              onChange={(e) => {
                                setOperatingHoursSettings(prev => ({
                                  ...prev,
                                  weekly_schedule: {
                                    ...prev.weekly_schedule,
                                    [day]: { ...prev.weekly_schedule[day], close: e.target.value },
                                  },
                                }));
                                setUnsavedChanges(prev => ({ ...prev, operating_hours: true }));
                              }}
                              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Special Hours */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Special Hours / Closures</h3>
                    <button
                      onClick={addSpecialHours}
                      className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add Special Hours</span>
                    </button>
                  </div>

                  {operatingHoursSettings.special_hours.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Clock className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                      <p>No special hours configured</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {operatingHoursSettings.special_hours.map((special, index) => (
                        <div key={index} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                          <input
                            type="date"
                            value={special.date}
                            onChange={(e) => {
                              const newSpecialHours = [...operatingHoursSettings.special_hours];
                              newSpecialHours[index].date = e.target.value;
                              setOperatingHoursSettings(prev => ({ ...prev, special_hours: newSpecialHours }));
                              setUnsavedChanges(prev => ({ ...prev, operating_hours: true }));
                            }}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          />
                          <select
                            value={special.status}
                            onChange={(e) => {
                              const newSpecialHours = [...operatingHoursSettings.special_hours];
                              newSpecialHours[index].status = e.target.value as 'closed' | 'custom';
                              if (e.target.value === 'closed') {
                                newSpecialHours[index].custom_hours = null;
                              }
                              setOperatingHoursSettings(prev => ({ ...prev, special_hours: newSpecialHours }));
                              setUnsavedChanges(prev => ({ ...prev, operating_hours: true }));
                            }}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          >
                            <option value="closed">Closed</option>
                            <option value="custom">Custom Hours</option>
                          </select>
                          {special.status === 'custom' && (
                            <div className="flex items-center space-x-2">
                              <input
                                type="time"
                                value={special.custom_hours?.open || ''}
                                onChange={(e) => {
                                  const newSpecialHours = [...operatingHoursSettings.special_hours];
                                  newSpecialHours[index].custom_hours = {
                                    open: e.target.value,
                                    close: newSpecialHours[index].custom_hours?.close || '',
                                  };
                                  setOperatingHoursSettings(prev => ({ ...prev, special_hours: newSpecialHours }));
                                  setUnsavedChanges(prev => ({ ...prev, operating_hours: true }));
                                }}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                              />
                              <span className="text-gray-500">to</span>
                              <input
                                type="time"
                                value={special.custom_hours?.close || ''}
                                onChange={(e) => {
                                  const newSpecialHours = [...operatingHoursSettings.special_hours];
                                  newSpecialHours[index].custom_hours = {
                                    open: newSpecialHours[index].custom_hours?.open || '',
                                    close: e.target.value,
                                  };
                                  setOperatingHoursSettings(prev => ({ ...prev, special_hours: newSpecialHours }));
                                  setUnsavedChanges(prev => ({ ...prev, operating_hours: true }));
                                }}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                              />
                            </div>
                          )}
                          <button
                            onClick={() => removeSpecialHours(index)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => handleSave('operating_hours')}
                    disabled={operatingHoursMutation.isPending || !unsavedChanges.operating_hours}
                    className="flex items-center space-x-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {operatingHoursMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        <span>Save Operating Hours</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Tax Settings Section */}
            {activeSection === 'tax' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Tax Settings</h2>
                  <p className="text-gray-600">Configure VAT and tax policies</p>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      VAT Rate (%) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={taxSettings.vat_rate}
                      onChange={(e) => {
                        setTaxSettings({ ...taxSettings, vat_rate: parseFloat(e.target.value) });
                        setUnsavedChanges(prev => ({ ...prev, tax: true }));
                      }}
                      min="0"
                      max="100"
                      step="0.1"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tax Registration Number
                    </label>
                    <input
                      type="text"
                      value={taxSettings.tax_registration_number || ''}
                      onChange={(e) => {
                        setTaxSettings({ ...taxSettings, tax_registration_number: e.target.value || null });
                        setUnsavedChanges(prev => ({ ...prev, tax: true }));
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="IE1234567T"
                    />
                  </div>

                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={taxSettings.apply_tax_to_all}
                      onChange={(e) => {
                        setTaxSettings({ ...taxSettings, apply_tax_to_all: e.target.checked });
                        setUnsavedChanges(prev => ({ ...prev, tax: true }));
                      }}
                      className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                    />
                    <label className="text-sm font-medium text-gray-700">
                      Apply tax to all items
                    </label>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-900">Endpoint Not Implemented</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      The backend endpoint for tax settings (PUT /api/admin/settings/tax) has not been implemented yet.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => handleSave('tax')}
                    className="flex items-center space-x-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
                  >
                    <Save className="h-4 w-4" />
                    <span>Save Tax Settings</span>
                  </button>
                </div>
              </div>
            )}

            {/* Notification Settings Section */}
            {activeSection === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Notification Settings</h2>
                  <p className="text-gray-600">Configure email and SMS notification preferences</p>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">Order Notifications</h3>
                      <p className="text-sm text-gray-600 mt-1">Receive notifications for new orders</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationSettings.order_notifications_enabled}
                        onChange={(e) => {
                          setNotificationSettings({ ...notificationSettings, order_notifications_enabled: e.target.checked });
                          setUnsavedChanges(prev => ({ ...prev, notifications: true }));
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">Catering Inquiry Notifications</h3>
                      <p className="text-sm text-gray-600 mt-1">Receive notifications for new catering inquiries</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationSettings.catering_notifications_enabled}
                        onChange={(e) => {
                          setNotificationSettings({ ...notificationSettings, catering_notifications_enabled: e.target.checked });
                          setUnsavedChanges(prev => ({ ...prev, notifications: true }));
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">Customer Email Notifications</h3>
                      <p className="text-sm text-gray-600 mt-1">Send email notifications to customers</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationSettings.customer_email_notifications}
                        onChange={(e) => {
                          setNotificationSettings({ ...notificationSettings, customer_email_notifications: e.target.checked });
                          setUnsavedChanges(prev => ({ ...prev, notifications: true }));
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">Customer SMS Notifications</h3>
                      <p className="text-sm text-gray-600 mt-1">Send SMS notifications to customers</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationSettings.customer_sms_notifications}
                        onChange={(e) => {
                          setNotificationSettings({ ...notificationSettings, customer_sms_notifications: e.target.checked });
                          setUnsavedChanges(prev => ({ ...prev, notifications: true }));
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                    </label>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-900">Endpoint Not Implemented</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      The backend endpoint for notification settings (PUT /api/admin/settings/notifications) has not been implemented yet.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => handleSave('notifications')}
                    className="flex items-center space-x-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
                  >
                    <Save className="h-4 w-4" />
                    <span>Save Notification Settings</span>
                  </button>
                </div>
              </div>
            )}

            {/* Loyalty Program Section */}
            {activeSection === 'loyalty' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Loyalty Program Settings</h2>
                  <p className="text-gray-600">Configure loyalty points, rewards, and referral program</p>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Points Earning Rate <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">€1 =</span>
                      <input
                        type="number"
                        value={loyaltySettings.earning_rate}
                        onChange={(e) => {
                          setLoyaltySettings({ ...loyaltySettings, earning_rate: parseFloat(e.target.value) });
                          setUnsavedChanges(prev => ({ ...prev, loyalty: true }));
                        }}
                        min="0"
                        step="0.1"
                        className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                      <span className="text-sm text-gray-600">points</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">Points Expiry</h3>
                      <p className="text-sm text-gray-600 mt-1">Enable automatic expiry of unused points</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={loyaltySettings.points_expiry_enabled}
                        onChange={(e) => {
                          setLoyaltySettings({ ...loyaltySettings, points_expiry_enabled: e.target.checked });
                          setUnsavedChanges(prev => ({ ...prev, loyalty: true }));
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                    </label>
                  </div>

                  {loyaltySettings.points_expiry_enabled && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Points Expiry Period (months)
                      </label>
                      <input
                        type="number"
                        value={loyaltySettings.points_expiry_months}
                        onChange={(e) => {
                          setLoyaltySettings({ ...loyaltySettings, points_expiry_months: parseInt(e.target.value) });
                          setUnsavedChanges(prev => ({ ...prev, loyalty: true }));
                        }}
                        min="1"
                        className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">Referral Program</h3>
                      <p className="text-sm text-gray-600 mt-1">Enable customer referral rewards</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={loyaltySettings.referral_enabled}
                        onChange={(e) => {
                          setLoyaltySettings({ ...loyaltySettings, referral_enabled: e.target.checked });
                          setUnsavedChanges(prev => ({ ...prev, loyalty: true }));
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                    </label>
                  </div>

                  {loyaltySettings.referral_enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Referrer Reward (points)
                        </label>
                        <input
                          type="number"
                          value={loyaltySettings.referrer_reward_points}
                          onChange={(e) => {
                            setLoyaltySettings({ ...loyaltySettings, referrer_reward_points: parseInt(e.target.value) });
                            setUnsavedChanges(prev => ({ ...prev, loyalty: true }));
                          }}
                          min="0"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Referee Reward (points)
                        </label>
                        <input
                          type="number"
                          value={loyaltySettings.referee_reward_points}
                          onChange={(e) => {
                            setLoyaltySettings({ ...loyaltySettings, referee_reward_points: parseInt(e.target.value) });
                            setUnsavedChanges(prev => ({ ...prev, loyalty: true }));
                          }}
                          min="0"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">Gamification Features</h3>
                      <p className="text-sm text-gray-600 mt-1">Enable spin wheel, badges, and achievements</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={loyaltySettings.gamification_enabled}
                        onChange={(e) => {
                          setLoyaltySettings({ ...loyaltySettings, gamification_enabled: e.target.checked });
                          setUnsavedChanges(prev => ({ ...prev, loyalty: true }));
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => handleSave('loyalty')}
                    disabled={loyaltySettingsMutation.isPending || !unsavedChanges.loyalty}
                    className="flex items-center space-x-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {loyaltySettingsMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        <span>Save Loyalty Settings</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Payment Integration Section */}
            {activeSection === 'payment' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Integration</h2>
                  <p className="text-gray-600">Configure SumUp payment processing</p>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SumUp API Key
                    </label>
                    <div className="relative">
                      <input
                        type={showApiKeyFields.sumup ? 'text' : 'password'}
                        value={paymentSettings.sumup_api_key || ''}
                        onChange={(e) => {
                          setPaymentSettings({ ...paymentSettings, sumup_api_key: e.target.value || null });
                          setUnsavedChanges(prev => ({ ...prev, payment: true }));
                        }}
                        className="w-full px-4 py-2 pr-24 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
                        placeholder="sk_test_..."
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKeyFields({ ...showApiKeyFields, sumup: !showApiKeyFields.sumup })}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 px-3 py-1 text-sm text-orange-600 hover:text-orange-700 font-medium"
                      >
                        {showApiKeyFields.sumup ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SumUp Merchant ID
                    </label>
                    <input
                      type="text"
                      value={paymentSettings.sumup_merchant_id || ''}
                      onChange={(e) => {
                        setPaymentSettings({ ...paymentSettings, sumup_merchant_id: e.target.value || null });
                        setUnsavedChanges(prev => ({ ...prev, payment: true }));
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="mer_..."
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">Test Mode</h3>
                      <p className="text-sm text-gray-600 mt-1">Use test API keys for development</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={paymentSettings.test_mode_enabled}
                        onChange={(e) => {
                          setPaymentSettings({ ...paymentSettings, test_mode_enabled: e.target.checked });
                          setUnsavedChanges(prev => ({ ...prev, payment: true }));
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">Save Payment Methods</h3>
                      <p className="text-sm text-gray-600 mt-1">Allow customers to save cards for future use</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={paymentSettings.saved_methods_enabled}
                        onChange={(e) => {
                          setPaymentSettings({ ...paymentSettings, saved_methods_enabled: e.target.checked });
                          setUnsavedChanges(prev => ({ ...prev, payment: true }));
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                    </label>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-900">Endpoint Not Implemented</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      The backend endpoint for payment settings (PUT /api/admin/settings/payment) has not been implemented yet.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => handleSave('payment')}
                    className="flex items-center space-x-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
                  >
                    <Save className="h-4 w-4" />
                    <span>Save Payment Settings</span>
                  </button>
                </div>
              </div>
            )}

            {/* Email Configuration Section */}
            {activeSection === 'email' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Email Configuration</h2>
                  <p className="text-gray-600">Configure email service provider</p>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Provider <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={emailSettings.email_provider}
                      onChange={(e) => {
                        setEmailSettings({ ...emailSettings, email_provider: e.target.value as 'sendgrid' | 'mailgun' | 'smtp' });
                        setUnsavedChanges(prev => ({ ...prev, email: true }));
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="sendgrid">SendGrid</option>
                      <option value="mailgun">Mailgun</option>
                      <option value="smtp">SMTP</option>
                    </select>
                  </div>

                  {emailSettings.email_provider === 'smtp' && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            SMTP Host <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={emailSettings.smtp_host || ''}
                            onChange={(e) => {
                              setEmailSettings({ ...emailSettings, smtp_host: e.target.value || null });
                              setUnsavedChanges(prev => ({ ...prev, email: true }));
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            placeholder="smtp.example.com"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            SMTP Port <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            value={emailSettings.smtp_port || ''}
                            onChange={(e) => {
                              setEmailSettings({ ...emailSettings, smtp_port: parseInt(e.target.value) || null });
                              setUnsavedChanges(prev => ({ ...prev, email: true }));
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            placeholder="587"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {emailSettings.email_provider !== 'smtp' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        API Key <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showApiKeyFields.email ? 'text' : 'password'}
                          value={emailSettings.api_key || ''}
                          onChange={(e) => {
                            setEmailSettings({ ...emailSettings, api_key: e.target.value || null });
                            setUnsavedChanges(prev => ({ ...prev, email: true }));
                          }}
                          className="w-full px-4 py-2 pr-24 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
                          placeholder="SG...."
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKeyFields({ ...showApiKeyFields, email: !showApiKeyFields.email })}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 px-3 py-1 text-sm text-orange-600 hover:text-orange-700 font-medium"
                        >
                          {showApiKeyFields.email ? 'Hide' : 'Show'}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sender Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={emailSettings.sender_email}
                        onChange={(e) => {
                          setEmailSettings({ ...emailSettings, sender_email: e.target.value });
                          setUnsavedChanges(prev => ({ ...prev, email: true }));
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="hello@salamalama.ie"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sender Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={emailSettings.sender_name}
                        onChange={(e) => {
                          setEmailSettings({ ...emailSettings, sender_name: e.target.value });
                          setUnsavedChanges(prev => ({ ...prev, email: true }));
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="Salama Lama Food Truck"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-900">Endpoint Not Implemented</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      The backend endpoint for email settings (PUT /api/admin/settings/email) has not been implemented yet.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end space-x-4 pt-4">
                  <button
                    onClick={() => handleSave('email')}
                    className="flex items-center space-x-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
                  >
                    <Save className="h-4 w-4" />
                    <span>Save Email Settings</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-8 right-8 z-50 animate-slide-up">
            <div className={`flex items-center space-x-3 px-6 py-4 rounded-lg shadow-lg ${
              toastMessage.type === 'success' 
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              {toastMessage.type === 'success' ? (
                <CheckCircle className="h-5 w-5 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
              )}
              <p className="font-medium">{toastMessage.message}</p>
              <button
                onClick={() => setToastMessage(null)}
                className="ml-4 hover:opacity-70 transition-opacity"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default UV_AdminSettings;