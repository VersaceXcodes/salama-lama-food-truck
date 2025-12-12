import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { CreditCard, Lock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

// ===========================
// Type Definitions
// ===========================

interface SavedPaymentMethod {
  payment_method_id: string;
  card_type: 'Visa' | 'Mastercard' | 'Amex' | 'Discover';
  last_four_digits: string;
  expiry_month: string;
  expiry_year: string;
  is_default: boolean;
}

interface NewCardFormData {
  sumup_token: string;
  card_type: string;
  last_four_digits: string;
  expiry_month: string;
  expiry_year: string;
  cardholder_name: string;
}

interface PaymentValidationError {
  field: string;
  message: string;
}

// ===========================
// API Functions
// ===========================

const fetchPaymentMethods = async (token: string): Promise<SavedPaymentMethod[]> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/payment-methods`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data.payment_methods || [];
};

const savePaymentMethod = async (
  token: string,
  data: NewCardFormData & { is_default: boolean }
): Promise<SavedPaymentMethod> => {
  const response = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/payment-methods`,
    data,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data;
};

// ===========================
// Main Component
// ===========================

const UV_CheckoutPayment: React.FC = () => {
  const navigate = useNavigate();

  // Zustand Store - Individual selectors (CRITICAL: No object destructuring)
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const currentUser = useAppStore(state => state.authentication_state.current_user);

  // Local State
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string | null>(null);
  const [cvvInput, setCvvInput] = useState<string>('');
  const [paymentMethodType, setPaymentMethodType] = useState<'card' | 'cash'>('card');
  const [showNewCardForm, setShowNewCardForm] = useState<boolean>(false);
  const [saveCardForFuture, setSaveCardForFuture] = useState<boolean>(false);
  const [newCardFormData, setNewCardFormData] = useState<NewCardFormData>({
    sumup_token: '',
    card_type: '',
    last_four_digits: '',
    expiry_month: '',
    expiry_year: '',
    cardholder_name: '',
  });
  const [paymentValidationErrors, setPaymentValidationErrors] = useState<PaymentValidationError[]>([]);
  const [isSumUpTokenizing, setIsSumUpTokenizing] = useState<boolean>(false);

  // Fetch cart data with computed totals
  const {
    data: cartData,
    isLoading: isCartLoading,
  } = useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/cart`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
      return response.data;
    },
    enabled: !!authToken,
    staleTime: 30000,
  });

  // Extract cart values with safe defaults
  const cartTotal = Number(cartData?.total || 0);
  const cartSubtotal = Number(cartData?.subtotal || 0);
  const cartDiscountAmount = Number(cartData?.discount_amount || 0);
  const cartDeliveryFee = Number(cartData?.delivery_fee || 0);
  const cartTaxAmount = Number(cartData?.tax_amount || 0);
  const cartItems = cartData?.items || [];

  // Fetch saved payment methods
  const {
    data: savedPaymentMethods = [],
    isLoading: loadingPaymentMethods,
  } = useQuery({
    queryKey: ['payment-methods', currentUser?.user_id],
    queryFn: () => fetchPaymentMethods(authToken!),
    enabled: !!authToken && !!currentUser,
    staleTime: 5 * 60 * 1000,
  });

  // Save new payment method mutation
  const savePaymentMethodMutation = useMutation({
    mutationFn: (data: NewCardFormData & { is_default: boolean }) =>
      savePaymentMethod(authToken!, data),
    onSuccess: (newMethod) => {
      // Select the newly saved card
      setSelectedPaymentMethodId(newMethod.payment_method_id);
      setShowNewCardForm(false);
      setNewCardFormData({
        sumup_token: '',
        card_type: '',
        last_four_digits: '',
        expiry_month: '',
        expiry_year: '',
        cardholder_name: '',
      });
      setCvvInput('');
      setPaymentValidationErrors([]);
    },
    onError: (error: any) => {
      setPaymentValidationErrors([
        {
          field: 'general',
          message: error.response?.data?.message || 'Failed to save payment method',
        },
      ]);
    },
  });

  // Get order type from checkout state (would be stored in global state in real app)
  // For this demo, we'll check if there's a delivery fee to determine order type
  const orderType = cartDeliveryFee > 0 ? 'delivery' : 'collection';

  // Auto-select default payment method on load
  useEffect(() => {
    if (savedPaymentMethods.length > 0 && !selectedPaymentMethodId) {
      const defaultMethod = savedPaymentMethods.find(method => method.is_default);
      if (defaultMethod) {
        setSelectedPaymentMethodId(defaultMethod.payment_method_id);
      }
    }
  }, [savedPaymentMethods, selectedPaymentMethodId]);

  // ===========================
  // Validation Functions
  // ===========================

  const validateCVV = (cvv: string): boolean => {
    return /^\d{3,4}$/.test(cvv);
  };

  const validatePaymentSelection = (): boolean => {
    const errors: PaymentValidationError[] = [];

    if (paymentMethodType === 'card') {
      if (!selectedPaymentMethodId && !showNewCardForm) {
        errors.push({
          field: 'payment_method',
          message: 'Please select a payment method or add a new card',
        });
      }

      if (selectedPaymentMethodId && !showNewCardForm) {
        if (!cvvInput || !validateCVV(cvvInput)) {
          errors.push({
            field: 'cvv',
            message: 'Please enter a valid CVV (3-4 digits)',
          });
        }
      }

      if (showNewCardForm) {
        if (!newCardFormData.sumup_token) {
          errors.push({
            field: 'new_card',
            message: 'Please complete the card information',
          });
        }
      }
    }

    setPaymentValidationErrors(errors);
    return errors.length === 0;
  };

  // ===========================
  // Event Handlers
  // ===========================

  const handleSelectSavedCard = (methodId: string) => {
    setSelectedPaymentMethodId(methodId);
    setShowNewCardForm(false);
    setPaymentMethodType('card');
    setCvvInput('');
    setPaymentValidationErrors([]);
  };

  const handleSelectNewCard = () => {
    setShowNewCardForm(true);
    setSelectedPaymentMethodId(null);
    setPaymentMethodType('card');
    setCvvInput('');
    setPaymentValidationErrors([]);
  };

  const handleSelectCash = () => {
    setPaymentMethodType('cash');
    setSelectedPaymentMethodId(null);
    setShowNewCardForm(false);
    setCvvInput('');
    setPaymentValidationErrors([]);
  };

  const handleCVVChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setCvvInput(value);
    // Clear CVV error when user types
    setPaymentValidationErrors(prev => prev.filter(err => err.field !== 'cvv'));
  };

  // Simulated SumUp tokenization (in real app, this would use SumUp SDK)
  const handleSumUpTokenization = async () => {
    setIsSumUpTokenizing(true);
    setPaymentValidationErrors([]);

    try {
      // Simulate SumUp SDK tokenization
      // In real implementation, this would call SumUp.Card.tokenize() or similar
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Simulated tokenization result
      const simulatedToken = `sumup_tok_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const simulatedCardData: NewCardFormData = {
        sumup_token: simulatedToken,
        card_type: 'Visa', // Would come from SumUp
        last_four_digits: '4242', // Would come from SumUp
        expiry_month: '12', // Would come from SumUp
        expiry_year: '2025', // Would come from SumUp
        cardholder_name: 'John Doe', // Would come from SumUp
      };

      setNewCardFormData(simulatedCardData);

      // If save card is checked, save to backend
      if (saveCardForFuture) {
        savePaymentMethodMutation.mutate({
          ...simulatedCardData,
          is_default: savedPaymentMethods.length === 0, // Make default if it's the first card
        });
      } else {
        // Use the tokenized card for this transaction only
        setSelectedPaymentMethodId('new_card_temp');
      }
    } catch {
      setPaymentValidationErrors([
        {
          field: 'new_card',
          message: 'Failed to process card details. Please try again.',
        },
      ]);
    } finally {
      setIsSumUpTokenizing(false);
    }
  };

  const handleContinueToReview = () => {
    if (!validatePaymentSelection()) {
      return;
    }

    // In real app, payment method details would be stored in global checkout state
    // For now, we'll just navigate to review page
    // The actual payment processing happens on final order submission
    navigate('/checkout/review');
  };

  const handleBackToContact = () => {
    navigate('/checkout/contact');
  };

  // ===========================
  // Helper Functions
  // ===========================

  // Removed unused function getCardBrandIcon - can be re-added if needed in future

  const getErrorMessage = (field: string): string | undefined => {
    return paymentValidationErrors.find(err => err.field === field)?.message;
  };

  // ===========================
  // Render
  // ===========================

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Checkout Progress */}
          <div className="mb-8">
            <div className="flex items-center justify-center space-x-4">
              <div className="flex items-center">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-600 text-white text-sm font-semibold">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <span className="ml-2 text-sm font-medium text-gray-900">Order Type</span>
              </div>
              <div className="h-0.5 w-12 bg-green-600"></div>
              <div className="flex items-center">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-600 text-white text-sm font-semibold">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <span className="ml-2 text-sm font-medium text-gray-900">Contact</span>
              </div>
              <div className="h-0.5 w-12 bg-green-600"></div>
              <div className="flex items-center">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-semibold">
                  3
                </div>
                <span className="ml-2 text-sm font-medium text-blue-600">Payment</span>
              </div>
              <div className="h-0.5 w-12 bg-gray-300"></div>
              <div className="flex items-center">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-300 text-gray-600 text-sm font-semibold">
                  4
                </div>
                <span className="ml-2 text-sm font-medium text-gray-500">Review</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Payment Section */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-8">
                  <h1 className="text-3xl font-bold text-white">Payment Method</h1>
                  <p className="mt-2 text-blue-100">
                    Select your payment method to complete your order
                  </p>
                </div>

                <div className="p-6 space-y-6">
                  {/* General Error Messages */}
                  {getErrorMessage('general') && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
                      <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-800">{getErrorMessage('general')}</p>
                      </div>
                    </div>
                  )}

                   {/* Loading State */}
                  {(loadingPaymentMethods || isCartLoading) && (
                    <div className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
                      <p className="mt-4 text-gray-600">Loading...</p>
                    </div>
                  )}

                  {/* Payment Methods */}
                  {!loadingPaymentMethods && !isCartLoading && (
                    <>
                      {/* Saved Payment Methods */}
                      {savedPaymentMethods.length > 0 && (
                        <div className="space-y-4">
                          <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                            <Lock className="h-5 w-5 text-gray-600" />
                            <span>Saved Payment Methods</span>
                          </h2>

                          {savedPaymentMethods.map((method) => (
                            <div
                              key={method.payment_method_id}
                              onClick={() => handleSelectSavedCard(method.payment_method_id)}
                              className={`border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                                selectedPaymentMethodId === method.payment_method_id && !showNewCardForm
                                  ? 'border-blue-600 bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300 bg-white'
                              }`}
                            >
                              <div className="flex items-center space-x-4">
                                <input
                                  type="radio"
                                  name="payment_method"
                                  checked={selectedPaymentMethodId === method.payment_method_id && !showNewCardForm}
                                  onChange={() => handleSelectSavedCard(method.payment_method_id)}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                />
                                <div className="flex-shrink-0">
                                  <CreditCard className="h-6 w-6 text-gray-600" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2">
                                    <span className="font-medium text-gray-900">
                                      {method.card_type} •••• {method.last_four_digits}
                                    </span>
                                    {method.is_default && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                        Default
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-500">
                                    Expires {method.expiry_month}/{method.expiry_year}
                                  </p>
                                </div>
                              </div>

                              {/* CVV Input for Selected Card */}
                              {selectedPaymentMethodId === method.payment_method_id && !showNewCardForm && (
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                  <label htmlFor="cvv" className="block text-sm font-medium text-gray-700 mb-2">
                                    CVV / Security Code *
                                  </label>
                                  <div className="flex items-center space-x-3">
                                    <input
                                      type="text"
                                      id="cvv"
                                      value={cvvInput}
                                      onChange={handleCVVChange}
                                      maxLength={4}
                                      placeholder="123"
                                      className={`block w-24 px-4 py-2 border-2 rounded-lg focus:ring-4 focus:ring-blue-100 focus:outline-none transition-all ${
                                        getErrorMessage('cvv')
                                          ? 'border-red-300 focus:border-red-500'
                                          : 'border-gray-200 focus:border-blue-500'
                                      }`}
                                    />
                                    <Lock className="h-5 w-5 text-gray-400" />
                                    <span className="text-xs text-gray-500">3-4 digits on back of card</span>
                                  </div>
                                  {getErrorMessage('cvv') && (
                                    <p className="mt-2 text-sm text-red-600">{getErrorMessage('cvv')}</p>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add New Card Option */}
                      <div className="space-y-4">
                        {savedPaymentMethods.length > 0 && (
                          <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                              <div className="w-full border-t border-gray-300"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                              <span className="px-4 bg-white text-gray-500">Or</span>
                            </div>
                          </div>
                        )}

                        <div
                          onClick={handleSelectNewCard}
                          className={`border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                            showNewCardForm
                              ? 'border-blue-600 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center space-x-4">
                            <input
                              type="radio"
                              name="payment_method"
                              checked={showNewCardForm}
                              onChange={handleSelectNewCard}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                            />
                            <CreditCard className="h-6 w-6 text-gray-600" />
                            <div>
                              <span className="font-medium text-gray-900">Add New Card</span>
                              <p className="text-sm text-gray-500">Pay with a new credit or debit card</p>
                            </div>
                          </div>

                          {/* New Card Form */}
                          {showNewCardForm && (
                            <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-start space-x-3">
                                  <Lock className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-blue-900">
                                      Secure Payment Processing
                                    </p>
                                    <p className="text-sm text-blue-700 mt-1">
                                      Your card details are encrypted and processed securely through SumUp. We never store your full card number or CVV.
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* SumUp Card Form Placeholder */}
                              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8">
                                <div className="text-center space-y-4">
                                  <CreditCard className="h-12 w-12 text-gray-400 mx-auto" />
                                  <div>
                                    <p className="text-sm font-medium text-gray-700">SumUp Payment Form</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      Secure card entry would appear here
                                    </p>
                                  </div>
                                  
                                  {/* Demo: Simulate tokenization */}
                                  {!newCardFormData.sumup_token && (
                                    <button
                                      type="button"
                                      onClick={handleSumUpTokenization}
                                      disabled={isSumUpTokenizing}
                                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                      {isSumUpTokenizing ? (
                                        <>
                                          <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                                          Processing...
                                        </>
                                      ) : (
                                        <>
                                          Demo: Enter Card Details
                                        </>
                                      )}
                                    </button>
                                  )}

                                  {newCardFormData.sumup_token && (
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                      <div className="flex items-center justify-center space-x-2">
                                        <CheckCircle className="h-5 w-5 text-green-600" />
                                        <span className="text-sm font-medium text-green-800">
                                          Card details validated
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Save Card Checkbox */}
                              <div className="flex items-start space-x-3 pt-2">
                                <input
                                  type="checkbox"
                                  id="save_card"
                                  checked={saveCardForFuture}
                                  onChange={(e) => setSaveCardForFuture(e.target.checked)}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5"
                                />
                                <label htmlFor="save_card" className="text-sm text-gray-700">
                                  Save this card for future orders (secure and encrypted)
                                </label>
                              </div>

                              {getErrorMessage('new_card') && (
                                <p className="text-sm text-red-600">{getErrorMessage('new_card')}</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Cash on Collection Option */}
                      {orderType === 'collection' && (
                        <>
                          <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                              <div className="w-full border-t border-gray-300"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                              <span className="px-4 bg-white text-gray-500">Or</span>
                            </div>
                          </div>

                          <div
                            onClick={handleSelectCash}
                            className={`border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                              paymentMethodType === 'cash'
                                ? 'border-blue-600 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300 bg-white'
                            }`}
                          >
                            <div className="flex items-center space-x-4">
                              <input
                                type="radio"
                                name="payment_method"
                                checked={paymentMethodType === 'cash'}
                                onChange={handleSelectCash}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                              />
                              <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                <span className="text-2xl">💵</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-900">Pay with Cash at Pickup</span>
                                <p className="text-sm text-gray-500">Pay when you collect your order</p>
                              </div>
                            </div>
                          </div>
                        </>
                      )}

                      {/* Payment Method Error */}
                      {getErrorMessage('payment_method') && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <p className="text-sm text-red-600">{getErrorMessage('payment_method')}</p>
                        </div>
                      )}
                    </>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={handleBackToContact}
                      className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-gray-100 transition-all"
                    >
                      ← Back
                    </button>

                    <button
                      type="button"
                      onClick={handleContinueToReview}
                      disabled={loadingPaymentMethods || isCartLoading || savePaymentMethodMutation.isPending || cartTotal <= 0}
                      className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                    >
                      {savePaymentMethodMutation.isPending ? (
                        <>
                          <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                          Saving...
                        </>
                      ) : (
                        <>
                          Continue to Review →
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Security Notice */}
              <div className="mt-6 bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-start space-x-3">
                  <Lock className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Secure Payment</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Your payment information is encrypted and secure. We use industry-standard security measures to protect your data.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Summary Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden sticky top-8">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Order Summary</h2>
                </div>

                <div className="p-6 space-y-4">
                  {/* Cart Items */}
                  <div className="space-y-3">
                    {cartItems.map((item) => (
                      <div key={item.item_id} className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {item.quantity}x {item.item_name}
                          </p>
                          {item.customizations && item.customizations.length > 0 && (
                            <p className="text-xs text-gray-500 mt-1">
                              {item.customizations.map(c => c.option_name).join(', ')}
                            </p>
                          )}
                        </div>
                        <span className="text-sm font-medium text-gray-900 ml-4">
                          €{Number(item.line_total || 0).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-gray-200 pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="font-medium text-gray-900">€{Number(cartSubtotal || 0).toFixed(2)}</span>
                    </div>

                    {cartDiscountAmount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-green-600">Discount</span>
                        <span className="font-medium text-green-600">-€{Number(cartDiscountAmount || 0).toFixed(2)}</span>
                      </div>
                    )}

                    {cartDeliveryFee > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Delivery Fee</span>
                        <span className="font-medium text-gray-900">€{Number(cartDeliveryFee || 0).toFixed(2)}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tax</span>
                      <span className="font-medium text-gray-900">€{Number(cartTaxAmount || 0).toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="border-t-2 border-gray-200 pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-gray-900">Total</span>
                      <span className="text-2xl font-bold text-blue-600">€{Number(cartTotal || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_CheckoutPayment;