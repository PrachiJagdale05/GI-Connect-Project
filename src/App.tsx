
import React, { useEffect } from 'react';
import {
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { Toaster } from '@/components/ui/toaster';
import ChatbotWidget from '@/components/chatbot/ChatbotWidget';

// Import pages
import Index from './pages/Index';
import Login from './pages/Login';
import Cart from './pages/Cart';
import Makers from './pages/Makers';
import MakerDetails from './pages/MakerDetails';
import Marketplace from './pages/Marketplace';
import ProductDetails from './pages/ProductDetails';
import AboutGI from './pages/AboutGI';
import InteractiveGIMap from './pages/InteractiveGIMap';
import NotFound from './pages/NotFound';

// Customer pages
import CustomerDashboard from './pages/CustomerDashboard';
import Favourites from './pages/customer/Favourites';
import OrderTracker from './pages/customer/OrderTracker';
import PaymentMethods from './pages/customer/PaymentMethods';
import SavedAddresses from './pages/customer/SavedAddresses';
import CustomerProfile from './pages/customer/Profile';

// Vendor pages
import VendorDashboard from './pages/VendorDashboard';
import ProductUpload from './pages/vendor/ProductUpload';
import ProductManagement from './pages/vendor/ProductManagement';
import OrderManagement from './pages/vendor/OrderManagement';
import StockOrderManager from './pages/vendor/StockOrderManager';
import VendorProfile from './pages/vendor/Profile';
import SubscriptionSelection from './pages/vendor/SubscriptionSelection';
import MySubscription from './pages/vendor/MySubscription';
import AIImageEnhancementPage from './pages/vendor/AIImageEnhancement';
import VendorAnalytics from './pages/vendor/Analytics';

// Admin pages
import AdminDashboard from './pages/AdminDashboard';
import Vendors from './pages/admin/Vendors';
import Customers from './pages/admin/Customers';
import AdminProducts from './pages/admin/Products';
import GIVerification from './pages/admin/GIVerification';
import Analytics from './pages/admin/Analytics';
import Profile from './pages/admin/Profile';
import SubscriptionManagement from './pages/admin/SubscriptionManagement';
import Notifications from './pages/admin/Notifications';
import SubscriptionRequired from './components/SubscriptionRequired';
import ProtectedRoute from './components/ProtectedRoute';

// Add new import
import Payment from './pages/Payment';

function App() {
  const { user, isAuthenticated, loading } = useAuth();
  
  return (
    <>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/makers" element={<Makers />} />
        <Route path="/maker/:id" element={<MakerDetails />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/product/:id" element={<ProductDetails />} />
        <Route path="/about-gi" element={<AboutGI />} />
        <Route path="/interactive-gi-map" element={<InteractiveGIMap />} />
        <Route path="*" element={<NotFound />} />

        {/* Customer routes */}
        <Route
          path="/customer-dashboard"
          element={
            <ProtectedRoute allowedRoles={['customer']}>
              <CustomerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer-dashboard/favourites"
          element={
            <ProtectedRoute allowedRoles={['customer']}>
              <Favourites />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer-dashboard/orders"
          element={
            <ProtectedRoute allowedRoles={['customer']}>
              <OrderTracker />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer-dashboard/payment-methods"
          element={
            <ProtectedRoute allowedRoles={['customer']}>
              <PaymentMethods />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer-dashboard/saved-addresses"
          element={
            <ProtectedRoute allowedRoles={['customer']}>
              <SavedAddresses />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer-dashboard/profile"
          element={
            <ProtectedRoute allowedRoles={['customer']}>
              <CustomerProfile />
            </ProtectedRoute>
          }
        />

        {/* Vendor routes */}
        <Route
          path="/vendor-dashboard"
          element={
            <ProtectedRoute allowedRoles={['vendor']}>
              <VendorDashboard />
            </ProtectedRoute>
          }
        />
        {/* Remove the path to subscription-selection since we want to skip it */}
        <Route
          path="/vendor/my-subscription"
          element={
            <ProtectedRoute allowedRoles={['vendor']}>
              <MySubscription />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vendor/product/upload"
          element={
            <ProtectedRoute allowedRoles={['vendor']}>
              <ProductUpload />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vendor/products"
          element={
            <ProtectedRoute allowedRoles={['vendor']}>
              <ProductManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vendor/orders"
          element={
            <ProtectedRoute allowedRoles={['vendor']}>
              <OrderManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vendor/stock-order-manager"
          element={
            <ProtectedRoute allowedRoles={['vendor']}>
              <StockOrderManager />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vendor/analytics"
          element={
            <ProtectedRoute allowedRoles={['vendor']}>
              <VendorAnalytics />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vendor/profile"
          element={
            <ProtectedRoute allowedRoles={['vendor']}>
              <VendorProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vendor/ai-image-enhancement"
          element={
            <ProtectedRoute allowedRoles={['vendor']}>
              <AIImageEnhancementPage />
            </ProtectedRoute>
          }
        />

        {/* Admin routes */}
        <Route
          path="/admin-dashboard"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-dashboard/vendors"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Vendors />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-dashboard/customers"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Customers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-dashboard/products"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminProducts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-dashboard/gi-tags"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <GIVerification />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-dashboard/analytics"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Analytics />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-dashboard/profile"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-dashboard/subscriptions"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <SubscriptionManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-dashboard/notifications"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Notifications />
            </ProtectedRoute>
          }
        />
        
        {/* Add new payment route before the catch-all route */}
        <Route path="/payment" element={<Payment />} />
        
      </Routes>
      <Toaster />
      <ChatbotWidget />
    </>
  );
}

export default App;
