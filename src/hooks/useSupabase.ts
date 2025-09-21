
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  supabaseService,
  Profile,
  Product,
  Order,
} from '@/services/supabaseService';

// Custom hook for handling loading states
export const useLoading = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  const startLoading = () => setIsLoading(true);
  const stopLoading = () => setIsLoading(false);
  
  return {
    isLoading,
    startLoading,
    stopLoading,
  };
};

// Hook to fetch user profile data
export const useProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const refetch = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const userProfile = await supabaseService.profiles.getCurrentUserProfile();
      setProfile(userProfile);
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    refetch();
  }, [user]);
  
  return { profile, loading, error, refetch };
};

// Hook to get current user with profile data
export const useCurrentUser = () => {
  const { user } = useAuth();
  const { profile, loading, error, refetch } = useProfile();
  
  return { 
    user: profile, 
    loading, 
    error,
    refetch
  };
};

// Demo orders for UI development
const demoOrders = [
  {
    id: '1',
    customer_id: 'cust1',
    product_id: 'prod1',
    quantity: 2,
    total_price: 5000,
    status: 'delivered',
    created_at: '2023-06-01T10:00:00Z',
    updated_at: '2023-06-03T14:30:00Z',
    shipping_address: '123 Main St, New Delhi, India',
    product: {
      id: 'prod1',
      name: 'Pashmina Shawl',
      description: 'Handcrafted Pashmina Shawl from Kashmir',
      price: 2500,
      images: ['https://example.com/pashmina1.jpg'],
      region: 'Kashmir',
      is_gi_approved: true,
      vendor_id: 'vendor1',
      stock: 5,
      videos: [],
      category: 'Textiles',
      location: 'Srinagar',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    }
  },
  {
    id: '2',
    customer_id: 'cust1',
    product_id: 'prod2',
    quantity: 1,
    total_price: 3200,
    status: 'processing',
    created_at: '2023-07-15T11:20:00Z',
    updated_at: '2023-07-15T11:20:00Z',
    shipping_address: '456 Park Ave, Mumbai, India',
    product: {
      id: 'prod2',
      name: 'Banarasi Silk Saree',
      description: 'Authentic Banarasi Silk Saree with Gold Zari Work',
      price: 3200,
      images: ['https://example.com/banarasi1.jpg'],
      region: 'Uttar Pradesh',
      is_gi_approved: true,
      vendor_id: 'vendor1',
      stock: 3,
      videos: [],
      category: 'Textiles',
      location: 'Varanasi',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    }
  }
];

// Order statuses used throughout the app
export const orderStatuses = [
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

// Hook to fetch customer orders from database
export const useCustomerOrders = (customerId?: string) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const fetchOrders = async () => {
    if (!customerId) {
      setOrders([]);
      return;
    }
    
    try {
      setLoading(true);
      
      // Fetch orders with product details
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (ordersError) {
        throw ordersError;
      }

      // Fetch product details for each order
      const ordersWithProducts = await Promise.all(
        (ordersData || []).map(async (order) => {
          const { data: product } = await supabase
            .from('products')
            .select('*')
            .eq('id', order.product_id)
            .single();

          return {
            ...order,
            product: product || null
          };
        })
      );

      setOrders(ordersWithProducts as Order[]);
      setError(null);
    } catch (err) {
      console.error('Error fetching customer orders:', err);
      setError('Failed to fetch orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchOrders();
  }, [customerId]);
  
  return { 
    orders, 
    loading, 
    error,
    refetch: fetchOrders
  };
};

// Hook to fetch vendor orders - returns demo data since orders table was removed
export const useVendorOrders = (vendorId?: string) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // Convert demo orders to match the Order type exactly
    const typedOrders = demoOrders.map(order => ({
      ...order,
      shipping_address: order.shipping_address || null
    })) as Order[];
    
    setOrders(typedOrders);
  }, [vendorId]);
  
  return { 
    orders, 
    loading, 
    error,
    refetch: () => {},
    statuses: orderStatuses
  };
};

// Hook for useOrderStatuses - returns the order statuses array
export const useOrderStatuses = () => {
  return { statuses: orderStatuses };
};

// Demo payment methods
const demoPaymentMethods = [
  {
    id: '1',
    user_id: 'user1',
    method_type: 'card',
    is_default: true,
    card_number: '4111111111111111',
    expiry: '12/25',
    name: 'John Doe',
    brand: 'Visa',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z'
  },
  {
    id: '2',
    user_id: 'user1',
    method_type: 'upi',
    is_default: false,
    details: {
      upi_id: 'user@ybl'
    },
    created_at: '2023-02-01T00:00:00Z',
    updated_at: '2023-02-01T00:00:00Z'
  }
];

// Hook for PaymentMethods - returns demo data since payment_methods table was removed
export const usePaymentMethods = () => {
  const { user } = useAuth();
  
  // Return empty array since table was removed
  return { 
    paymentMethods: demoPaymentMethods, 
    loading: false, 
    error: '' 
  };
};

// Hook for user addresses
export const useUserAddresses = (userId?: string) => {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const refetch = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', userId)
        .order('is_default', { ascending: false });
        
      if (error) throw error;
      setAddresses(data || []);
    } catch (err) {
      console.error('Error fetching addresses:', err);
      setError('Failed to load addresses');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    refetch();
  }, [userId]);
  
  return {
    addresses,
    loading,
    error,
    refetch
  };
};

export default {
  useProfile,
  useCurrentUser,
  useCustomerOrders,
  useVendorOrders,
  useOrderStatuses,
  useUserAddresses,
  usePaymentMethods,
  useLoading,
  orderStatuses
};
