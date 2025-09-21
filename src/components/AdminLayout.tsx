
import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  Shield, 
  CircleDollarSign, 
  TrendingUp, 
  Bell, 
  User, 
  LogOut,
  UserCircle,
  ChevronLeft,
  ChevronRight,
  Menu
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  activeRoute?: string; // Optional activeRoute prop
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, title, activeRoute }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };
  
  const menuItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard', href: '/admin-dashboard' },
    { icon: <Users size={20} />, label: 'Vendors', href: '/admin-dashboard/vendors' },
    { icon: <User size={20} />, label: 'Customers', href: '/admin-dashboard/customers' },
    { icon: <Package size={20} />, label: 'Products', href: '/admin-dashboard/products' },
    { icon: <Shield size={20} />, label: 'GI Verification', href: '/admin-dashboard/gi-tags' },
    { icon: <CircleDollarSign size={20} />, label: 'Subscriptions', href: '/admin-dashboard/subscriptions' },
    { icon: <TrendingUp size={20} />, label: 'Analytics', href: '/admin-dashboard/analytics' },
    { icon: <Bell size={20} />, label: 'Notifications', href: '/admin-dashboard/notifications' },
    { icon: <UserCircle size={20} />, label: 'Profile', href: '/admin-dashboard/profile' },
    { icon: <LogOut size={20} />, label: 'Logout', href: '#logout', onClick: handleLogout },
  ];
  
  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user || !user.name) return 'A';
    return user.name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  // Get avatar URL from custom user properties or metadata
  const getAvatarUrl = () => {
    // Since avatar_url doesn't exist on the User type directly, 
    // it might be in user metadata or user profile
    if (!user) return '';
    
    // Check if it's in the user object or in metadata
    // @ts-ignore - Using any here since the user object might have additional properties
    const avatarUrl = (user as any).avatar_url || user.user_metadata?.avatar_url;
    return avatarUrl || '';
  };
  
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div
        className={cn(
          "flex flex-col w-64 bg-white border-r transition-transform duration-300 ease-in-out fixed h-screen",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-center border-b border-gray-200">
          <h2 className="font-semibold text-lg">Admin Dashboard</h2>
        </div>
        
        {/* User Profile */}
        <div className="p-4 border-b border-gray-200 flex items-center">
          <Avatar className="h-8 w-8 mr-2">
            <AvatarFallback>{getUserInitials()}</AvatarFallback>
            <AvatarImage src={getAvatarUrl()} />
          </Avatar>
          <div className="overflow-hidden">
            <p className="font-medium text-sm truncate" title={user?.name}>
              {user?.name}
            </p>
            <p className="text-xs text-muted-foreground truncate" title={user?.email}>
              {user?.email}
            </p>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-1">
            {menuItems.map((item, index) => {
              // Determine if this menu item is active
              const isActive = activeRoute 
                ? item.href === activeRoute 
                : location.pathname === item.href;
                
              return (
                <li key={index}>
                  <Link
                    to={item.onClick ? '#' : item.href}
                    onClick={(e) => {
                      if (item.onClick) {
                        e.preventDefault();
                        item.onClick();
                      }
                    }}
                    className={cn(
                      "flex items-center p-2 rounded-md hover:bg-gray-100 transition-colors duration-200",
                      isActive ? "bg-gray-100 font-semibold text-primary" : ""
                    )}
                  >
                    {item.icon}
                    <span className="ml-2">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
      
      {/* Main Content */}
      <div className={cn(
        "flex-1 flex flex-col transition-all duration-300",
        isSidebarOpen ? "ml-64" : "ml-0"
      )}>
        {/* Header */}
        <header className="flex items-center justify-between h-16 bg-white border-b p-4 sticky top-0 z-10">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="mr-2"
            >
              {isSidebarOpen ? <ChevronLeft /> : <Menu />}
            </Button>
            <h1 className="text-xl font-semibold">{title}</h1>
          </div>
        </header>
        
        {/* Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
