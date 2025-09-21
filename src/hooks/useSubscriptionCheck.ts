
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const useSubscriptionCheck = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Always return values that indicate unlimited products and no restrictions
  return {
    loading: false,
    hasActiveSubscription: true,
    productLimit: null, // null means unlimited
    currentProductCount: 0,
    canAddNewProduct: () => true, // Always allow adding new products
    subscriptionData: {
      plan_name: 'unlimited',
      commission_rate: 0,
      product_limit: null
    }
  };
};
