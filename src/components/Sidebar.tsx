
import { ReactNode, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  ChevronLeft,
  ChevronRight,
  LogOut,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface SidebarItemProps {
  to: string;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  collapsed?: boolean;
}

const SidebarItem = ({ icon, label, to, active, collapsed }: SidebarItemProps) => (
  <Link to={to} className="w-full">
    <Button
      variant="ghost"
      className={cn(
        "w-full justify-start gap-3 p-3",
        collapsed ? "justify-center px-2" : "",
        active ? "bg-primary/10 text-primary hover:bg-primary/20" : ""
      )}
    >
      {icon}
      {!collapsed && <span>{label}</span>}
    </Button>
  </Link>
);

interface SidebarProps {
  children: ReactNode;
  title?: string;
  collapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
}

const Sidebar = ({ 
  children, 
  title = "Dashboard", 
  collapsed = false, 
  onCollapse 
}: SidebarProps) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(collapsed);

  useEffect(() => {
    setIsCollapsed(collapsed);
  }, [collapsed]);

  const toggleCollapse = () => {
    const newCollapsedState = !isCollapsed;
    setIsCollapsed(newCollapsedState);
    onCollapse && onCollapse(newCollapsedState);
  };

  const getUserInitials = () => {
    if (!user || !user.name) return 'U';
    return user.name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div 
        className={cn(
          "border-r border-gray-200 bg-gray-50 flex flex-col transition-all duration-300",
          isCollapsed ? "w-[70px]" : "w-[250px]"
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          {!isCollapsed && (
            <h2 className="font-semibold text-lg truncate">{title}</h2>
          )}
        </div>
        
        {/* User Profile */}
        <div className={cn(
          "p-4 border-b border-gray-200 flex items-center",
          isCollapsed ? "justify-center" : "justify-between"
        )}>
          {!isCollapsed ? (
            <>
              <div className="flex items-center">
                <Avatar className="h-8 w-8 mr-2">
                  <AvatarFallback>{getUserInitials()}</AvatarFallback>
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
              <Button 
                variant="ghost" 
                size="icon" 
                className="ml-2 flex-shrink-0"
                onClick={toggleCollapse}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Avatar className="h-8 w-8">
                <AvatarFallback>{getUserInitials()}</AvatarFallback>
              </Avatar>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-[70px] border border-gray-200 bg-white rounded-full h-7 w-7 shadow-sm"
                onClick={toggleCollapse}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
        
        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {children}
        </div>
        
        {/* Logout */}
        <div className="p-3 border-t border-gray-200">
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start gap-3 p-3 text-red-500 hover:text-red-600 hover:bg-red-50",
              isCollapsed && "justify-center px-2"
            )}
            onClick={logout}
          >
            <LogOut className="h-5 w-5" />
            {!isCollapsed && <span>Logout</span>}
          </Button>
        </div>
      </div>
    </div>
  );
};

Sidebar.Item = SidebarItem;

export default Sidebar;
