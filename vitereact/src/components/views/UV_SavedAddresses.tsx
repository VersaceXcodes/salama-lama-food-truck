import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { Home, Briefcase, MapPin, Edit2, Trash2, Check, Plus, X, AlertCircle } from 'lucide-react';

// ===========================
// Type Definitions (from Zod schemas)
// ===========================

interface Address {
  address_id: string;
  user_id: string;
  label: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  postal_code: string;
  delivery_instructions: string | null;
  is_default: boolean;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

interface AddressFormData {
  label: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  postal_code: string;
  delivery_instructions: string | null;
  is_default: boolean;
}

interface AddressesResponse {
  addresses: Address[];
}

// ===========================
// API Functions
// ===========================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const fetchAddresses = async (token: string): Promise<Address[]> => {
  const response = await axios.get<AddressesResponse>(
    `${API_BASE_URL}/api/addresses`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  return response.data.addresses;
};

const createAddress = async (data: AddressFormData, token: string): Promise<Address> => {
  const response = await axios.post<Address>(
    `${API_BASE_URL}/api/addresses`,
    data,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return response.data;
};

const updateAddress = async (
  addressId: string,
  data: AddressFormData,
  token: string
): Promise<Address> => {
  const response = await axios.put<Address>(
    `${API_BASE_URL}/api/addresses/${addressId}`,
    data,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return response.data;
};

const deleteAddress = async (addressId: string, token: string): Promise<void> => {
  await axios.delete(
    `${API_BASE_URL}/api/addresses/${addressId}`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );
};

const setDefaultAddress = async (addressId: string, token: string): Promise<Address> => {
  const response = await axios.put<Address>(
    `${API_BASE_URL}/api/addresses/${addressId}/default`,
    {},
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  return response.data;
};

// ===========================
// Main Component
// ===========================

const UV_SavedAddresses: React.FC = () => {
  // ===========================
  // Global State (Individual Selectors)
  // ===========================
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const authToken = useAppStore(state => state.authentication_state.auth_token);

  // ===========================
  // Local State
  // ===========================
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressFormData, setAddressFormData] = useState<AddressFormData>({
    label: '',
    address_line1: '',
    address_line2: null,
    city: 'Dublin',
    postal_code: '',
    delivery_instructions: null,
    is_default: false
  });
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // ===========================
  // React Query Setup
  // ===========================
  const queryClient = useQueryClient();

  // Fetch addresses
  const {
    data: addresses = [],
    isLoading,
    error: fetchError
  } = useQuery({
    queryKey: ['addresses', currentUser?.user_id],
    queryFn: () => fetchAddresses(authToken!),
    enabled: !!authToken && !!currentUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Create address mutation
  const createMutation = useMutation({
    mutationFn: (data: AddressFormData) => createAddress(data, authToken!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      setShowAddForm(false);
      resetForm();
      showSuccessMessage('Address added successfully!');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Failed to add address';
      setFormErrors({ submit: errorMessage });
    }
  });

  // Update address mutation
  const updateMutation = useMutation({
    mutationFn: ({ addressId, data }: { addressId: string; data: AddressFormData }) =>
      updateAddress(addressId, data, authToken!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      setEditingAddressId(null);
      resetForm();
      showSuccessMessage('Address updated successfully!');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Failed to update address';
      setFormErrors({ submit: errorMessage });
    }
  });

  // Delete address mutation
  const deleteMutation = useMutation({
    mutationFn: (addressId: string) => deleteAddress(addressId, authToken!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      setDeleteConfirmId(null);
      showSuccessMessage('Address deleted successfully!');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Failed to delete address';
      alert(errorMessage);
    }
  });

  // Set default address mutation
  const setDefaultMutation = useMutation({
    mutationFn: (addressId: string) => setDefaultAddress(addressId, authToken!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      showSuccessMessage('Default address updated!');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Failed to set default address';
      alert(errorMessage);
    }
  });

  // ===========================
  // Helper Functions
  // ===========================

  const resetForm = () => {
    setAddressFormData({
      label: '',
      address_line1: '',
      address_line2: null,
      city: 'Dublin',
      postal_code: '',
      delivery_instructions: null,
      is_default: false
    });
    setFormErrors({});
  };

  const showSuccessMessage = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (!addressFormData.label.trim()) {
      errors.label = 'Label is required';
    } else if (addressFormData.label.length > 50) {
      errors.label = 'Label must be 50 characters or less';
    }

    if (!addressFormData.address_line1.trim()) {
      errors.address_line1 = 'Address line 1 is required';
    } else if (addressFormData.address_line1.length > 255) {
      errors.address_line1 = 'Address must be 255 characters or less';
    }

    if (!addressFormData.city.trim()) {
      errors.city = 'City is required';
    }

    if (!addressFormData.postal_code.trim()) {
      errors.postal_code = 'Postal code is required';
    } else if (addressFormData.postal_code.length > 20) {
      errors.postal_code = 'Postal code must be 20 characters or less';
    }

    if (addressFormData.delivery_instructions && addressFormData.delivery_instructions.length > 500) {
      errors.delivery_instructions = 'Delivery instructions must be 500 characters or less';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    if (!validateForm()) {
      return;
    }

    if (editingAddressId) {
      updateMutation.mutate({
        addressId: editingAddressId,
        data: addressFormData
      });
    } else {
      createMutation.mutate(addressFormData);
    }
  };

  const handleEdit = (address: Address) => {
    setEditingAddressId(address.address_id);
    setAddressFormData({
      label: address.label,
      address_line1: address.address_line1,
      address_line2: address.address_line2,
      city: address.city,
      postal_code: address.postal_code,
      delivery_instructions: address.delivery_instructions,
      is_default: address.is_default
    });
    setShowAddForm(true);
    setFormErrors({});
  };

  const handleCancelForm = () => {
    setShowAddForm(false);
    setEditingAddressId(null);
    resetForm();
  };

  const handleDelete = (addressId: string) => {
    setDeleteConfirmId(addressId);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      deleteMutation.mutate(deleteConfirmId);
    }
  };

  const handleSetDefault = (addressId: string) => {
    setDefaultMutation.mutate(addressId);
  };

  const getLabelIcon = (label: string) => {
    const lowerLabel = label.toLowerCase();
    if (lowerLabel.includes('home')) return <Home className="w-5 h-5" />;
    if (lowerLabel.includes('work') || lowerLabel.includes('office')) return <Briefcase className="w-5 h-5" />;
    return <MapPin className="w-5 h-5" />;
  };

  // ===========================
  // Render Component
  // ===========================

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-yellow-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                  My Delivery Addresses
                </h1>
                <p className="text-gray-600 leading-relaxed">
                  Manage your saved delivery addresses for faster checkout
                </p>
              </div>
              {!showAddForm && (
                <button
                  onClick={() => {
                    setShowAddForm(true);
                    setEditingAddressId(null);
                    resetForm();
                  }}
                  className="inline-flex items-center justify-center px-6 py-3 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-4 focus:ring-orange-100 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add New Address
                </button>
              )}
            </div>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center">
                <Check className="w-5 h-5 text-green-600 mr-3" />
                <p className="text-green-800 font-medium">{successMessage}</p>
              </div>
              <button
                onClick={() => setSuccessMessage(null)}
                className="text-green-600 hover:text-green-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Error Message */}
          {fetchError && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-red-800 font-medium">Error loading addresses</p>
                <p className="text-red-700 text-sm mt-1">
                  {(fetchError as any).message || 'Please try again later'}
                </p>
              </div>
            </div>
          )}

          {/* Add/Edit Address Form */}
          {showAddForm && (
            <div className="mb-8 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-orange-500 to-yellow-500 px-6 py-4">
                <h2 className="text-xl font-semibold text-white">
                  {editingAddressId ? 'Edit Address' : 'Add New Address'}
                </h2>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {formErrors.submit && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
                    <AlertCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
                    <p className="text-red-800 text-sm">{formErrors.submit}</p>
                  </div>
                )}

                {/* Label */}
                <div>
                  <label htmlFor="label" className="block text-sm font-medium text-gray-900 mb-2">
                    Label <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    id="label"
                    value={addressFormData.label}
                    onChange={(e) => {
                      setAddressFormData(prev => ({ ...prev, label: e.target.value }));
                      if (formErrors.label) {
                        setFormErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.label;
                          return newErrors;
                        });
                      }
                    }}
                    placeholder="e.g., Home, Work, Office"
                    className={`w-full px-4 py-3 border-2 ${
                      formErrors.label ? 'border-red-300' : 'border-gray-200'
                    } rounded-lg focus:outline-none focus:ring-4 focus:ring-orange-100 focus:border-orange-500 transition-all duration-200`}
                  />
                  {formErrors.label && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {formErrors.label}
                    </p>
                  )}
                </div>

                {/* Address Line 1 */}
                <div>
                  <label htmlFor="address_line1" className="block text-sm font-medium text-gray-900 mb-2">
                    Address Line 1 <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    id="address_line1"
                    value={addressFormData.address_line1}
                    onChange={(e) => {
                      setAddressFormData(prev => ({ ...prev, address_line1: e.target.value }));
                      if (formErrors.address_line1) {
                        setFormErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.address_line1;
                          return newErrors;
                        });
                      }
                    }}
                    placeholder="Street address, building number"
                    className={`w-full px-4 py-3 border-2 ${
                      formErrors.address_line1 ? 'border-red-300' : 'border-gray-200'
                    } rounded-lg focus:outline-none focus:ring-4 focus:ring-orange-100 focus:border-orange-500 transition-all duration-200`}
                  />
                  {formErrors.address_line1 && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {formErrors.address_line1}
                    </p>
                  )}
                </div>

                {/* Address Line 2 */}
                <div>
                  <label htmlFor="address_line2" className="block text-sm font-medium text-gray-900 mb-2">
                    Address Line 2 (Optional)
                  </label>
                  <input
                    type="text"
                    id="address_line2"
                    value={addressFormData.address_line2 || ''}
                    onChange={(e) =>
                      setAddressFormData(prev => ({
                        ...prev,
                        address_line2: e.target.value || null
                      }))
                    }
                    placeholder="Apartment, suite, floor (optional)"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-orange-100 focus:border-orange-500 transition-all duration-200"
                  />
                </div>

                {/* City and Postal Code */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="city" className="block text-sm font-medium text-gray-900 mb-2">
                      City <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      id="city"
                      value={addressFormData.city}
                      onChange={(e) => {
                        setAddressFormData(prev => ({ ...prev, city: e.target.value }));
                        if (formErrors.city) {
                          setFormErrors(prev => {
                            const newErrors = { ...prev };
                            delete newErrors.city;
                            return newErrors;
                          });
                        }
                      }}
                      placeholder="Dublin"
                      className={`w-full px-4 py-3 border-2 ${
                        formErrors.city ? 'border-red-300' : 'border-gray-200'
                      } rounded-lg focus:outline-none focus:ring-4 focus:ring-orange-100 focus:border-orange-500 transition-all duration-200`}
                    />
                    {formErrors.city && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {formErrors.city}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="postal_code" className="block text-sm font-medium text-gray-900 mb-2">
                      Postal Code (Eircode) <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      id="postal_code"
                      value={addressFormData.postal_code}
                      onChange={(e) => {
                        setAddressFormData(prev => ({ ...prev, postal_code: e.target.value }));
                        if (formErrors.postal_code) {
                          setFormErrors(prev => {
                            const newErrors = { ...prev };
                            delete newErrors.postal_code;
                            return newErrors;
                          });
                        }
                      }}
                      placeholder="D02 X285"
                      className={`w-full px-4 py-3 border-2 ${
                        formErrors.postal_code ? 'border-red-300' : 'border-gray-200'
                      } rounded-lg focus:outline-none focus:ring-4 focus:ring-orange-100 focus:border-orange-500 transition-all duration-200`}
                    />
                    {formErrors.postal_code && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {formErrors.postal_code}
                      </p>
                    )}
                  </div>
                </div>

                {/* Delivery Instructions */}
                <div>
                  <label htmlFor="delivery_instructions" className="block text-sm font-medium text-gray-900 mb-2">
                    Delivery Instructions (Optional)
                  </label>
                  <textarea
                    id="delivery_instructions"
                    value={addressFormData.delivery_instructions || ''}
                    onChange={(e) =>
                      setAddressFormData(prev => ({
                        ...prev,
                        delivery_instructions: e.target.value || null
                      }))
                    }
                    placeholder="Gate code, buzzer number, or special instructions..."
                    rows={3}
                    className={`w-full px-4 py-3 border-2 ${
                      formErrors.delivery_instructions ? 'border-red-300' : 'border-gray-200'
                    } rounded-lg focus:outline-none focus:ring-4 focus:ring-orange-100 focus:border-orange-500 transition-all duration-200 resize-none`}
                  />
                  {formErrors.delivery_instructions && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {formErrors.delivery_instructions}
                    </p>
                  )}
                </div>

                {/* Set as Default */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_default"
                    checked={addressFormData.is_default}
                    onChange={(e) =>
                      setAddressFormData(prev => ({ ...prev, is_default: e.target.checked }))
                    }
                    className="w-5 h-5 text-orange-600 border-gray-300 rounded focus:ring-4 focus:ring-orange-100"
                  />
                  <label htmlFor="is_default" className="ml-3 text-gray-900 font-medium">
                    Set as default address
                  </label>
                </div>

                {/* Form Actions */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="flex-1 sm:flex-none px-8 py-3 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-4 focus:ring-orange-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    {createMutation.isPending || updateMutation.isPending ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {editingAddressId ? 'Updating...' : 'Saving...'}
                      </span>
                    ) : (
                      editingAddressId ? 'Update Address' : 'Save Address'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelForm}
                    className="flex-1 sm:flex-none px-8 py-3 bg-gray-100 text-gray-900 font-medium rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-4 focus:ring-gray-100 transition-all duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <svg className="animate-spin h-12 w-12 text-orange-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-gray-600 font-medium">Loading addresses...</p>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !showAddForm && addresses.length === 0 && (
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-12 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <MapPin className="w-12 h-12 text-orange-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  No Addresses Yet
                </h3>
                <p className="text-gray-600 leading-relaxed mb-6">
                  You haven't added any delivery addresses yet. Add your first address to enable delivery orders.
                </p>
                <button
                  onClick={() => {
                    setShowAddForm(true);
                    setEditingAddressId(null);
                    resetForm();
                  }}
                  className="inline-flex items-center px-6 py-3 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-4 focus:ring-orange-100 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add Your First Address
                </button>
              </div>
            </div>
          )}

          {/* Addresses Grid */}
          {!isLoading && addresses.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {addresses.map((address) => (
                <div
                  key={address.address_id}
                  className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-200"
                >
                  {/* Card Header */}
                  <div className={`px-6 py-4 ${
                    address.is_default
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                      : 'bg-gradient-to-r from-gray-100 to-gray-50'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${
                          address.is_default ? 'bg-white/20' : 'bg-white'
                        }`}>
                          <span className={address.is_default ? 'text-white' : 'text-gray-700'}>
                            {getLabelIcon(address.label)}
                          </span>
                        </div>
                        <div>
                          <h3 className={`font-semibold ${
                            address.is_default ? 'text-white' : 'text-gray-900'
                          }`}>
                            {address.label}
                          </h3>
                          {address.is_default && (
                            <span className="text-xs text-white/90 flex items-center mt-1">
                              <Check className="w-3 h-3 mr-1" />
                              Default Address
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-6 space-y-4">
                    <div>
                      <p className="text-gray-900 font-medium leading-relaxed">
                        {address.address_line1}
                      </p>
                      {address.address_line2 && (
                        <p className="text-gray-700 leading-relaxed">{address.address_line2}</p>
                      )}
                      <p className="text-gray-700 leading-relaxed">
                        {address.city}, {address.postal_code}
                      </p>
                    </div>

                    {address.delivery_instructions && (
                      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                        <p className="text-sm text-blue-800">
                          <span className="font-medium">Instructions:</span> {address.delivery_instructions}
                        </p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100">
                      {!address.is_default && (
                        <button
                          onClick={() => handleSetDefault(address.address_id)}
                          disabled={setDefaultMutation.isPending}
                          className="flex-1 px-4 py-2 bg-green-50 text-green-700 font-medium rounded-lg hover:bg-green-100 focus:outline-none focus:ring-4 focus:ring-green-100 transition-all duration-200 text-sm disabled:opacity-50"
                        >
                          Set as Default
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(address)}
                        className="px-4 py-2 bg-blue-50 text-blue-700 font-medium rounded-lg hover:bg-blue-100 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all duration-200 text-sm flex items-center"
                      >
                        <Edit2 className="w-4 h-4 mr-1" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(address.address_id)}
                        className="px-4 py-2 bg-red-50 text-red-700 font-medium rounded-lg hover:bg-red-100 focus:outline-none focus:ring-4 focus:ring-red-100 transition-all duration-200 text-sm flex items-center"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {deleteConfirmId && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                <div className="flex items-start mb-4">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Address?</h3>
                    <p className="text-gray-600 leading-relaxed">
                      Are you sure you want to delete this address? This action cannot be undone.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setDeleteConfirmId(null)}
                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-900 font-medium rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-4 focus:ring-gray-100 transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    disabled={deleteMutation.isPending}
                    className="flex-1 px-4 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default UV_SavedAddresses;