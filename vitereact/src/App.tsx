import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAppStore } from '@/store/main';

// Import Global Views
import GV_TopNav_Public from '@/components/views/GV_TopNav_Public';
import GV_TopNav_Customer from '@/components/views/GV_TopNav_Customer';
import GV_TopNav_Staff from '@/components/views/GV_TopNav_Staff';
import GV_TopNav_Admin from '@/components/views/GV_TopNav_Admin';
import GV_AdminSidebar from '@/components/views/GV_AdminSidebar';
import GV_Footer from '@/components/views/GV_Footer';
import GV_CookieConsent from '@/components/views/GV_CookieConsent';
import GV_FloatingCart from '@/components/views/GV_FloatingCart';
import { Toaster } from '@/components/ui/toaster';

// Import Unique Views
import UV_Landing from '@/components/views/UV_Landing';
import UV_Menu from '@/components/views/UV_Menu';
import UV_Cart from '@/components/views/UV_Cart';
import UV_CheckoutOrderType from '@/components/views/UV_CheckoutOrderType';
import UV_CheckoutContact from '@/components/views/UV_CheckoutContact';
import UV_CheckoutPayment from '@/components/views/UV_CheckoutPayment';
import UV_CheckoutReview from '@/components/views/UV_CheckoutReview';
import UV_OrderConfirmation from '@/components/views/UV_OrderConfirmation';
import UV_OrderTracking from '@/components/views/UV_OrderTracking';
import UV_Signup from '@/components/views/UV_Signup';
import UV_Login from '@/components/views/UV_Login';
import UV_PasswordResetRequest from '@/components/views/UV_PasswordResetRequest';
import UV_PasswordReset from '@/components/views/UV_PasswordReset';
import UV_EmailVerification from '@/components/views/UV_EmailVerification';
import UV_CustomerDashboard from '@/components/views/UV_CustomerDashboard';
import UV_CustomerProfile from '@/components/views/UV_CustomerProfile';
import UV_SavedAddresses from '@/components/views/UV_SavedAddresses';
import UV_SavedPaymentMethods from '@/components/views/UV_SavedPaymentMethods';
import UV_OrderHistory from '@/components/views/UV_OrderHistory';
import UV_OrderDetail from '@/components/views/UV_OrderDetail';
import UV_LoyaltyDashboard from '@/components/views/UV_LoyaltyDashboard';
import UV_CateringInfo from '@/components/views/UV_CateringInfo';
import UV_CateringInquiryForm from '@/components/views/UV_CateringInquiryForm';
import UV_MyCateringInquiries from '@/components/views/UV_MyCateringInquiries';
import UV_CateringInquiryDetail from '@/components/views/UV_CateringInquiryDetail';
import UV_About from '@/components/views/UV_About';
import UV_Contact from '@/components/views/UV_Contact';
import UV_FAQs from '@/components/views/UV_FAQs';
import UV_Terms from '@/components/views/UV_Terms';
import UV_Privacy from '@/components/views/UV_Privacy';
import UV_StaffLogin from '@/components/views/UV_StaffLogin';
import UV_StaffDashboard from '@/components/views/UV_StaffDashboard';
import UV_StaffOrderQueue from '@/components/views/UV_StaffOrderQueue';
import UV_StaffOrderDetail from '@/components/views/UV_StaffOrderDetail';
import UV_StaffStock from '@/components/views/UV_StaffStock';
import UV_StaffReports from '@/components/views/UV_StaffReports';
import UV_StaffProfile from '@/components/views/UV_StaffProfile';
import UV_AdminLogin from '@/components/views/UV_AdminLogin';
import UV_AdminDashboard from '@/components/views/UV_AdminDashboard';
import UV_AdminMenuList from '@/components/views/UV_AdminMenuList';
import UV_AdminMenuItemForm from '@/components/views/UV_AdminMenuItemForm';
import UV_AdminCategoryManagement from '@/components/views/UV_AdminCategoryManagement';
import UV_AdminStock from '@/components/views/UV_AdminStock';
import UV_AdminStockHistory from '@/components/views/UV_AdminStockHistory';
import UV_AdminOrders from '@/components/views/UV_AdminOrders';
import UV_AdminOrderDetail from '@/components/views/UV_AdminOrderDetail';
import UV_AdminDeliverySettings from '@/components/views/UV_AdminDeliverySettings';
import UV_AdminDiscounts from '@/components/views/UV_AdminDiscounts';
import UV_AdminDiscountForm from '@/components/views/UV_AdminDiscountForm';
import UV_AdminCouponUsage from '@/components/views/UV_AdminCouponUsage';
import UV_AdminCustomers from '@/components/views/UV_AdminCustomers';
import UV_AdminCustomerProfile from '@/components/views/UV_AdminCustomerProfile';
import UV_AdminStaff from '@/components/views/UV_AdminStaff';
import UV_AdminStaffForm from '@/components/views/UV_AdminStaffForm';
import UV_AdminCateringList from '@/components/views/UV_AdminCateringList';
import UV_AdminCateringInquiryDetail from '@/components/views/UV_AdminCateringInquiryDetail';
import UV_AdminInvoices from '@/components/views/UV_AdminInvoices';
import UV_AdminInvoiceDetail from '@/components/views/UV_AdminInvoiceDetail';
import UV_AdminAnalytics from '@/components/views/UV_AdminAnalytics';
import UV_AdminSettings from '@/components/views/UV_AdminSettings';
import UV_AdminActivityLogs from '@/components/views/UV_AdminActivityLogs';

