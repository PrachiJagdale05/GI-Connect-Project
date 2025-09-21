
import { ReactNode, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import { 
  LayoutDashboard,
  Package, 
  ShoppingBag,
  TrendingUp,
  UserCircle,
  Truck,
  Heart,
  MapPin,
  CreditCard,
  User,
  Shield,
  Users,
  Bell,
  FileText,
  Loader2
} from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
  role?: 'vendor' | 'customer' | 'admin';
}

const DashboardLayout = ({ children, title = "Dashboard", role: explicitRole }: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { role: fetchedRole, loading: roleLoading, error: roleError } = useUserRole();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Determine the effective role - prioritize explicitly passed role, then fetched role
  const effectiveRole = explicitRole || fetchedRole || (user?.role as 'vendor' | 'customer' | 'admin');
  
  // Calculate loading state
  const isLoading = authLoading || roleLoading;
  
  // Redirect if not authenticated (but only after loading is complete)
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, isLoading, navigate]);
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }
  
  // Show error state
  if (roleError) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50 p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription>
            {roleError}. Please try <button className="underline" onClick={() => window.location.reload()}>refreshing</button> or <button className="underline" onClick={() => navigate('/login')}>logging in again</button>.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  // Don't render anything if not authenticated
  if (!isAuthenticated || !user) {
    return null;
  }
  
  // If we have an explicit role but it doesn't match the user's role, show an error message
  if (explicitRole && user.role && explicitRole !== user.role) {
    console.log(`Role mismatch: User is ${user.role} but trying to access ${explicitRole} dashboard`);
    
    return (
      <div className="flex flex-col items-center justify-center h-screen p-6 bg-gray-50">
        <h1 className="text-2xl font-semibold mb-4">Access Denied</h1>
        <p className="text-gray-600 mb-6 text-center">
          You don't have permission to access the {explicitRole} dashboard.
        </p>
        <button 
          className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
          onClick={() => navigate(`/${user.role}-dashboard`)}
        >
          Go to {user.role} Dashboard
        </button>
      </div>
    );
  }
  
  // Make sure we have a role before rendering the dashboard
  if (!effectiveRole) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50 p-4">
        <Alert className="max-w-md">
          <AlertDescription>
            Unable to determine your user role. Please try <button className="underline" onClick={() => window.location.reload()}>refreshing</button> or <button className="underline" onClick={() => navigate('/login')}>logging in again</button>.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar 
        title={`${effectiveRole.charAt(0).toUpperCase() + effectiveRole.slice(1)} Dashboard`} 
        collapsed={sidebarCollapsed}
        onCollapse={setSidebarCollapsed}
      >
        {/* Vendor Sidebar Items */}
        {effectiveRole === 'vendor' && (
          <>
            <Sidebar.Item
              to="/vendor-dashboard"
              label="Dashboard"
              icon={<LayoutDashboard className="h-5 w-5" />}
              active={title === "Dashboard"}
              collapsed={sidebarCollapsed}
            />
            <Sidebar.Item
              to="/vendor/products"
              label="Products"
              icon={<Package className="h-5 w-5" />}
              active={title === "Product Management"}
              collapsed={sidebarCollapsed}
            />
            <Sidebar.Item
              to="/vendor/orders"
              label="Orders"
              icon={<ShoppingBag className="h-5 w-5" />}
              active={title === "Order Management"}
              collapsed={sidebarCollapsed}
            />
            <Sidebar.Item
              to="/vendor/stock-order-manager"
              label="Stock Manager"
              icon={<Truck className="h-5 w-5" />}
              active={title === "Stock & Order Manager"}
              collapsed={sidebarCollapsed}
            />
            <Sidebar.Item
              to="/vendor/analytics"
              label="Analytics"
              icon={<TrendingUp className="h-5 w-5" />}
              active={title === "Analytics Dashboard"}
              collapsed={sidebarCollapsed}
            />
            <Sidebar.Item
              to="/vendor/profile"
              label="Profile"
              icon={<UserCircle className="h-5 w-5" />}
              active={title === "Profile"}
              collapsed={sidebarCollapsed}
            />
          </>
        )}

        {/* Customer Sidebar Items */}
        {effectiveRole === 'customer' && (
          <>
            <Sidebar.Item
              to="/customer-dashboard"
              label="Dashboard"
              icon={<LayoutDashboard className="h-5 w-5" />}
              active={title === "Customer Dashboard"}
              collapsed={sidebarCollapsed}
            />
            <Sidebar.Item
              to="/customer-dashboard/orders"
              label="My Orders"
              icon={<Truck className="h-5 w-5" />}
              active={title === "My Orders"}
              collapsed={sidebarCollapsed}
            />
            <Sidebar.Item
              to="/customer-dashboard/favourites"
              label="Favourites"
              icon={<Heart className="h-5 w-5" />}
              active={title === "Favourites"}
              collapsed={sidebarCollapsed}
            />
            <Sidebar.Item
              to="/customer-dashboard/saved-addresses"
              label="Saved Addresses"
              icon={<MapPin className="h-5 w-5" />}
              active={title === "Saved Addresses"}
              collapsed={sidebarCollapsed}
            />
            <Sidebar.Item
              to="/customer-dashboard/payment-methods"
              label="Payment Methods"
              icon={<CreditCard className="h-5 w-5" />}
              active={title === "Payment Methods"}
              collapsed={sidebarCollapsed}
            />
            <Sidebar.Item
              to="/customer-dashboard/profile"
              label="Profile"
              icon={<User className="h-5 w-5" />}
              active={title === "Profile"}
              collapsed={sidebarCollapsed}
            />
          </>
        )}
        
        {/* Admin Sidebar Items */}
        {effectiveRole === 'admin' && (
          <>
            <Sidebar.Item
              to="/admin-dashboard"
              label="Dashboard"
              icon={<LayoutDashboard className="h-5 w-5" />}
              active={title === "Admin Dashboard"}
              collapsed={sidebarCollapsed}
            />
            <Sidebar.Item
              to="/admin-dashboard/vendors"
              label="Vendors"
              icon={<UserCircle className="h-5 w-5" />}
              active={title === "Vendors"}
              collapsed={sidebarCollapsed}
            />
            <Sidebar.Item
              to="/admin-dashboard/customers"
              label="Customers"
              icon={<Users className="h-5 w-5" />}
              active={title === "Customers"}
              collapsed={sidebarCollapsed}
            />
            <Sidebar.Item
              to="/admin-dashboard/products"
              label="Products"
              icon={<Package className="h-5 w-5" />}
              active={title === "Products"}
              collapsed={sidebarCollapsed}
            />
            <Sidebar.Item
              to="/admin-dashboard/gi-tags"
              label="GI Verification"
              icon={<Shield className="h-5 w-5" />}
              active={title === "GI Verification"}
              collapsed={sidebarCollapsed}
            />
            <Sidebar.Item
              to="/admin-dashboard/analytics"
              label="Analytics"
              icon={<TrendingUp className="h-5 w-5" />}
              active={title === "Analytics"}
              collapsed={sidebarCollapsed}
            />
            <Sidebar.Item
              to="/admin-dashboard/notifications"
              label="Notifications"
              icon={<Bell className="h-5 w-5" />}
              active={title === "Notifications"}
              collapsed={sidebarCollapsed}
            />
            <Sidebar.Item
              to="/admin-dashboard/profile"
              label="Profile"
              icon={<User className="h-5 w-5" />}
              active={title === "Profile"}
              collapsed={sidebarCollapsed}
            />
          </>
        )}
      </Sidebar>
      
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <h1 className="text-2xl font-semibold mb-6">{title}</h1>
          {children}
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
