import React, { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, Package, MapPin, Clock, Award, ArrowRight, AlertCircle } from 'lucide-react';

// ===========================
// Main Component
// ===========================

const UV_OrderConfirmation: React.FC = () => {
  const [searchParams] = useSearchParams();

  // Get order data from URL params (passed from checkout)
  const ticketNumber = searchParams.get('ticket');
  const orderNumber = searchParams.get('order_number');
  const orderType = searchParams.get('order_type') as 'collection' | 'delivery' | null;
  const totalAmount = searchParams.get('total');
  const loyaltyPoints = searchParams.get('points');
  const status = searchParams.get('status') || 'received';

  // Try to get data from localStorage if not in URL params
  let finalTicketNumber = ticketNumber;
  let finalOrderNumber = orderNumber;

  if (!finalTicketNumber) {
    try {
      const lastOrderStr = localStorage.getItem('lastOrder');
      if (lastOrderStr) {
        const lastOrder = JSON.parse(lastOrderStr);
        finalTicketNumber = finalTicketNumber || lastOrder.ticket_number;
        finalOrderNumber = finalOrderNumber || lastOrder.order_number;
      }
    } catch (error) {
      console.error('Error reading lastOrder from localStorage:', error);
    }
  }

  // Assign final values BEFORE any hooks or early returns (to avoid TDZ errors)
  const displayTicketNumber = finalTicketNumber;
  const displayOrderNumber = finalOrderNumber || orderNumber;

  // Save tracking info to localStorage for easy access
  // This hook MUST come before any conditional returns
  useEffect(() => {
    if (displayTicketNumber) {
      localStorage.setItem('lastOrder', JSON.stringify({
        ticket_number: displayTicketNumber,
        order_number: displayOrderNumber,
        created_at: new Date().toISOString(),
      }));
    }
  }, [displayTicketNumber, displayOrderNumber]);

  // Show friendly message if still missing required data
  // This conditional return comes AFTER all hooks
  if (!finalTicketNumber) {
    return (
      <div className="min-h-screen bg-[#F2EFE9] pb-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <AlertCircle className="h-16 w-16 text-orange-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-[#2C1A16] mb-4">
              Order Confirmation Not Found
            </h2>
            <p className="text-[#6B5B4F] mb-6">
              We couldn't find your order confirmation. If you just placed an order, please try again or contact support.
            </p>
            <Link
              to="/menu"
              className="inline-block bg-[#D4831D] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#C07519] transition-colors"
            >
              Back to Menu
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Format currency
  const formatCurrency = (amount: string | null): string => {
    if (!amount) return '€0.00';
    return `€${parseFloat(amount).toFixed(2)}`;
  };

  const trackingUrl = `/track/${displayTicketNumber}`;

  return (
    <div className="min-h-screen bg-[#F2EFE9] pb-20">
      {/* Header */}
      <div className="bg-white border-b border-[#D4C5B9]">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-[#2C1A16] mb-2">
              Order Confirmed!
            </h1>
            <p className="text-[#6B5B4F]">
              Thank you for your order. We're preparing it now.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Ticket Number Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="text-center">
            <p className="text-sm text-[#6B5B4F] mb-2">Your Order Ticket</p>
            <div className="text-4xl font-bold text-[#D4831D] mb-4 font-mono tracking-wider">
              {displayTicketNumber}
            </div>
            <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              <span className="inline-block w-2 h-2 rounded-full bg-blue-600 mr-2"></span>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </div>
          </div>

          {/* Order Reference */}
          {displayOrderNumber && (
            <div className="mt-4 pt-4 border-t border-[#D4C5B9] text-center">
              <p className="text-xs text-[#6B5B4F]">Order Reference: {displayOrderNumber}</p>
            </div>
          )}
        </div>

        {/* Order Type Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-start">
            {orderType === 'collection' ? (
              <Package className="h-6 w-6 text-[#D4831D] mr-3 flex-shrink-0" />
            ) : (
              <MapPin className="h-6 w-6 text-[#D4831D] mr-3 flex-shrink-0" />
            )}
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-[#2C1A16] mb-1">
                {orderType === 'collection' ? 'Collection Order' : 'Delivery Order'}
              </h3>
              <p className="text-[#6B5B4F]">
                {orderType === 'collection'
                  ? "Your order will be ready for collection. We'll notify you when it's prepared."
                  : "Your order is being prepared for delivery. We'll keep you updated on its progress."}
              </p>
            </div>
          </div>
        </div>

        {/* Order Summary Card */}
        {totalAmount && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-lg font-semibold text-[#2C1A16] mb-4">Order Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-[#2C1A16]">
                <span className="font-medium">Total Amount</span>
                <span className="font-bold text-lg">{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Loyalty Points Card */}
        {loyaltyPoints && parseInt(loyaltyPoints) > 0 && (
          <div className="bg-gradient-to-r from-[#D4831D] to-[#E89B3C] rounded-lg shadow-md p-6 mb-6 text-white">
            <div className="flex items-center">
              <Award className="h-8 w-8 mr-3" />
              <div>
                <h3 className="text-lg font-semibold mb-1">Loyalty Points Earned!</h3>
                <p className="text-white/90">
                  You've earned <span className="font-bold text-xl">{loyaltyPoints}</span> points with this order
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Track Order Button */}
        <Link
          to={trackingUrl}
          className="block w-full bg-[#D4831D] text-white text-center py-4 rounded-lg font-semibold hover:bg-[#C07519] transition-colors shadow-md mb-4"
        >
          <div className="flex items-center justify-center">
            <Clock className="h-5 w-5 mr-2" />
            Track Your Order
            <ArrowRight className="h-5 w-5 ml-2" />
          </div>
        </Link>

        {/* Secondary Actions */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Link
            to="/menu"
            className="block bg-white border-2 border-[#D4C5B9] text-[#2C1A16] text-center py-3 rounded-lg font-medium hover:bg-[#F2EFE9] transition-colors"
          >
            Browse Menu
          </Link>
          <Link
            to="/orders"
            className="block bg-white border-2 border-[#D4C5B9] text-[#2C1A16] text-center py-3 rounded-lg font-medium hover:bg-[#F2EFE9] transition-colors"
          >
            Order History
          </Link>
        </div>

        {/* Important Note */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Save Your Tracking Link</p>
              <p>
                Use your ticket number <span className="font-mono font-bold">{displayTicketNumber}</span> to track your order anytime.
                No login required!
              </p>
            </div>
          </div>
        </div>

        {/* What's Next Section */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-[#2C1A16] mb-4">What happens next?</h3>
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 h-8 w-8 rounded-full bg-[#D4831D] text-white flex items-center justify-center font-semibold mr-3">
                1
              </div>
              <div>
                <h4 className="font-medium text-[#2C1A16]">Order Received</h4>
                <p className="text-sm text-[#6B5B4F]">We've received your order and payment</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-300 text-white flex items-center justify-center font-semibold mr-3">
                2
              </div>
              <div>
                <h4 className="font-medium text-[#2C1A16]">Preparing</h4>
                <p className="text-sm text-[#6B5B4F]">Our team is preparing your order</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-300 text-white flex items-center justify-center font-semibold mr-3">
                3
              </div>
              <div>
                <h4 className="font-medium text-[#2C1A16]">
                  {orderType === 'collection' ? 'Ready for Collection' : 'Out for Delivery'}
                </h4>
                <p className="text-sm text-[#6B5B4F]">
                  {orderType === 'collection'
                    ? "We'll notify you when your order is ready"
                    : 'Your order is on its way to you'}
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-300 text-white flex items-center justify-center font-semibold mr-3">
                4
              </div>
              <div>
                <h4 className="font-medium text-[#2C1A16]">Completed</h4>
                <p className="text-sm text-[#6B5B4F]">Enjoy your meal!</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UV_OrderConfirmation;