// ===========================
// React Query Setup
// ===========================
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// ===========================
// Loading Spinner Component
// ===========================
const LoadingSpinner: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-600 mx-auto"></div>
      <p className="mt-4 text-gray-600 font-medium">Loading Salama Lama...</p>
    </div>
  </div>
);

// ===========================
// Route Protection Components
// ===========================

// Customer Protected Route
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const isLoading = useAppStore(state => state.authentication_state.authentication_status.is_loading);
  const userRole = useAppStore(state => state.authentication_state.current_user?.role);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Allow customer role to access protected routes
  if (userRole !== 'customer') {
    // Redirect to appropriate dashboard based on role
    if (userRole === 'staff' || userRole === 'manager') {
      return <Navigate to="/staff/dashboard" replace />;
    }
    if (userRole === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Staff Protected Route
const StaffRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const isLoading = useAppStore(state => state.authentication_state.authentication_status.is_loading);
  const userRole = useAppStore(state => state.authentication_state.current_user?.role);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/staff/login" replace />;
  }

  // Allow staff and manager roles
  if (userRole !== 'staff' && userRole !== 'manager') {
    if (userRole === 'customer') {
      return <Navigate to="/dashboard" replace />;
    }
    if (userRole === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    return <Navigate to="/staff/login" replace />;
  }

  return <>{children}</>;
};

// Admin Protected Route
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const isLoading = useAppStore(state => state.authentication_state.authentication_status.is_loading);
  const userRole = useAppStore(state => state.authentication_state.current_user?.role);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  if (userRole !== 'admin') {
    if (userRole === 'customer') {
      return <Navigate to="/dashboard" replace />;
    }
    if (userRole === 'staff' || userRole === 'manager') {
      return <Navigate to="/staff/dashboard" replace />;
    }
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
};

// ===========================
// Layout Wrapper Component
// ===========================
const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const userRole = useAppStore(state => state.authentication_state.current_user?.role);

  // Determine current route context
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isStaffRoute = location.pathname.startsWith('/staff');

  // Routes that should show floating cart
  const showFloatingCartRoutes = ['/', '/menu', '/catering', '/dashboard'];
  const showFloatingCart = showFloatingCartRoutes.includes(location.pathname);

  // Routes that should show footer (public + customer routes)
  const noFooterRoutes = isAdminRoute || isStaffRoute;

  // Routes that should show cookie consent (public routes on first visit)
  const showCookieConsentRoutes = !isAdminRoute && !isStaffRoute && !isAuthenticated;

  // Determine which top nav to show
  let TopNavComponent: React.FC | null = null;
  if (isAdminRoute && isAuthenticated && userRole === 'admin') {
    TopNavComponent = GV_TopNav_Admin;
  } else if (isStaffRoute && isAuthenticated && (userRole === 'staff' || userRole === 'manager')) {
    TopNavComponent = GV_TopNav_Staff;
  } else if (isAuthenticated && userRole === 'customer' && !isAdminRoute && !isStaffRoute) {
    TopNavComponent = GV_TopNav_Customer;
  } else if (!isAuthenticated && !isAdminRoute && !isStaffRoute) {
    TopNavComponent = GV_TopNav_Public;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navigation */}
      {TopNavComponent && <TopNavComponent />}

      {/* Main Content Area */}
      <div className={`flex-1 flex ${isAdminRoute ? 'bg-gray-50' : ''}`}>
        {/* Admin Sidebar */}
        {isAdminRoute && isAuthenticated && userRole === 'admin' && (
          <GV_AdminSidebar />
        )}

        {/* Main Content */}
        <main className={`flex-1 ${isAdminRoute ? 'ml-0 lg:ml-64' : ''}`}>
          {children}
        </main>
      </div>

      {/* Footer - show on public and customer routes only */}
      {!noFooterRoutes && <GV_Footer />}

      {/* Floating Cart - show on specific routes */}
      {showFloatingCart && <GV_FloatingCart />}

      {/* Cookie Consent - show on public routes */}
      {showCookieConsentRoutes && <GV_CookieConsent />}
    </div>
  );
};

