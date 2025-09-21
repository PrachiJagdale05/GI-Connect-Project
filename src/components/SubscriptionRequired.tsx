
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface SubscriptionRequiredProps {
  children: React.ReactNode;
  redirectTo?: string;
}

const SubscriptionRequired: React.FC<SubscriptionRequiredProps> = ({ 
  children
}) => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  
  // Show loading state
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Always render children - no subscription check
  return <>{children}</>;
};

export default SubscriptionRequired;
