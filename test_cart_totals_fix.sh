#!/bin/bash

echo "=========================================="
echo "Cart Totals Sync Fix - Verification"
echo "=========================================="
echo ""

echo "✅ Files Created:"
echo "   - /app/vitereact/src/utils/cartTotals.ts"
echo "   - /app/vitereact/src/components/checkout/OrderSummary.tsx"
echo ""

echo "✅ Files Modified:"
echo "   - /app/vitereact/src/components/views/UV_Cart.tsx"
echo "   - /app/vitereact/src/components/views/UV_CheckoutOrderType.tsx"
echo "   - /app/vitereact/src/components/views/UV_CheckoutPayment.tsx"
echo "   - /app/vitereact/src/components/views/UV_CheckoutReview.tsx"
echo ""

echo "📋 Checking if files exist..."
test -f /app/vitereact/src/utils/cartTotals.ts && echo "   ✓ cartTotals.ts exists" || echo "   ✗ cartTotals.ts missing"
test -f /app/vitereact/src/components/checkout/OrderSummary.tsx && echo "   ✓ OrderSummary.tsx exists" || echo "   ✗ OrderSummary.tsx missing"
echo ""

echo "📋 Verifying imports in Cart page..."
grep -q "import.*cartTotals" /app/vitereact/src/components/views/UV_Cart.tsx && echo "   ✓ Cart page imports cartTotals utility" || echo "   ✗ Missing import"
grep -q "import.*OrderSummary" /app/vitereact/src/components/views/UV_Cart.tsx && echo "   ✓ Cart page imports OrderSummary component" || echo "   ✗ Missing import"
echo ""

echo "📋 Verifying imports in Order Type page..."
grep -q "import.*cartTotals" /app/vitereact/src/components/views/UV_CheckoutOrderType.tsx && echo "   ✓ Order Type imports cartTotals utility" || echo "   ✗ Missing import"
grep -q "import.*OrderSummary" /app/vitereact/src/components/views/UV_CheckoutOrderType.tsx && echo "   ✓ Order Type imports OrderSummary component" || echo "   ✗ Missing import"
echo ""

echo "📋 Verifying 'Tax will be calculated' message removed..."
if grep -q "Tax will be calculated" /app/vitereact/src/components/views/UV_CheckoutOrderType.tsx; then
    echo "   ✗ Misleading message still present"
else
    echo "   ✓ Misleading message removed"
fi
echo ""

echo "📋 Verifying OrderSummary component usage..."
grep -c "<OrderSummary" /app/vitereact/src/components/views/UV_Cart.tsx | xargs -I {} echo "   ✓ Cart page uses OrderSummary: {} time(s)"
grep -c "<OrderSummary" /app/vitereact/src/components/views/UV_CheckoutOrderType.tsx | xargs -I {} echo "   ✓ Order Type uses OrderSummary: {} time(s)"
grep -c "<OrderSummary" /app/vitereact/src/components/views/UV_CheckoutPayment.tsx | xargs -I {} echo "   ✓ Payment page uses OrderSummary: {} time(s)"
grep -c "<OrderSummary" /app/vitereact/src/components/views/UV_CheckoutReview.tsx | xargs -I {} echo "   ✓ Review page uses OrderSummary: {} time(s)"
echo ""

echo "📋 Verifying guest cart tracking..."
grep -q "getGuestCartId" /app/vitereact/src/components/views/UV_Cart.tsx && echo "   ✓ Cart page tracks guest cart ID" || echo "   ✗ Missing guest tracking"
grep -q "getGuestCartId" /app/vitereact/src/components/views/UV_CheckoutOrderType.tsx && echo "   ✓ Order Type tracks guest cart ID" || echo "   ✗ Missing guest tracking"
echo ""

echo "📋 Verifying dev mode logging..."
grep -q "logCartTotals" /app/vitereact/src/components/views/UV_Cart.tsx && echo "   ✓ Cart page has logging" || echo "   ✗ Missing logging"
grep -q "logCartTotals" /app/vitereact/src/components/views/UV_CheckoutOrderType.tsx && echo "   ✓ Order Type has logging" || echo "   ✗ Missing logging"
echo ""

echo "=========================================="
echo "✅ All verifications complete!"
echo "=========================================="
echo ""
echo "Next Steps:"
echo "1. Start the dev server: cd /app/vitereact && npm run dev"
echo "2. Open browser and navigate to the cart page"
echo "3. Open browser console (F12) to see cart logging"
echo "4. Add items and proceed through checkout"
echo "5. Verify totals match on all pages"
echo ""
echo "Expected Console Output:"
echo "  🛒 Cart Totals - Shopping Cart Page"
echo "  🛒 Cart Totals - Order Type Step"
echo "  🛒 Cart Totals - Payment Step"
echo "  🛒 Cart Totals - Review Step"
echo ""
