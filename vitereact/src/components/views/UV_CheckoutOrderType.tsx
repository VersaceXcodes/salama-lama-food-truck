import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { MapPin, Clock, Plus, X, AlertCircle, Check, ChevronRight } from 'lucide-react';
import CollectionTimePicker from '@/components/checkout/CollectionTimePicker';
import { calculateCartTotals, parseCartData, logCartTotals, getGuestCartId } from '@/utils/cartTotals';
import OrderSummary from '@/components/checkout/OrderSummary';

// ===========================
// Type Definitions
// ===========================

interface TimeSlot {
  slot_time: string;
  is_available: boolean;
  capacity_remaining: number;
}

interface SavedAddress {
  address_id: string;
  label: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  postal_code: string;
  is_default: boolean;
  delivery_instructions: string | null;
}

interface DeliveryCalculation {
  is_valid: boolean;
  delivery_fee: number;
  estimated_time: string | null;
  zone_name: string | null;
  error_message: string | null;
}

interface AddressFormState {
  is_open: boolean;
  address_line1: string;
  address_line2: string;
  city: string;
  postal_code: string;
  delivery_instructions: string;
  label: string;
}

// ===========================
// API Configuration
// ===========================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// ===========================
// Main Component
// ===========================

const UV_CheckoutOrderType: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // ===========================
  // Global State (Individual Selectors)
  // ===========================

  // const currentUser = useAppStore(state => state.authentication_state.current_user);
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const deliveryEnabled = useAppStore(state => state.business_settings.delivery_enabled);
  // const operatingHours = useAppStore(state => state.business_settings.operating_hours);
  const updateCartFees = useAppStore(state => state.update_cart_fees);

  // ===========================
  // Local State
  // ===========================

  const [orderType, setOrderType] = useState<'collection' | 'delivery' | null>(null);
  const [collectionTimeSlot, setCollectionTimeSlot] = useState<string | null>(null);
  const [deliveryAddressId, setDeliveryAddressId] = useState<string | null>(null);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<TimeSlot[]>([]);
  const [deliveryCalculation, setDeliveryCalculation] = useState<DeliveryCalculation>({
    is_valid: false,
    delivery_fee: 0,
    estimated_time: null,
    zone_name: null,
    error_message: null,
  });
  const [addressForm, setAddressForm] = useState<AddressFormState>({
    is_open: false,
    address_line1: '',
    address_line2: '',
    city: 'Dublin',
    postal_code: '',
    delivery_instructions: '',
    label: '',
  });
  const [loadingStates, setLoadingStates] = useState({
    time_slots_loading: false,
    addresses_loading: false,
    delivery_validating: false,
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ===========================
  // Fetch Saved Addresses
  // ===========================

  const { data: addressesData } = useQuery({
    queryKey: ['addresses'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/addresses`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      return response.data;
    },
    enabled: !!authToken && orderType === 'delivery',
    staleTime: 60000,
    refetchOnWindowFocus: false,
    select: (data) => {
      return data.addresses || [];
    },
  });

  const savedAddresses = addressesData || [];

  // ===========================
  // Fetch Cart Data (React Query)
  // ===========================

  const { data: cartData } = useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/cart`, {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      });
      return response.data;
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
    retry: 1
  });

  const cartItems = cartData?.items || [];
  
  // Calculate totals using shared utility
  const cartTotals = calculateCartTotals(parseCartData(cartData));
  
  // Get guest cart ID for tracking (initialize early for guest users)
  const guestCartId = !authToken ? getGuestCartId() : null;
  
  // Initialize guest cart tracking on mount
  useEffect(() => {
    if (!authToken) {
      getGuestCartId(); // Ensure guest cart ID is created early
    }
  }, [authToken]);
  
  // Log cart totals in dev mode
  useEffect(() => {
    if (cartData) {
      logCartTotals('Order Type Step', cartData, cartTotals, guestCartId || 'authenticated');
    }
  }, [cartData, cartTotals, guestCartId]);

  // ===========================
  // Validate Delivery Address Mutation
  // ===========================

  const validateAddressMutation = useMutation({
    mutationFn: async (addressData: { address_id?: string; address?: string; postal_code?: string }) => {
      const response = await axios.post(
        `${API_BASE_URL}/api/delivery/validate-address`,
        addressData,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      return response.data;
    },
    onMutate: () => {
      setLoadingStates(prev => ({ ...prev, delivery_validating: true }));
      setErrorMessage(null);
    },
    onSuccess: (data) => {
      setDeliveryCalculation({
        is_valid: data.valid,
        delivery_fee: Number(data.delivery_fee || 0),
        estimated_time: data.estimated_delivery_time ? `${data.estimated_delivery_time} minutes` : null,
        zone_name: data.zone_id || null,
        error_message: data.valid ? null : 'Delivery not available to this address',
      });
      setLoadingStates(prev => ({ ...prev, delivery_validating: false }));
    },
    onError: (error: any) => {
      setErrorMessage(error.response?.data?.message || 'Failed to validate delivery address');
      setDeliveryCalculation({
        is_valid: false,
        delivery_fee: 0,
        estimated_time: null,
        zone_name: null,
        error_message: 'Failed to validate delivery address',
      });
      setLoadingStates(prev => ({ ...prev, delivery_validating: false }));
    },
  });

  // ===========================
  // Create New Address Mutation
  // ===========================

  const createAddressMutation = useMutation({
    mutationFn: async (newAddressData: any) => {
      const response = await axios.post(
        `${API_BASE_URL}/api/addresses`,
        newAddressData,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      return response.data;
    },
    onSuccess: (newAddress) => {
      // Invalidate and refetch addresses
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      
      // Close form
      setAddressForm({
        is_open: false,
        address_line1: '',
        address_line2: '',
        city: 'Dublin',
        postal_code: '',
        delivery_instructions: '',
        label: '',
      });

      // Auto-select new address and validate
      setDeliveryAddressId(newAddress.address_id);
      validateAddressMutation.mutate({
        address: newAddress.address_line1,
        postal_code: newAddress.postal_code,
      });
    },
    onError: (error: any) => {
      setErrorMessage(error.response?.data?.message || 'Failed to create address');
    },
  });

  // ===========================
  // Generate Time Slots (Client-Side Fallback)
  // NOTE: Backend endpoint GET /api/checkout/time-slots is missing
  // ===========================

  const generateClientSideTimeSlots = () => {
    setLoadingStates(prev => ({ ...prev, time_slots_loading: true }));

    // Generate time slots for today and tomorrow
    const now = new Date();
    const prepBufferMinutes = 45; // Minimum prep time
    const earliestTime = new Date(now.getTime() + prepBufferMinutes * 60000);

    const slots: TimeSlot[] = [];
    const daysToGenerate = 2; // Today and tomorrow

    for (let dayOffset = 0; dayOffset < daysToGenerate; dayOffset++) {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + dayOffset);
      targetDate.setMinutes(0, 0, 0);

      // Generate slots from 11:00 to 20:00 in 15-minute intervals
      const startHour = 11;
      const endHour = 20;

      for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += 15) {
          const slotTime = new Date(targetDate);
          slotTime.setHours(hour, minute, 0, 0);

          // Check if slot is in the future (considering prep buffer)
          const isAvailable = slotTime.getTime() > earliestTime.getTime();

          slots.push({
            slot_time: slotTime.toISOString(),
            is_available: isAvailable,
            capacity_remaining: isAvailable ? Math.floor(Math.random() * 5) + 1 : 0,
          });
        }
      }
    }

    setAvailableTimeSlots(slots);
    setLoadingStates(prev => ({ ...prev, time_slots_loading: false }));
  };

  // ===========================
  // Format Time Slot Display
  // ===========================

  const formatTimeSlot = (isoString: string): string => {
    const date = new Date(isoString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    const timeString = date.toLocaleTimeString('en-IE', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    if (isToday) {
      return `Today ${timeString}`;
    } else {
      const dateString = date.toLocaleDateString('en-IE', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
      return `${dateString} ${timeString}`;
    }
  };

  // ===========================
  // Handle Order Type Selection
  // ===========================

  const handleOrderTypeChange = (type: 'collection' | 'delivery') => {
    setOrderType(type);
    setErrorMessage(null);

    if (type === 'collection') {
      // Generate time slots
      generateClientSideTimeSlots();
      // Reset delivery-related state
      setDeliveryAddressId(null);
      setDeliveryCalculation({
        is_valid: false,
        delivery_fee: 0,
        estimated_time: null,
        zone_name: null,
        error_message: null,
      });
    } else {
      // Reset collection-related state
      setCollectionTimeSlot(null);
      setAvailableTimeSlots([]);
    }
  };

  // ===========================
  // Handle Address Selection
  // ===========================

  const handleAddressSelect = (address: SavedAddress) => {
    setDeliveryAddressId(address.address_id);
    setErrorMessage(null);

    // Validate address using address_id for saved addresses
    validateAddressMutation.mutate({
      address_id: address.address_id,
    });
  };

  // ===========================
  // Handle New Address Creation
  // ===========================

  const handleCreateAddress = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validate form
    if (!addressForm.label || !addressForm.address_line1 || !addressForm.postal_code) {
      setErrorMessage('Please fill in all required address fields');
      return;
    }

    createAddressMutation.mutate({
      label: addressForm.label,
      address_line1: addressForm.address_line1,
      address_line2: addressForm.address_line2 || null,
      city: addressForm.city,
      postal_code: addressForm.postal_code,
      delivery_instructions: addressForm.delivery_instructions || null,
      is_default: false,
    });
  };

  // ===========================
  // Handle Continue to Contact Info
  // ===========================

  const handleContinue = () => {
    setErrorMessage(null);

    // Validate selections
    if (!orderType) {
      setErrorMessage('Please select an order type');
      return;
    }

    if (orderType === 'collection' && !collectionTimeSlot) {
      setErrorMessage('Please select a collection time slot');
      return;
    }

    if (orderType === 'delivery') {
      if (!deliveryAddressId) {
        setErrorMessage('Please select a delivery address');
        return;
      }

      if (!deliveryCalculation.is_valid) {
        setErrorMessage(deliveryCalculation.error_message || 'Delivery address is not valid');
        return;
      }
    }

    // Update cart fees if delivery
    if (orderType === 'delivery') {
      updateCartFees(deliveryCalculation.delivery_fee, 0); // Tax calculated later
    } else {
      updateCartFees(0, 0);
    }

    // Store order type data in sessionStorage for checkout flow
    try {
      sessionStorage.setItem('checkout_order_type', orderType);
      
      if (orderType === 'collection') {
        sessionStorage.setItem('checkout_collection_time_slot', collectionTimeSlot || '');
        sessionStorage.removeItem('checkout_delivery_address_id');
        sessionStorage.removeItem('checkout_delivery_address_data');
      } else if (orderType === 'delivery' && deliveryAddressId) {
        sessionStorage.setItem('checkout_delivery_address_id', deliveryAddressId);
        
        // Find and store the full address data
        const selectedAddress = savedAddresses.find(addr => addr.address_id === deliveryAddressId);
        if (selectedAddress) {
          sessionStorage.setItem('checkout_delivery_address_data', JSON.stringify({
            label: selectedAddress.label,
            address_line1: selectedAddress.address_line1,
            address_line2: selectedAddress.address_line2 || '',
            city: selectedAddress.city,
            postal_code: selectedAddress.postal_code,
            delivery_instructions: selectedAddress.delivery_instructions || '',
          }));
        }
        
        sessionStorage.removeItem('checkout_collection_time_slot');
      }

      // Navigate to contact info
      navigate('/checkout/contact');
    } catch (error) {
      console.error('Error storing order type data:', error);
      setErrorMessage('Failed to save order information. Please try again.');
    }
  };

  // ===========================
  // Check if cart is empty
  // ===========================

  useEffect(() => {
    if (cartItems.length === 0) {
      navigate('/cart');
    }
  }, [cartItems, navigate]);

  // ===========================
  // Render
  // ===========================

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Step Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-center space-x-4">
              <div className="flex items-center">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white font-semibold">
                  1
                </div>
                <span className="ml-2 text-sm font-medium text-gray-900">Order Type</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
              <div className="flex items-center">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-200 text-gray-600 font-semibold">
                  2
                </div>
                <span className="ml-2 text-sm font-medium text-gray-500">Contact</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
              <div className="flex items-center">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-200 text-gray-600 font-semibold">
                  3
                </div>
                <span className="ml-2 text-sm font-medium text-gray-500">Payment</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
              <div className="flex items-center">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-200 text-gray-600 font-semibold">
                  4
                </div>
                <span className="ml-2 text-sm font-medium text-gray-500">Review</span>
              </div>
            </div>
          </div>

          {/* Main Card */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-8 sm:px-8">
              <h1 className="text-3xl font-bold text-white">Choose Order Type</h1>
              <p className="mt-2 text-blue-100">Select collection or delivery for your order</p>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="mx-6 mt-6 sm:mx-8 bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-start">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                <p className="text-sm text-red-700">{errorMessage}</p>
              </div>
            )}

            {/* Order Type Selector */}
            <div className="px-6 py-8 sm:px-8">
              <fieldset>
                <legend className="text-lg font-semibold text-gray-900 mb-4">Select Order Type</legend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Collection Option */}
                  <button
                    type="button"
                    onClick={() => handleOrderTypeChange('collection')}
                    className={`relative rounded-xl border-2 p-6 flex flex-col items-start transition-all duration-200 ${
                      orderType === 'collection'
                        ? 'border-blue-600 bg-blue-50 ring-4 ring-blue-100'
                        : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md'
                    }`}
                  >
                    <Clock className={`w-8 h-8 mb-3 ${orderType === 'collection' ? 'text-blue-600' : 'text-gray-400'}`} />
                    <span className="text-lg font-semibold text-gray-900">Collection</span>
                    <span className="mt-1 text-sm text-gray-600">Pick up your order from our food truck</span>
                    {orderType === 'collection' && (
                      <Check className="absolute top-4 right-4 w-6 h-6 text-blue-600" />
                    )}
                  </button>

                  {/* Delivery Option */}
                  <button
                    type="button"
                    onClick={() => handleOrderTypeChange('delivery')}
                    disabled={!deliveryEnabled}
                    className={`relative rounded-xl border-2 p-6 flex flex-col items-start transition-all duration-200 ${
                      orderType === 'delivery'
                        ? 'border-blue-600 bg-blue-50 ring-4 ring-blue-100'
                        : deliveryEnabled
                        ? 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md'
                        : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                    }`}
                  >
                    <MapPin className={`w-8 h-8 mb-3 ${orderType === 'delivery' ? 'text-blue-600' : deliveryEnabled ? 'text-gray-400' : 'text-gray-300'}`} />
                    <span className="text-lg font-semibold text-gray-900">Delivery</span>
                    <span className="mt-1 text-sm text-gray-600">
                      {deliveryEnabled ? 'We\'ll deliver to your address' : 'Currently unavailable'}
                    </span>
                    {orderType === 'delivery' && (
                      <Check className="absolute top-4 right-4 w-6 h-6 text-blue-600" />
                    )}
                  </button>
                </div>
              </fieldset>

              {/* Collection Time Picker */}
              {orderType === 'collection' && (
                <div className="mt-8">
                  {loadingStates.time_slots_loading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-4" style={{ borderColor: '#2C2018' }}></div>
                    </div>
                  ) : (
                    <CollectionTimePicker
                      availableTimeSlots={availableTimeSlots}
                      selectedTimeSlot={collectionTimeSlot}
                      onSelectTimeSlot={(slotTime) => {
                        setCollectionTimeSlot(slotTime);
                        setErrorMessage(null);
                      }}
                      error={errorMessage && !collectionTimeSlot ? 'Please select a collection time' : null}
                    />
                  )}
                </div>
              )}

              {/* Delivery Address Selection */}
              {orderType === 'delivery' && (
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Select Delivery Address</h3>
                    <button
                      type="button"
                      onClick={() => setAddressForm(prev => ({ ...prev, is_open: true }))}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors duration-200"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Address
                    </button>
                  </div>

                  {savedAddresses.length === 0 ? (
                    <div className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
                      <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600">No saved addresses yet</p>
                      <p className="text-sm text-gray-500 mt-1">Add an address to enable delivery</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {savedAddresses.map((address) => (
                        <button
                          key={address.address_id}
                          type="button"
                          onClick={() => handleAddressSelect(address)}
                          className={`relative rounded-xl border-2 p-6 text-left transition-all duration-200 ${
                            deliveryAddressId === address.address_id
                              ? 'border-blue-600 bg-blue-50 ring-4 ring-blue-100'
                              : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center">
                                <span className="text-sm font-semibold text-gray-900">{address.label}</span>
                                {address.is_default && (
                                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                    Default
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 text-sm text-gray-600">
                                {address.address_line1}
                                {address.address_line2 && `, ${address.address_line2}`}
                              </p>
                              <p className="text-sm text-gray-600">
                                {address.city}, {address.postal_code}
                              </p>
                            </div>
                            {deliveryAddressId === address.address_id && (
                              <Check className="w-6 h-6 text-blue-600 flex-shrink-0 ml-4" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Delivery Calculation Display */}
                  {deliveryAddressId && loadingStates.delivery_validating && (
                    <div className="mt-4 bg-gray-50 rounded-lg border border-gray-200 p-4 flex items-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
                      <span className="text-sm text-gray-600">Validating delivery address...</span>
                    </div>
                  )}

                  {deliveryAddressId && !loadingStates.delivery_validating && deliveryCalculation.is_valid && (
                    <div className="mt-4 bg-green-50 rounded-lg border border-green-200 p-4">
                      <div className="flex items-start">
                        <Check className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-green-900">Delivery Available</p>
                          <div className="mt-2 space-y-1">
                            <p className="text-sm text-green-700">
                              Delivery Fee: <span className="font-semibold">€{Number(deliveryCalculation.delivery_fee).toFixed(2)}</span>
                            </p>
                            {deliveryCalculation.estimated_time && (
                              <p className="text-sm text-green-700">
                                Estimated Time: <span className="font-semibold">{deliveryCalculation.estimated_time}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {deliveryAddressId && !loadingStates.delivery_validating && !deliveryCalculation.is_valid && deliveryCalculation.error_message && (
                    <div className="mt-4 bg-red-50 rounded-lg border border-red-200 p-4 flex items-start">
                      <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                      <p className="text-sm text-red-700">{deliveryCalculation.error_message}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Cart Summary - Using Shared OrderSummary Component */}
            <div className="bg-gray-50 px-6 py-6 sm:px-8 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
              <OrderSummary
                totals={cartTotals}
                discountCode={cartData?.discount_code}
                hasDiscount={!!cartData?.discount_code && cartTotals.discountCents > 0}
                showDeliveryFee={true}
                showTax={true}
              />
            </div>

            {/* Navigation Buttons */}
            <div className="bg-white px-6 py-6 sm:px-8 border-t border-gray-200 flex justify-between">
              <Link
                to="/cart"
                className="inline-flex items-center px-6 py-3 bg-gray-100 text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors duration-200"
              >
                Back to Cart
              </Link>
              <button
                type="button"
                onClick={handleContinue}
                disabled={
                  !orderType ||
                  (orderType === 'collection' && !collectionTimeSlot) ||
                  (orderType === 'delivery' && (!deliveryAddressId || !deliveryCalculation.is_valid))
                }
                className="inline-flex items-center px-8 py-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Continue to Contact Info
                <ChevronRight className="w-5 h-5 ml-2" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Address Modal */}
      {addressForm.is_open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Add Delivery Address</h2>
              <button
                type="button"
                onClick={() => setAddressForm(prev => ({ ...prev, is_open: false }))}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateAddress} className="px-6 py-6 space-y-4">
              <div>
                <label htmlFor="label" className="block text-sm font-medium text-gray-700 mb-1">
                  Label <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  id="label"
                  value={addressForm.label}
                  onChange={(e) => setAddressForm(prev => ({ ...prev, label: e.target.value }))}
                  placeholder="e.g., Home, Work"
                  required
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                />
              </div>

              <div>
                <label htmlFor="address_line1" className="block text-sm font-medium text-gray-700 mb-1">
                  Address Line 1 <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  id="address_line1"
                  value={addressForm.address_line1}
                  onChange={(e) => setAddressForm(prev => ({ ...prev, address_line1: e.target.value }))}
                  placeholder="Street address"
                  required
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                />
              </div>

              <div>
                <label htmlFor="address_line2" className="block text-sm font-medium text-gray-700 mb-1">
                  Address Line 2
                </label>
                <input
                  type="text"
                  id="address_line2"
                  value={addressForm.address_line2}
                  onChange={(e) => setAddressForm(prev => ({ ...prev, address_line2: e.target.value }))}
                  placeholder="Apartment, suite, etc."
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                    City <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    id="city"
                    value={addressForm.city}
                    onChange={(e) => setAddressForm(prev => ({ ...prev, city: e.target.value }))}
                    required
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="postal_code" className="block text-sm font-medium text-gray-700 mb-1">
                    Eircode <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    id="postal_code"
                    value={addressForm.postal_code}
                    onChange={(e) => setAddressForm(prev => ({ ...prev, postal_code: e.target.value }))}
                    placeholder="D01 A123"
                    required
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="delivery_instructions" className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery Instructions
                </label>
                <textarea
                  id="delivery_instructions"
                  value={addressForm.delivery_instructions}
                  onChange={(e) => setAddressForm(prev => ({ ...prev, delivery_instructions: e.target.value }))}
                  placeholder="Any special instructions for delivery"
                  rows={3}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all resize-none"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setAddressForm(prev => ({ ...prev, is_open: false }))}
                  className="flex-1 px-6 py-3 bg-gray-100 text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createAddressMutation.isPending}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {createAddressMutation.isPending ? (
                    <span className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </span>
                  ) : (
                    'Save Address'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default UV_CheckoutOrderType;