// ===========================
// Main App Router Component
// ===========================
const AppRoutes: React.FC = () => {
  return (
    <AppLayout>
      <Routes>
        {/* ===========================
            PUBLIC ROUTES
            =========================== */}
        
        {/* Landing & Info Pages */}
        <Route path="/" element={<UV_Landing />} />
        <Route path="/about" element={<UV_About />} />
        <Route path="/contact" element={<UV_Contact />} />
        <Route path="/faqs" element={<UV_FAQs />} />
        <Route path="/terms" element={<UV_Terms />} />
        <Route path="/privacy" element={<UV_Privacy />} />

        {/* Menu & Cart */}
        <Route path="/menu" element={<UV_Menu />} />
        <Route path="/cart" element={<UV_Cart />} />

        {/* Catering Public Pages */}
        <Route path="/catering" element={<UV_CateringInfo />} />
        <Route path="/catering/inquiry" element={<UV_CateringInquiryForm />} />

        {/* Authentication */}
        <Route path="/login" element={<UV_Login />} />
        <Route path="/signup" element={<UV_Signup />} />
        <Route path="/forgot-password" element={<UV_PasswordResetRequest />} />
        <Route path="/reset-password/:token" element={<UV_PasswordReset />} />
        <Route path="/verify-email/:token" element={<UV_EmailVerification />} />

        {/* ===========================
            CUSTOMER PROTECTED ROUTES
            =========================== */}
        
        {/* Dashboard & Profile */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <UV_CustomerDashboard />
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <UV_CustomerProfile />
          </ProtectedRoute>
        } />
        <Route path="/addresses" element={
          <ProtectedRoute>
            <UV_SavedAddresses />
          </ProtectedRoute>
        } />
        <Route path="/payment-methods" element={
          <ProtectedRoute>
            <UV_SavedPaymentMethods />
          </ProtectedRoute>
        } />

        {/* Orders */}
        <Route path="/orders" element={
          <ProtectedRoute>
            <UV_OrderHistory />
          </ProtectedRoute>
        } />
        <Route path="/orders/:order_id" element={
          <ProtectedRoute>
            <UV_OrderDetail />
          </ProtectedRoute>
        } />
        <Route path="/orders/:order_id/track" element={
          <ProtectedRoute>
            <UV_OrderTracking />
          </ProtectedRoute>
        } />
        <Route path="/order/confirmation" element={
          <ProtectedRoute>
            <UV_OrderConfirmation />
          </ProtectedRoute>
        } />

        {/* Checkout Flow */}
        <Route path="/checkout/order-type" element={
          <ProtectedRoute>
            <UV_CheckoutOrderType />
          </ProtectedRoute>
        } />
        <Route path="/checkout/contact" element={
          <ProtectedRoute>
            <UV_CheckoutContact />
          </ProtectedRoute>
        } />
        <Route path="/checkout/payment" element={
          <ProtectedRoute>
            <UV_CheckoutPayment />
          </ProtectedRoute>
        } />
        <Route path="/checkout/review" element={
          <ProtectedRoute>
            <UV_CheckoutReview />
          </ProtectedRoute>
        } />

        {/* Loyalty */}
        <Route path="/rewards" element={
          <ProtectedRoute>
            <UV_LoyaltyDashboard />
          </ProtectedRoute>
        } />

        {/* Customer Catering */}
        <Route path="/catering/inquiries" element={
          <ProtectedRoute>
            <UV_MyCateringInquiries />
          </ProtectedRoute>
        } />
        <Route path="/catering/inquiries/:inquiry_id" element={
          <ProtectedRoute>
            <UV_CateringInquiryDetail />
          </ProtectedRoute>
        } />

        {/* ===========================
            STAFF ROUTES
            =========================== */}
        
        <Route path="/staff/login" element={<UV_StaffLogin />} />
        <Route path="/staff/dashboard" element={
          <StaffRoute>
            <UV_StaffDashboard />
          </StaffRoute>
        } />
        <Route path="/staff/orders" element={
          <StaffRoute>
            <UV_StaffOrderQueue />
          </StaffRoute>
        } />
        <Route path="/staff/orders/:order_id" element={
          <StaffRoute>
            <UV_StaffOrderDetail />
          </StaffRoute>
        } />
        <Route path="/staff/stock" element={
          <StaffRoute>
            <UV_StaffStock />
          </StaffRoute>
        } />
        <Route path="/staff/reports" element={
          <StaffRoute>
            <UV_StaffReports />
          </StaffRoute>
        } />
        <Route path="/staff/profile" element={
          <StaffRoute>
            <UV_StaffProfile />
          </StaffRoute>
        } />

        {/* ===========================
            ADMIN ROUTES
            =========================== */}
        
        <Route path="/admin/login" element={<UV_AdminLogin />} />
        <Route path="/admin/dashboard" element={
          <AdminRoute>
            <UV_AdminDashboard />
          </AdminRoute>
        } />

        {/* Menu Management */}
        <Route path="/admin/menu" element={
          <AdminRoute>
            <UV_AdminMenuList />
          </AdminRoute>
        } />
        <Route path="/admin/menu/item" element={
          <AdminRoute>
            <UV_AdminMenuItemForm />
          </AdminRoute>
        } />
        <Route path="/admin/menu/categories" element={
          <AdminRoute>
            <UV_AdminCategoryManagement />
          </AdminRoute>
        } />

        {/* Stock Management */}
        <Route path="/admin/stock" element={
          <AdminRoute>
            <UV_AdminStock />
          </AdminRoute>
        } />
        <Route path="/admin/stock/:item_id/history" element={
          <AdminRoute>
            <UV_AdminStockHistory />
          </AdminRoute>
        } />

        {/* Order Management */}
        <Route path="/admin/orders" element={
          <AdminRoute>
            <UV_AdminOrders />
          </AdminRoute>
        } />
        <Route path="/admin/orders/:order_id" element={
          <AdminRoute>
            <UV_AdminOrderDetail />
          </AdminRoute>
        } />

        {/* Delivery Settings */}
        <Route path="/admin/delivery" element={
          <AdminRoute>
            <UV_AdminDeliverySettings />
          </AdminRoute>
        } />

        {/* Discounts & Coupons */}
        <Route path="/admin/discounts" element={
          <AdminRoute>
            <UV_AdminDiscounts />
          </AdminRoute>
        } />
        <Route path="/admin/discounts/code" element={
          <AdminRoute>
            <UV_AdminDiscountForm />
          </AdminRoute>
        } />
        <Route path="/admin/discounts/:code_id/usage" element={
          <AdminRoute>
            <UV_AdminCouponUsage />
          </AdminRoute>
        } />

        {/* Customer Management */}
        <Route path="/admin/customers" element={
          <AdminRoute>
            <UV_AdminCustomers />
          </AdminRoute>
        } />
        <Route path="/admin/customers/:customer_id" element={
          <AdminRoute>
            <UV_AdminCustomerProfile />
          </AdminRoute>
        } />

        {/* Staff Management */}
        <Route path="/admin/staff" element={
          <AdminRoute>
            <UV_AdminStaff />
          </AdminRoute>
        } />
        <Route path="/admin/staff/member" element={
          <AdminRoute>
            <UV_AdminStaffForm />
          </AdminRoute>
        } />

        {/* Catering Management */}
        <Route path="/admin/catering" element={
          <AdminRoute>
            <UV_AdminCateringList />
          </AdminRoute>
        } />
        <Route path="/admin/catering/:inquiry_id" element={
          <AdminRoute>
            <UV_AdminCateringInquiryDetail />
          </AdminRoute>
        } />

        {/* Invoices */}
        <Route path="/admin/invoices" element={
          <AdminRoute>
            <UV_AdminInvoices />
          </AdminRoute>
        } />
        <Route path="/admin/invoices/:invoice_id" element={
          <AdminRoute>
            <UV_AdminInvoiceDetail />
          </AdminRoute>
        } />

        {/* Analytics & Settings */}
        <Route path="/admin/analytics" element={
          <AdminRoute>
            <UV_AdminAnalytics />
          </AdminRoute>
        } />
        <Route path="/admin/settings" element={
          <AdminRoute>
            <UV_AdminSettings />
          </AdminRoute>
        } />
        <Route path="/admin/activity-logs" element={
          <AdminRoute>
            <UV_AdminActivityLogs />
          </AdminRoute>
        } />

        {/* ===========================
            FALLBACK ROUTES
            =========================== */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
};

// ===========================
// Main App Component
// ===========================
const App: React.FC = () => {
  const isLoading = useAppStore(state => state.authentication_state.authentication_status.is_loading);
  const initialize_auth = useAppStore(state => state.initialize_auth);
  const fetch_business_settings = useAppStore(state => state.fetch_business_settings);

  useEffect(() => {
    // Initialize authentication on app mount
    initialize_auth();
    
    // Fetch business settings (operating hours, delivery status, etc.)
    fetch_business_settings();
  }, [initialize_auth, fetch_business_settings]);

  // Show loading spinner during initial auth check
  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AppRoutes />
        <Toaster />
      </Router>
    </QueryClientProvider>
  );
};

export default App;