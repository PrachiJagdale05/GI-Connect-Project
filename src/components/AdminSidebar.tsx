
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Package,
  ShieldCheck,
  BarChart3,
  Award,
  Settings,
  ChevronDown,
  ChevronRight,
  LogOut,
  UserCog,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';

const AdminSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    if (user) {
      setUserData(user);
    }
  }, [user]);

  const menuItems = [
    {
      title: 'Dashboard',
      icon: <LayoutDashboard className="h-5 w-5" />,
      path: '/admin-dashboard',
    },
    {
      title: 'Vendors',
      icon: <UserCog className="h-5 w-5" />,
      path: '/admin-dashboard/vendors',
    },
    {
      title: 'Customers',
      icon: <Users className="h-5 w-5" />,
      path: '/admin-dashboard/customers',
    },
    {
      title: 'Products',
      icon: <Package className="h-5 w-5" />,
      path: '/admin-dashboard/products',
    },
    {
      title: 'GI Verification',
      icon: <ShieldCheck className="h-5 w-5" />,
      path: '/admin-dashboard/gi-tags',
    },
    {
      title: 'Analytics',
      icon: <BarChart3 className="h-5 w-5" />,
      path: '/admin-dashboard/analytics',
    },
    {
      title: 'Subscriptions',
      icon: <Award className="h-5 w-5" />,
      path: '/admin-dashboard/subscriptions',
    },
    {
      title: 'Profile',
      icon: <Settings className="h-5 w-5" />,
      path: '/admin-dashboard/profile',
    },
  ];

  const isActiveRoute = (path: string) => {
    return location.pathname === path;
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  return (
    <div className="border-r border-border h-full min-h-screen w-64 py-6 px-4 flex flex-col bg-background">
      <div className="flex items-center mb-8 px-2">
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg">
          GI
        </div>
        <span className="ml-3 text-xl font-semibold">GI Connect</span>
      </div>

      <div className="flex-1">
        <div className="space-y-1">
          {menuItems.map((item) => (
            <Button
              key={item.path}
              variant={isActiveRoute(item.path) ? 'secondary' : 'ghost'}
              className={`w-full justify-start ${
                isActiveRoute(item.path)
                  ? 'bg-primary/5 text-primary'
                  : 'text-muted-foreground'
              }`}
              onClick={() => navigate(item.path)}
            >
              {item.icon}
              <span className="ml-3">{item.title}</span>
            </Button>
          ))}
        </div>
      </div>

      <div className="pt-4">
        <Separator />
        <div className="pt-4 flex items-center px-2">
          <Avatar className="h-9 w-9">
            <AvatarImage
              src={userData?.user_metadata?.avatar_url}
              alt={userData?.user_metadata?.name || 'User'}
            />
            <AvatarFallback className="bg-primary/10 text-primary">
              {userData?.user_metadata?.name?.[0]?.toUpperCase() || 'A'}
            </AvatarFallback>
          </Avatar>
          <div className="ml-3 flex-1 truncate">
            <p className="text-sm font-medium leading-none">
              {userData?.user_metadata?.name || 'Admin User'}
            </p>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {userData?.email || ''}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-md hover:bg-accent"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminSidebar;
