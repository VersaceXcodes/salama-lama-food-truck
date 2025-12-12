import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { CreditCard, Plus, Trash2, Check, AlertCircle } from 'lucide-react';

// ===========================
// Types & Interfaces
// ===========================

interface PaymentMethod {
  payment_method_id: string;
  user_id: string;
  card_type: 'Visa' | 'Mastercard' | 'Amex' | 'Discover';
  last_four_digits: string;
  expiry_month: string;
  expiry_year: string;
  cardholder_name: string;
  is_default: boolean;
  created_at: string;
}

interface PaymentMethodsResponse {
  payment_methods: PaymentMethod[];
}

interface AddPaymentMethodPayload {
  sumup_token: string;
  card_type: 'Visa' | 'Mastercard' | 'Amex' | 'Discover';
  last_four_digits: string;
  expiry_month: string;
  expiry_year: string;
  cardholder_name: string;
  is_default: boolean;
}

interface AddCardFormData {
  card_number: string;
  expiry_month: string;
  expiry_year: string;
  cvv: string;
  cardholder_name: string;
  is_default: boolean;
}

// ===========================
// API Functions
// ===========================

const fetchPaymentMethods = async (token: string): Promise<PaymentMethod[]> => {
  const response = await axios.get<PaymentMethodsResponse>(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/payment-methods`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data.payment_methods;
};

const addPaymentMethod = async (
  payload: AddPaymentMethodPayload,
  token: string
): Promise<PaymentMethod> => {
  const response = await axios.post<PaymentMethod>(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/payment-methods`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data;
};

const deletePaymentMethod = async (
  payment_method_id: string,
  token: string
): Promise<void> => {
  await axios.delete(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/payment-methods/${payment_method_id}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
};

const setDefaultPaymentMethod = async (
  payment_method_id: string,
  token: string
): Promise<PaymentMethod> => {
  const response = await axios.put<PaymentMethod>(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/payment-methods/${payment_method_id}/default`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};

// ===========================
// Helper Functions
// ===========================

const getCardTypeColor = (cardType: string): string => {
  switch (cardType) {
    case 'Visa':
      return 'bg-blue-600';
    case 'Mastercard':
      return 'bg-red-600';
    case 'Amex':
      return 'bg-green-600';
    case 'Discover':
      return 'bg-orange-600';
    default:
      return 'bg-gray-600';
  }
};

const formatMaskedCardNumber = (lastFour: string): string => {
  return `•••• •••• •••• ${lastFour}`;
};

const detectCardType = (cardNumber: string): 'Visa' | 'Mastercard' | 'Amex' | 'Discover' => {
  const cleaned = cardNumber.replace(/\s/g, '');
  if (cleaned.startsWith('4')) return 'Visa';
  if (/^5[1-5]/.test(cleaned)) return 'Mastercard';
  if (/^3[47]/.test(cleaned)) return 'Amex';
  if (cleaned.startsWith('6')) return 'Discover';
  return 'Visa'; // default
};

const generateSimulatedSumUpToken = (): string => {
  return `sumup_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// ===========================
// Main Component
// ===========================

const UV_SavedPaymentMethods: React.FC = () => {
  // Global state - CRITICAL: Individual selectors only
  const auth_token = useAppStore(state => state.authentication_state.auth_token);
  // const current_user = useAppStore(state => state.authentication_state.current_user);

  // Local state
  const [sumup_form_visible, setSumupFormVisible] = useState(false);
  const [selected_payment_method_id, setSelectedPaymentMethodId] = useState<string | null>(null);
  const [show_delete_confirmation, setShowDeleteConfirmation] = useState(false);
  const [error_message, setErrorMessage] = useState<string | null>(null);
  const [success_message, setSuccessMessage] = useState<string | null>(null);
  
  // Add card form state
  const [form_data, setFormData] = useState<AddCardFormData>({
    card_number: '',
    expiry_month: '',
    expiry_year: '',
    cvv: '',
    cardholder_name: '',
    is_default: false,
  });

  const queryClient = useQueryClient();

  // ===========================
  // Queries & Mutations
  // ===========================

  // Fetch payment methods
  const {
    data: payment_methods_list = [],
    isLoading: is_loading_methods,
    error: fetch_error,
  } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: () => fetchPaymentMethods(auth_token || ''),
    enabled: !!auth_token,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // Add payment method mutation
  const add_payment_mutation = useMutation({
    mutationFn: (payload: AddPaymentMethodPayload) =>
      addPaymentMethod(payload, auth_token || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      setSuccessMessage('Payment method added successfully!');
      setSumupFormVisible(false);
      setFormData({
        card_number: '',
        expiry_month: '',
        expiry_year: '',
        cvv: '',
        cardholder_name: '',
        is_default: false,
      });
      setTimeout(() => setSuccessMessage(null), 5000);
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to add payment method';
      setErrorMessage(message);
      setTimeout(() => setErrorMessage(null), 5000);
    },
  });

  // Delete payment method mutation
  const delete_payment_mutation = useMutation({
    mutationFn: (payment_method_id: string) =>
      deletePaymentMethod(payment_method_id, auth_token || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      setSuccessMessage('Payment method removed successfully!');
      setShowDeleteConfirmation(false);
      setSelectedPaymentMethodId(null);
      setTimeout(() => setSuccessMessage(null), 5000);
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to remove payment method';
      setErrorMessage(message);
      setShowDeleteConfirmation(false);
      setTimeout(() => setErrorMessage(null), 5000);
    },
  });

  // Set default payment method mutation
  const set_default_mutation = useMutation({
    mutationFn: (payment_method_id: string) =>
      setDefaultPaymentMethod(payment_method_id, auth_token || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      setSuccessMessage('Default payment method updated!');
      setTimeout(() => setSuccessMessage(null), 5000);
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to update default payment method';
      setErrorMessage(message);
      setTimeout(() => setErrorMessage(null), 5000);
    },
  });

  // ===========================
  // Event Handlers
  // ===========================

  const handleAddCard = () => {
    setSumupFormVisible(true);
    setErrorMessage(null);
  };

  const handleCancelAddCard = () => {
    setSumupFormVisible(false);
    setFormData({
      card_number: '',
      expiry_month: '',
      expiry_year: '',
      cvv: '',
      cardholder_name: '',
      is_default: false,
    });
    setErrorMessage(null);
  };

  const handleFormChange = (field: keyof AddCardFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrorMessage(null);
  };

  const handleSubmitAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation
    if (!form_data.card_number || form_data.card_number.replace(/\s/g, '').length < 13) {
      setErrorMessage('Please enter a valid card number');
      return;
    }
    if (!form_data.expiry_month || !form_data.expiry_year) {
      setErrorMessage('Please enter card expiry date');
      return;
    }
    if (!form_data.cvv || form_data.cvv.length < 3) {
      setErrorMessage('Please enter a valid CVV');
      return;
    }
    if (!form_data.cardholder_name.trim()) {
      setErrorMessage('Please enter cardholder name');
      return;
    }

    // Extract last 4 digits
    const cleaned_number = form_data.card_number.replace(/\s/g, '');
    const last_four = cleaned_number.slice(-4);
    const card_type = detectCardType(cleaned_number);

    // Simulated SumUp tokenization (in production, use actual SumUp SDK)
    const sumup_token = generateSimulatedSumUpToken();

    const payload: AddPaymentMethodPayload = {
      sumup_token,
      card_type,
      last_four_digits: last_four,
      expiry_month: form_data.expiry_month,
      expiry_year: form_data.expiry_year,
      cardholder_name: form_data.cardholder_name,
      is_default: form_data.is_default,
    };

    add_payment_mutation.mutate(payload);
  };

  const handleDeleteClick = (payment_method_id: string) => {
    // Check if it's the only card
    if (payment_methods_list.length === 1) {
      setErrorMessage('Cannot remove your only saved payment method');
      setTimeout(() => setErrorMessage(null), 5000);
      return;
    }

    setSelectedPaymentMethodId(payment_method_id);
    setShowDeleteConfirmation(true);
  };

  const handleConfirmDelete = () => {
    if (selected_payment_method_id) {
      delete_payment_mutation.mutate(selected_payment_method_id);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirmation(false);
    setSelectedPaymentMethodId(null);
  };

  const handleSetDefault = (payment_method_id: string) => {
    set_default_mutation.mutate(payment_method_id);
  };

  // ===========================
  // Render
  // ===========================

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Payment Methods</h1>
                <p className="mt-2 text-gray-600 leading-relaxed">
                  Manage your saved payment methods for faster checkout
                </p>
              </div>
              <Link
                to="/profile"
                className="text-gray-600 hover:text-gray-900 transition-colors duration-200 text-sm font-medium"
              >
                ← Back to Profile
              </Link>
            </div>
          </div>

          {/* Success Message */}
          {success_message && (
            <div className="mb-6 bg-green-50 border-2 border-green-200 text-green-800 px-6 py-4 rounded-xl flex items-start shadow-lg shadow-green-100">
              <Check className="size-5 mr-3 flex-shrink-0 mt-0.5" />
              <p className="font-medium">{success_message}</p>
            </div>
          )}

          {/* Error Message */}
          {error_message && (
            <div className="mb-6 bg-red-50 border-2 border-red-200 text-red-800 px-6 py-4 rounded-xl flex items-start shadow-lg shadow-red-100">
              <AlertCircle className="size-5 mr-3 flex-shrink-0 mt-0.5" />
              <p className="font-medium">{error_message}</p>
            </div>
          )}

          {/* Fetch Error */}
          {fetch_error && (
            <div className="mb-6 bg-red-50 border-2 border-red-200 text-red-800 px-6 py-4 rounded-xl">
              <p className="font-medium">Failed to load payment methods. Please try again.</p>
            </div>
          )}

          {/* Add Card Button (when no form visible) */}
          {!sumup_form_visible && (
            <div className="mb-8">
              <button
                onClick={handleAddCard}
                disabled={is_loading_methods}
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="size-5 mr-2" />
                Add New Card
              </button>
            </div>
          )}

          {/* Add Card Form */}
          {sumup_form_visible && (
            <div className="mb-8 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                <h2 className="text-xl font-semibold text-white">Add New Payment Method</h2>
                <p className="text-blue-100 text-sm mt-1">Enter your card details securely</p>
              </div>
              
              <form onSubmit={handleSubmitAddCard} className="p-6 space-y-6">
                {/* Card Number */}
                <div>
                  <label htmlFor="card_number" className="block text-sm font-medium text-gray-700 mb-2">
                    Card Number
                  </label>
                  <input
                    type="text"
                    id="card_number"
                    value={form_data.card_number}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      const formatted = value.match(/.{1,4}/g)?.join(' ') || value;
                      handleFormChange('card_number', formatted);
                    }}
                    placeholder="1234 5678 9012 3456"
                    maxLength={19}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200"
                    disabled={add_payment_mutation.isPending}
                  />
                </div>

                {/* Expiry & CVV Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="expiry_month" className="block text-sm font-medium text-gray-700 mb-2">
                      Expiry Month
                    </label>
                    <input
                      type="text"
                      id="expiry_month"
                      value={form_data.expiry_month}
                      onChange={(e) => handleFormChange('expiry_month', e.target.value.replace(/\D/g, '').slice(0, 2))}
                      placeholder="MM"
                      maxLength={2}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200"
                      disabled={add_payment_mutation.isPending}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="expiry_year" className="block text-sm font-medium text-gray-700 mb-2">
                      Expiry Year
                    </label>
                    <input
                      type="text"
                      id="expiry_year"
                      value={form_data.expiry_year}
                      onChange={(e) => handleFormChange('expiry_year', e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="YYYY"
                      maxLength={4}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200"
                      disabled={add_payment_mutation.isPending}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="cvv" className="block text-sm font-medium text-gray-700 mb-2">
                      CVV
                    </label>
                    <input
                      type="text"
                      id="cvv"
                      value={form_data.cvv}
                      onChange={(e) => handleFormChange('cvv', e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="123"
                      maxLength={4}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200"
                      disabled={add_payment_mutation.isPending}
                    />
                  </div>
                </div>

                {/* Cardholder Name */}
                <div>
                  <label htmlFor="cardholder_name" className="block text-sm font-medium text-gray-700 mb-2">
                    Cardholder Name
                  </label>
                  <input
                    type="text"
                    id="cardholder_name"
                    value={form_data.cardholder_name}
                    onChange={(e) => handleFormChange('cardholder_name', e.target.value)}
                    placeholder="John Smith"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200"
                    disabled={add_payment_mutation.isPending}
                  />
                </div>

                {/* Set as Default Checkbox */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_default"
                    checked={form_data.is_default}
                    onChange={(e) => handleFormChange('is_default', e.target.checked)}
                    className="size-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    disabled={add_payment_mutation.isPending}
                  />
                  <label htmlFor="is_default" className="ml-3 text-sm font-medium text-gray-700">
                    Set as default payment method
                  </label>
                </div>

                {/* Security Note */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-800 text-sm">
                    <strong>Secure Payment:</strong> Your card information is encrypted and tokenized. We never store your full card number or CVV.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={add_payment_mutation.isPending}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {add_payment_mutation.isPending ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Adding Card...
                      </span>
                    ) : (
                      'Add Card'
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={handleCancelAddCard}
                    disabled={add_payment_mutation.isPending}
                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 focus:outline-none focus:ring-4 focus:ring-gray-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Loading State */}
          {is_loading_methods && (
            <div className="space-y-6">
              {[1, 2].map((i) => (
                <div key={i} className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          )}

          {/* Payment Methods List */}
          {!is_loading_methods && payment_methods_list.length > 0 && (
            <div className="space-y-6">
              {payment_methods_list.map((method) => (
                <div
                  key={method.payment_method_id}
                  className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow duration-200"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      {/* Card Info */}
                      <div className="flex items-start space-x-4 flex-1">
                        <div className={`${getCardTypeColor(method.card_type)} text-white rounded-lg p-3 flex items-center justify-center shadow-lg`}>
                          <CreditCard className="size-6" />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {method.card_type}
                            </h3>
                            {method.is_default && (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                <Check className="size-3 mr-1" />
                                Default
                              </span>
                            )}
                          </div>
                          
                          <p className="text-gray-600 text-base font-mono mb-1">
                            {formatMaskedCardNumber(method.last_four_digits)}
                          </p>
                          
                          <p className="text-sm text-gray-500">
                            Expires {method.expiry_month}/{method.expiry_year.slice(-2)} • {method.cardholder_name}
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col gap-2 ml-4">
                        {!method.is_default && (
                          <button
                            onClick={() => handleSetDefault(method.payment_method_id)}
                            disabled={set_default_mutation.isPending}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 focus:outline-none focus:ring-4 focus:ring-gray-100 transition-all duration-200 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {set_default_mutation.isPending ? (
                              <span className="flex items-center">
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Setting...
                              </span>
                            ) : (
                              'Set as Default'
                            )}
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleDeleteClick(method.payment_method_id)}
                          disabled={delete_payment_mutation.isPending}
                          className="px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100 focus:outline-none focus:ring-4 focus:ring-red-100 transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="size-4 mr-2" />
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!is_loading_methods && payment_methods_list.length === 0 && !sumup_form_visible && (
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12 text-center">
              <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <CreditCard className="size-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No Payment Methods Saved
              </h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">
                Add your first payment method for faster checkout and a smoother ordering experience.
              </p>
              <button
                onClick={handleAddCard}
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <Plus className="size-5 mr-2" />
                Add Your First Card
              </button>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {show_delete_confirmation && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
                  <AlertCircle className="size-6 text-red-600" />
                </div>
                
                <h3 className="text-xl font-semibold text-gray-900 text-center mb-2">
                  Remove Payment Method?
                </h3>
                
                <p className="text-gray-600 text-center mb-6">
                  Are you sure you want to remove this payment method? This action cannot be undone.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={handleCancelDelete}
                    disabled={delete_payment_mutation.isPending}
                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 focus:outline-none focus:ring-4 focus:ring-gray-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  
                  <button
                    onClick={handleConfirmDelete}
                    disabled={delete_payment_mutation.isPending}
                    className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {delete_payment_mutation.isPending ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Removing...
                      </span>
                    ) : (
                      'Remove'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Security Info */}
          <div className="mt-12 bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h4 className="text-lg font-semibold text-blue-900 mb-3">
              Your Payment Security
            </h4>
            <ul className="space-y-2 text-blue-800 text-sm">
              <li className="flex items-start">
                <Check className="size-5 mr-2 flex-shrink-0 mt-0.5 text-blue-600" />
                <span>All payment data is encrypted using industry-standard SSL/TLS protocols</span>
              </li>
              <li className="flex items-start">
                <Check className="size-5 mr-2 flex-shrink-0 mt-0.5 text-blue-600" />
                <span>We never store your full card number or CVV - only secure tokens</span>
              </li>
              <li className="flex items-start">
                <Check className="size-5 mr-2 flex-shrink-0 mt-0.5 text-blue-600" />
                <span>CVV is required fresh for each transaction for your security</span>
              </li>
              <li className="flex items-start">
                <Check className="size-5 mr-2 flex-shrink-0 mt-0.5 text-blue-600" />
                <span>Payment processing powered by SumUp - PCI DSS Level 1 compliant</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_SavedPaymentMethods;