# Checkout Flow Navigation Fix

## Issue
Browser testing revealed that users could not proceed from the cart page (`/cart`) to the checkout order type page (`/checkout/order-type`) after clicking the "Proceed to Checkout" button. The page would navigate to `/checkout/order-type` but immediately redirect back to `/cart`.

## Root Cause
The `UV_CheckoutOrderType` component had a useEffect hook that checked if the cart was empty by reading from the Zustand store:

```typescript
useEffect(() => {
  if (cartItems.length === 0) {
    navigate('/cart');
  }
}, [cartItems, navigate]);
```

However, there was a **data source mismatch**:
- The cart data was being fetched via **React Query** in `UV_Cart` component (from API endpoint `/api/cart`)
- The `UV_CheckoutOrderType` component was checking cart items from the **Zustand store** (`useAppStore(state => state.cart_state.items)`)
- The Zustand store's `cart_state.items` initialized as an empty array and was never synced with the API data
- This caused the useEffect to always see an empty cart and immediately redirect back to `/cart`

## Solution
Modified `UV_CheckoutOrderType` to fetch cart data directly from the API using React Query, matching the pattern used in `UV_Cart`:

### Changes Made to `/app/vitereact/src/components/views/UV_CheckoutOrderType.tsx`

1. **Removed Zustand store cart state selectors** (lines 67-68):
   - Removed: `const cartItems = useAppStore(state => state.cart_state.items);`
   - Removed: `const cartSubtotal = useAppStore(state => state.cart_state.subtotal);`

2. **Added React Query cart data fetching** (after line 124):
   ```typescript
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
   const cartSubtotal = cartData?.subtotal || 0;
   ```

## Benefits
- **Consistent data source**: Both cart and checkout pages now fetch cart data from the same source (React Query API calls)
- **Accurate cart state**: The checkout page now sees the actual cart data from the server, not an empty local store
- **Proper navigation flow**: Users can now successfully navigate from cart to checkout without being redirected back
- **Cache efficiency**: React Query caches the cart data, so the checkout page can reuse the cached data from the cart page

## Testing
The fix ensures that:
1. Cart validation succeeds when clicking "Proceed to Checkout"
2. Navigation to `/checkout/order-type` occurs successfully
3. The checkout page displays the correct cart items and subtotal
4. Users can continue through the checkout flow without being redirected

## Related Files
- `/app/vitereact/src/components/views/UV_CheckoutOrderType.tsx` - Fixed component
- `/app/vitereact/src/components/views/UV_Cart.tsx` - Reference implementation for cart data fetching
- `/app/vitereact/src/App.tsx` - Route configuration with ProtectedRoute wrapper
