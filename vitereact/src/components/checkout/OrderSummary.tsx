import React from 'react';
import { Tag } from 'lucide-react';
import { CartTotals } from '@/utils/cartTotals';

interface OrderSummaryProps {
  totals: CartTotals;
  discountCode?: string | null;
  hasDiscount?: boolean;
  showDeliveryFee?: boolean;
  showTax?: boolean;
  className?: string;
}

/**
 * Shared OrderSummary component
 * Displays consistent cart totals across Cart, Order Type, Payment, and Review pages
 */
const OrderSummary: React.FC<OrderSummaryProps> = ({
  totals,
  discountCode = null,
  hasDiscount = false,
  showDeliveryFee = true,
  showTax = true,
  className = '',
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Subtotal */}
      <div className="flex justify-between text-gray-700">
        <span>Subtotal</span>
        <span className="font-medium">€{totals.subtotal}</span>
      </div>

      {/* Discount */}
      {hasDiscount && discountCode && totals.discountCents > 0 && (
        <div className="flex justify-between text-green-600">
          <div className="flex items-center">
            <Tag className="h-4 w-4 mr-1" />
            <span>Discount ({discountCode})</span>
          </div>
          <span className="font-medium">-€{totals.discount}</span>
        </div>
      )}

      {/* Delivery Fee */}
      {showDeliveryFee && (
        <div className="flex justify-between text-gray-700">
          <span>Delivery Fee</span>
          <span className="font-medium">
            {totals.deliveryFeeCents > 0 ? `€${totals.deliveryFee}` : 'Free'}
          </span>
        </div>
      )}

      {/* Tax (VAT) */}
      {showTax && (
        <div className="flex justify-between text-gray-700">
          <span>Tax (VAT)</span>
          <span className="font-medium">€{totals.tax}</span>
        </div>
      )}

      {/* Total */}
      <div className="pt-3 border-t-2 border-gray-200">
        <div className="flex justify-between items-center">
          <span className="text-lg font-bold text-gray-900">Total</span>
          <span className="text-2xl font-bold text-orange-600">
            €{totals.total}
          </span>
        </div>
      </div>
    </div>
  );
};

export default OrderSummary;
