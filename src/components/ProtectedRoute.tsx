
import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: ('admin' | 'vendor' | 'customer')[];
}

const ProtectedRoute = ({ children, allowedRoles = [] }: ProtectedRouteProps) => {
  const { user, isAuthenticated, loading, redirectToDashboard } = useAuth();
  const location = useLocation();
  const [isCheckingRedirect, setIsCheckingRedirect] = useState(true);

  useEffect(() => {
    // Show an error message if user tried to access a route they don't have permission for
    if (!loading && isAuthenticated && allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
      console.log(`Access denied: User role ${user.role} not in allowed roles:`, allowedRoles);
      toast.error("You don't have permission to access this page");
    }
    
    // Give a small delay to ensure auth state is fully loaded before deciding on redirect
    const timer = setTimeout(() => {
      setIsCheckingRedirect(false);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [isAuthenticated, loading, user, allowedRoles]);

  if (loading || isCheckingRedirect) {
    // Show loading state while checking authentication
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  // If user isn't authenticated, redirect to login page
  if (!isAuthenticated) {
    console.log('Protected route: User not authenticated, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If there are allowed roles and the user's role isn't in the list, redirect to their appropriate dashboard
  if (allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
    console.log(`Role mismatch: User role ${user.role} not in allowed roles:`, allowedRoles);
    
    // Get the appropriate dashboard based on user role
    const appropriateDashboard = redirectToDashboard();
    console.log('Redirecting to role-appropriate dashboard:', appropriateDashboard);
    
    return <Navigate to={appropriateDashboard} replace />;
  }

  console.log('Protected route: Access granted');
  return <>{children}</>;
};

export default ProtectedRoute;
