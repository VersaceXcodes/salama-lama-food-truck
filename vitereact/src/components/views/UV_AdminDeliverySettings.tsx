import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import {
  Settings,
  MapPin,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  AlertCircle,
  Save,
  Search,
  Power,
  Clock,
  DollarSign,
  Map as MapIcon,
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface DeliveryZone {
  zone_id: string;
  zone_name: string;
  zone_type: 'polygon' | 'radius' | 'postal_code';
  zone_boundaries: Record<string, any>;
  delivery_fee: number;
  minimum_order_value: number | null;
  estimated_delivery_time: number;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

interface DeliverySettings {
  delivery_enabled: boolean;
  minimum_order_value: number | null;
  free_delivery_threshold: number | null;
}

interface ZoneFormData {
  zone_name: string;
  zone_type: 'polygon' | 'radius' | 'postal_code';
  zone_boundaries: string; // JSON string for input
  delivery_fee: string;
  minimum_order_value: string;
  estimated_delivery_time: string;
  is_active: boolean;
  priority: string;
}

interface ValidationResult {
  valid: boolean;
  zone_id?: string;
  delivery_fee?: number;
  estimated_delivery_time?: number;
  message?: string;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

interface DeliverySettingsResponse extends DeliverySettings {
  zones: DeliveryZone[];
}

const fetchDeliverySettings = async (token: string): Promise<DeliverySettingsResponse> => {
  const response = await axios.get(`${API_BASE_URL}/api/admin/delivery/settings`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  
  const zones = (response.data.zones || []).map((zone: any) => ({
    ...zone,
    delivery_fee: Number(zone.delivery_fee || 0),
    minimum_order_value: zone.minimum_order_value ? Number(zone.minimum_order_value) : null,
    estimated_delivery_time: Number(zone.estimated_delivery_time || 0),
    priority: Number(zone.priority || 0),
  }));
  
  return {
    delivery_enabled: response.data.delivery_enabled ?? false,
    minimum_order_value: response.data.minimum_order_delivery ? Number(response.data.minimum_order_delivery) : null,
    free_delivery_threshold: response.data.free_delivery_threshold ? Number(response.data.free_delivery_threshold) : null,
    zones,
  };
};

// Removed separate fetchDeliveryZones - zones are returned by fetchDeliverySettings

const updateDeliverySettings = async (
  token: string,
  settings: DeliverySettings
): Promise<void> => {
  // Map to backend field names
  const payload = {
    delivery_enabled: settings.delivery_enabled,
    minimum_order_delivery: settings.minimum_order_value,
    free_delivery_threshold: settings.free_delivery_threshold,
  };
  await axios.put(`${API_BASE_URL}/api/admin/delivery/settings`, payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

const createDeliveryZone = async (
  token: string,
  zoneData: any
): Promise<DeliveryZone> => {
  const response = await axios.post(`${API_BASE_URL}/api/admin/delivery/zones`, zoneData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

const updateDeliveryZone = async (
  token: string,
  zoneId: string,
  zoneData: any
): Promise<DeliveryZone> => {
  const response = await axios.put(
    `${API_BASE_URL}/api/admin/delivery/zones/${zoneId}`,
    zoneData,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return response.data;
};

const deleteDeliveryZone = async (token: string, zoneId: string): Promise<void> => {
  await axios.delete(`${API_BASE_URL}/api/admin/delivery/zones/${zoneId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

const validateDeliveryAddress = async (
  token: string,
  address: string,
  postalCode: string
): Promise<ValidationResult> => {
  const response = await axios.post(
    `${API_BASE_URL}/api/admin/delivery/validate-address`,
    { address, postal_code: postalCode },
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return {
    ...response.data,
    delivery_fee: response.data.delivery_fee ? Number(response.data.delivery_fee) : undefined,
    estimated_delivery_time: response.data.estimated_delivery_time
      ? Number(response.data.estimated_delivery_time)
      : undefined,
  };
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_AdminDeliverySettings: React.FC = () => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  // Global state - use individual selectors to avoid infinite loops
  const auth_token = useAppStore(state => state.authentication_state.auth_token);

  // Local state
  const [delivery_enabled, set_delivery_enabled] = useState<boolean>(false);
  const [minimum_order_value, set_minimum_order_value] = useState<string>('');
  const [free_delivery_threshold, set_free_delivery_threshold] = useState<string>('');
  const [selected_zone, set_selected_zone] = useState<DeliveryZone | null>(null);
  const [zone_form_open, set_zone_form_open] = useState<boolean>(false);
  const [zone_form_data, set_zone_form_data] = useState<ZoneFormData>({
    zone_name: '',
    zone_type: 'polygon',
    zone_boundaries: '{}',
    delivery_fee: '',
    minimum_order_value: '',
    estimated_delivery_time: '30',
    is_active: true,
    priority: '0',
  });
  const [delete_confirm_zone_id, set_delete_confirm_zone_id] = useState<string | null>(null);
  const [test_address, set_test_address] = useState<string>('');
  const [test_postal_code, set_test_postal_code] = useState<string>('');
  const [validation_result, set_validation_result] = useState<ValidationResult | null>(null);
  const [notification, set_notification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const queryClient = useQueryClient();

  // ============================================================================
  // REACT QUERY HOOKS
  // ============================================================================

  // Fetch delivery settings (includes zones)
  const {
    data: settings_data,
    isLoading: settings_loading,
    error: settings_error,
  } = useQuery({
    queryKey: ['delivery_settings'],
    queryFn: () => fetchDeliverySettings(auth_token!),
    enabled: !!auth_token,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const zones_data = settings_data?.zones || [];
  const zones_loading = settings_loading;
  const zones_error = settings_error;

  // Update settings mutation
  const update_settings_mutation = useMutation({
    mutationFn: (settings: DeliverySettings) => updateDeliverySettings(auth_token!, settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery_settings'] });
      show_notification('success', 'Delivery settings updated successfully');
    },
    onError: (error: any) => {
      show_notification('error', error.response?.data?.message || 'Failed to update settings');
    },
  });

  // Create zone mutation
  const create_zone_mutation = useMutation({
    mutationFn: (zoneData: any) => createDeliveryZone(auth_token!, zoneData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery_zones'] });
      set_zone_form_open(false);
      reset_zone_form();
      show_notification('success', 'Delivery zone created successfully');
    },
    onError: (error: any) => {
      show_notification('error', error.response?.data?.message || 'Failed to create zone');
    },
  });

  // Update zone mutation
  const update_zone_mutation = useMutation({
    mutationFn: ({ zoneId, zoneData }: { zoneId: string; zoneData: any }) =>
      updateDeliveryZone(auth_token!, zoneId, zoneData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery_zones'] });
      set_zone_form_open(false);
      set_selected_zone(null);
      reset_zone_form();
      show_notification('success', 'Delivery zone updated successfully');
    },
    onError: (error: any) => {
      show_notification('error', error.response?.data?.message || 'Failed to update zone');
    },
  });

  // Delete zone mutation
  const delete_zone_mutation = useMutation({
    mutationFn: (zoneId: string) => deleteDeliveryZone(auth_token!, zoneId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery_zones'] });
      set_delete_confirm_zone_id(null);
      show_notification('success', 'Delivery zone deleted successfully');
    },
    onError: (error: any) => {
      show_notification('error', error.response?.data?.message || 'Failed to delete zone');
    },
  });

  // Validate address mutation
  const validate_address_mutation = useMutation({
    mutationFn: ({ address, postalCode }: { address: string; postalCode: string }) =>
      validateDeliveryAddress(auth_token!, address, postalCode),
    onSuccess: (data) => {
      set_validation_result(data);
    },
    onError: (error: any) => {
      show_notification('error', error.response?.data?.message || 'Validation failed');
    },
  });

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Initialize form with fetched settings
  useEffect(() => {
    if (settings_data) {
      set_delivery_enabled(settings_data.delivery_enabled);
      set_minimum_order_value(
        settings_data.minimum_order_value !== null ? String(settings_data.minimum_order_value) : ''
      );
      set_free_delivery_threshold(
        settings_data.free_delivery_threshold !== null ? String(settings_data.free_delivery_threshold) : ''
      );
    }
  }, [settings_data]);

  // Auto-dismiss notifications
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        set_notification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  const show_notification = (type: 'success' | 'error', message: string) => {
    set_notification({ type, message });
  };

  const reset_zone_form = () => {
    set_zone_form_data({
      zone_name: '',
      zone_type: 'polygon',
      zone_boundaries: '{}',
      delivery_fee: '',
      minimum_order_value: '',
      estimated_delivery_time: '30',
      is_active: true,
      priority: '0',
    });
  };

  const open_create_zone_form = () => {
    reset_zone_form();
    set_selected_zone(null);
    set_zone_form_open(true);
  };

  const open_edit_zone_form = (zone: DeliveryZone) => {
    set_selected_zone(zone);
    set_zone_form_data({
      zone_name: zone.zone_name,
      zone_type: zone.zone_type,
      zone_boundaries: JSON.stringify(zone.zone_boundaries, null, 2),
      delivery_fee: String(zone.delivery_fee),
      minimum_order_value: zone.minimum_order_value !== null ? String(zone.minimum_order_value) : '',
      estimated_delivery_time: String(zone.estimated_delivery_time),
      is_active: zone.is_active,
      priority: String(zone.priority),
    });
    set_zone_form_open(true);
  };

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handle_save_global_settings = () => {
    const settings: DeliverySettings = {
      delivery_enabled,
      minimum_order_value: minimum_order_value ? Number(minimum_order_value) : null,
      free_delivery_threshold: free_delivery_threshold ? Number(free_delivery_threshold) : null,
    };
    update_settings_mutation.mutate(settings);
  };

  const handle_zone_form_submit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate zone boundaries JSON
    let parsed_boundaries: any;
    try {
      parsed_boundaries = JSON.parse(zone_form_data.zone_boundaries);
    } catch {
      show_notification('error', 'Invalid zone boundaries JSON format');
      return;
    }

    const zone_payload = {
      zone_name: zone_form_data.zone_name,
      zone_type: zone_form_data.zone_type,
      zone_boundaries: parsed_boundaries,
      delivery_fee: Number(zone_form_data.delivery_fee),
      minimum_order_value: zone_form_data.minimum_order_value ? Number(zone_form_data.minimum_order_value) : null,
      estimated_delivery_time: Number(zone_form_data.estimated_delivery_time),
      is_active: zone_form_data.is_active,
      priority: Number(zone_form_data.priority),
    };

    if (selected_zone) {
      // Update existing zone
      update_zone_mutation.mutate({ zoneId: selected_zone.zone_id, zoneData: zone_payload });
    } else {
      // Create new zone
      create_zone_mutation.mutate(zone_payload);
    }
  };

  const handle_delete_zone = (zone_id: string) => {
    delete_zone_mutation.mutate(zone_id);
  };

  const handle_validate_address = () => {
    if (!test_address.trim() || !test_postal_code.trim()) {
      show_notification('error', 'Please enter both address and postal code');
      return;
    }
    validate_address_mutation.mutate({ address: test_address, postalCode: test_postal_code });
  };

  const handle_toggle_zone_active = (zone: DeliveryZone) => {
    const updated_zone = {
      zone_name: zone.zone_name,
      zone_boundaries: zone.zone_boundaries,
      delivery_fee: zone.delivery_fee,
      minimum_order_value: zone.minimum_order_value,
      estimated_delivery_time: zone.estimated_delivery_time,
      is_active: !zone.is_active,
      priority: zone.priority,
    };
    update_zone_mutation.mutate({ zoneId: zone.zone_id, zoneData: updated_zone });
  };

  // ============================================================================
  // LOADING & ERROR STATES
  // ============================================================================

  if (settings_loading || zones_loading) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading delivery settings...</p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (settings_error || zones_error) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="flex items-center">
                <AlertCircle className="h-6 w-6 text-red-600 mr-3" />
                <div>
                  <h3 className="text-red-800 font-semibold">Failed to Load Delivery Settings</h3>
                  <p className="text-red-600 text-sm mt-1">
                    {(settings_error as any)?.message || (zones_error as any)?.message || 'Please try again later'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <MapPin className="h-8 w-8 text-blue-600 mr-3" />
              Delivery Configuration
            </h1>
            <p className="text-gray-600 mt-2">
              Manage delivery zones, fees, and operational settings
            </p>
          </div>

          {/* Notification Toast */}
          {notification && (
            <div
              className={`fixed top-4 right-4 z-50 max-w-md rounded-lg shadow-lg p-4 ${
                notification.type === 'success'
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              <div className="flex items-start">
                {notification.type === 'success' ? (
                  <Check className="h-5 w-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
                )}
                <p
                  className={`text-sm font-medium ${
                    notification.type === 'success' ? 'text-green-800' : 'text-red-800'
                  }`}
                >
                  {notification.message}
                </p>
              </div>
            </div>
          )}

          {/* Global Delivery Settings Card */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
            <div className="flex items-center mb-6">
              <Settings className="h-6 w-6 text-gray-700 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900">Global Delivery Settings</h2>
            </div>

            <div className="space-y-6">
              {/* Delivery Enable/Disable Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center">
                  <Power
                    className={`h-6 w-6 mr-3 ${delivery_enabled ? 'text-green-600' : 'text-gray-400'}`}
                  />
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      Delivery Service {delivery_enabled ? 'Enabled' : 'Disabled'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {delivery_enabled
                        ? 'Customers can select delivery at checkout'
                        : 'Only collection is available'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => set_delivery_enabled(!delivery_enabled)}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    delivery_enabled ? 'bg-green-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                      delivery_enabled ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Minimum Order Value */}
              <div>
                <label htmlFor="minimum_order_value" className="block text-sm font-medium text-gray-700 mb-2">
                  <DollarSign className="inline h-4 w-4 mr-1" />
                  Minimum Order Value (€)
                </label>
                <input
                  type="number"
                  id="minimum_order_value"
                  value={minimum_order_value}
                  onChange={(e) => set_minimum_order_value(e.target.value)}
                  placeholder="e.g., 15.00"
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty for no minimum order requirement
                </p>
              </div>

              {/* Free Delivery Threshold */}
              <div>
                <label htmlFor="free_delivery_threshold" className="block text-sm font-medium text-gray-700 mb-2">
                  <DollarSign className="inline h-4 w-4 mr-1" />
                  Free Delivery Threshold (€)
                </label>
                <input
                  type="number"
                  id="free_delivery_threshold"
                  value={free_delivery_threshold}
                  onChange={(e) => set_free_delivery_threshold(e.target.value)}
                  placeholder="e.g., 50.00"
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Orders above this amount qualify for free delivery
                </p>
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <button
                  onClick={handle_save_global_settings}
                  disabled={update_settings_mutation.isPending}
                  className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {update_settings_mutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Settings
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Delivery Zones Management */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <MapIcon className="h-6 w-6 text-gray-700 mr-2" />
                <h2 className="text-xl font-semibold text-gray-900">Delivery Zones</h2>
              </div>
              <button
                onClick={open_create_zone_form}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add New Zone
              </button>
            </div>

            {/* Zone List */}
            {zones_data && zones_data.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {zones_data.map((zone) => (
                  <div
                    key={zone.zone_id}
                    className={`border rounded-lg p-4 transition-all ${
                      zone.is_active
                        ? 'border-gray-200 bg-white hover:shadow-md'
                        : 'border-gray-300 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{zone.zone_name}</h3>
                        <p className="text-xs text-gray-500 mt-1 uppercase">{zone.zone_type}</p>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          zone.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {zone.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-700">
                        <DollarSign className="h-4 w-4 mr-2 text-gray-500" />
                        <span className="font-medium">Delivery Fee:</span>
                        <span className="ml-auto">€{Number(zone.delivery_fee).toFixed(2)}</span>
                      </div>
                      {zone.minimum_order_value !== null && (
                        <div className="flex items-center text-sm text-gray-700">
                          <DollarSign className="h-4 w-4 mr-2 text-gray-500" />
                          <span className="font-medium">Min Order:</span>
                          <span className="ml-auto">€{Number(zone.minimum_order_value).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex items-center text-sm text-gray-700">
                        <Clock className="h-4 w-4 mr-2 text-gray-500" />
                        <span className="font-medium">Est. Time:</span>
                        <span className="ml-auto">{zone.estimated_delivery_time} mins</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 pt-3 border-t border-gray-200">
                      <button
                        onClick={() => open_edit_zone_form(zone)}
                        className="flex-1 flex items-center justify-center px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                      >
                        <Edit2 className="h-4 w-4 mr-1" />
                        Edit
                      </button>
                      <button
                        onClick={() => handle_toggle_zone_active(zone)}
                        disabled={update_zone_mutation.isPending}
                        className={`flex-1 flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          zone.is_active
                            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            : 'bg-green-50 text-green-700 hover:bg-green-100'
                        }`}
                      >
                        {zone.is_active ? (
                          <>
                            <X className="h-4 w-4 mr-1" />
                            Disable
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-1" />
                            Enable
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => set_delete_confirm_zone_id(zone.zone_id)}
                        className="px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <MapIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">No delivery zones configured</p>
                <p className="text-gray-500 text-sm mt-1">Create your first zone to start delivering</p>
              </div>
            )}
          </div>

          {/* Address Validation Tester */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center mb-6">
              <Search className="h-6 w-6 text-gray-700 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900">Address Validation Tester</h2>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="test_address" className="block text-sm font-medium text-gray-700 mb-2">
                    Address
                  </label>
                  <input
                    type="text"
                    id="test_address"
                    value={test_address}
                    onChange={(e) => set_test_address(e.target.value)}
                    placeholder="123 Main Street, Dublin"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="test_postal_code" className="block text-sm font-medium text-gray-700 mb-2">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    id="test_postal_code"
                    value={test_postal_code}
                    onChange={(e) => set_test_postal_code(e.target.value)}
                    placeholder="D01 F5P2"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <button
                onClick={handle_validate_address}
                disabled={validate_address_mutation.isPending}
                className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {validate_address_mutation.isPending ? (
                  <span className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Validating...
                  </span>
                ) : (
                  'Validate Address'
                )}
              </button>

              {/* Validation Result */}
              {validation_result && (
                <div
                  className={`mt-4 p-4 rounded-lg border ${
                    validation_result.valid
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-start">
                    {validation_result.valid ? (
                      <Check className="h-5 w-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                    ) : (
                      <X className="h-5 w-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <h3
                        className={`font-semibold ${
                          validation_result.valid ? 'text-green-800' : 'text-red-800'
                        }`}
                      >
                        {validation_result.valid ? 'Valid Delivery Address' : 'Cannot Deliver to Address'}
                      </h3>
                      {validation_result.valid && (
                        <div className="mt-2 space-y-1 text-sm text-green-700">
                          {validation_result.delivery_fee !== undefined && (
                            <p>
                              <strong>Delivery Fee:</strong> €{Number(validation_result.delivery_fee).toFixed(2)}
                            </p>
                          )}
                          {validation_result.estimated_delivery_time !== undefined && (
                            <p>
                              <strong>Estimated Time:</strong> {validation_result.estimated_delivery_time} minutes
                            </p>
                          )}
                        </div>
                      )}
                      {!validation_result.valid && validation_result.message && (
                        <p className="mt-1 text-sm text-red-700">{validation_result.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Zone Form Modal */}
        {zone_form_open && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  {selected_zone ? 'Edit Delivery Zone' : 'Create New Delivery Zone'}
                </h2>
                <button
                  onClick={() => {
                    set_zone_form_open(false);
                    set_selected_zone(null);
                    reset_zone_form();
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handle_zone_form_submit} className="p-6 space-y-4">
                {/* Zone Name */}
                <div>
                  <label htmlFor="zone_name" className="block text-sm font-medium text-gray-700 mb-2">
                    Zone Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    id="zone_name"
                    required
                    value={zone_form_data.zone_name}
                    onChange={(e) =>
                      set_zone_form_data((prev) => ({ ...prev, zone_name: e.target.value }))
                    }
                    placeholder="e.g., Dublin City Centre"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Zone Type */}
                <div>
                  <label htmlFor="zone_type" className="block text-sm font-medium text-gray-700 mb-2">
                    Zone Type <span className="text-red-600">*</span>
                  </label>
                  <select
                    id="zone_type"
                    required
                    value={zone_form_data.zone_type}
                    onChange={(e) =>
                      set_zone_form_data((prev) => ({
                        ...prev,
                        zone_type: e.target.value as 'polygon' | 'radius' | 'postal_code',
                      }))
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="polygon">Polygon</option>
                    <option value="radius">Radius</option>
                    <option value="postal_code">Postal Code</option>
                  </select>
                </div>

                {/* Zone Boundaries */}
                <div>
                  <label htmlFor="zone_boundaries" className="block text-sm font-medium text-gray-700 mb-2">
                    Zone Boundaries (JSON) <span className="text-red-600">*</span>
                  </label>
                  <textarea
                    id="zone_boundaries"
                    required
                    value={zone_form_data.zone_boundaries}
                    onChange={(e) =>
                      set_zone_form_data((prev) => ({ ...prev, zone_boundaries: e.target.value }))
                    }
                    placeholder='{"center": {"lat": 53.35, "lng": -6.26}, "radius": 5}'
                    rows={6}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter zone boundaries as JSON. Example for radius: {`{"center": {"lat": 53.35, "lng": -6.26}, "radius": 5}`}
                  </p>
                </div>

                {/* Delivery Fee */}
                <div>
                  <label htmlFor="delivery_fee" className="block text-sm font-medium text-gray-700 mb-2">
                    Delivery Fee (€) <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="number"
                    id="delivery_fee"
                    required
                    value={zone_form_data.delivery_fee}
                    onChange={(e) =>
                      set_zone_form_data((prev) => ({ ...prev, delivery_fee: e.target.value }))
                    }
                    placeholder="e.g., 3.50"
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Minimum Order Value */}
                <div>
                  <label htmlFor="zone_minimum_order_value" className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Order Value (€)
                  </label>
                  <input
                    type="number"
                    id="zone_minimum_order_value"
                    value={zone_form_data.minimum_order_value}
                    onChange={(e) =>
                      set_zone_form_data((prev) => ({ ...prev, minimum_order_value: e.target.value }))
                    }
                    placeholder="e.g., 20.00"
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Estimated Delivery Time */}
                <div>
                  <label htmlFor="estimated_delivery_time" className="block text-sm font-medium text-gray-700 mb-2">
                    Estimated Delivery Time (minutes) <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="number"
                    id="estimated_delivery_time"
                    required
                    value={zone_form_data.estimated_delivery_time}
                    onChange={(e) =>
                      set_zone_form_data((prev) => ({ ...prev, estimated_delivery_time: e.target.value }))
                    }
                    placeholder="e.g., 30"
                    min="1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Priority */}
                <div>
                  <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-2">
                    Priority (for overlapping zones)
                  </label>
                  <input
                    type="number"
                    id="priority"
                    value={zone_form_data.priority}
                    onChange={(e) =>
                      set_zone_form_data((prev) => ({ ...prev, priority: e.target.value }))
                    }
                    placeholder="0"
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Higher priority zones take precedence</p>
                </div>

                {/* Active Toggle */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={zone_form_data.is_active}
                    onChange={(e) =>
                      set_zone_form_data((prev) => ({ ...prev, is_active: e.target.checked }))
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_active" className="ml-2 text-sm font-medium text-gray-700">
                    Active Zone (available for delivery)
                  </label>
                </div>

                {/* Form Actions */}
                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      set_zone_form_open(false);
                      set_selected_zone(null);
                      reset_zone_form();
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={create_zone_mutation.isPending || update_zone_mutation.isPending}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {(create_zone_mutation.isPending || update_zone_mutation.isPending) ? (
                      <span className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        {selected_zone ? 'Updating...' : 'Creating...'}
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <Save className="h-4 w-4 mr-2" />
                        {selected_zone ? 'Update Zone' : 'Create Zone'}
                      </span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {delete_confirm_zone_id && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center mb-4">
                <AlertCircle className="h-6 w-6 text-red-600 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900">Delete Delivery Zone</h2>
              </div>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this delivery zone? This action cannot be undone.
              </p>
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => set_delete_confirm_zone_id(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handle_delete_zone(delete_confirm_zone_id)}
                  disabled={delete_zone_mutation.isPending}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {delete_zone_mutation.isPending ? (
                    <span className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Deleting...
                    </span>
                  ) : (
                    'Delete Zone'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default UV_AdminDeliverySettings;