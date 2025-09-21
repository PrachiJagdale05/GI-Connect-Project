import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// Profile types
export interface Profile {
  id: string;
  name: string;
  email: string;
  role: 'customer' | 'vendor' | 'admin';
  created_at: string;
  updated_at: string;
  // Add missing profile properties
  phone?: string;
  address?: string;
  company?: string;
  website?: string;
  bio?: string;
  avatar_url?: string;
}

// Product types
export interface Product {
  id: string;
  vendor_id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  images: string[];
  videos: string[];
  region: string | null;
  location: string | null;
  is_gi_approved: boolean;
  created_at: string;
  updated_at: string;
}

// Order types - simplified since the table was removed
export interface Order {
  id: string;
  customer_id: string;
  product_id: string | null;
  quantity: number;
  total_price: number;
  status: string;
  shipping_address: string | null;
  created_at: string;
  updated_at: string;
  // Add joined data properties
  product?: Product;
  customer?: Profile;
}

// GI Certification types
export interface GICertification {
  id: string;
  product_id: string;
  document: string;
  is_verified: boolean;
  admin_id: string | null;
  verification_date: string | null;
  created_at: string;
  updated_at: string;
}

// Address types
export interface Address {
  id: string;
  user_id: string;
  name: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// Favorite types
export interface Favorite {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
  product?: Product;
}

// Payment Method types
export interface PaymentMethod {
  id: string;
  user_id: string;
  method_type: 'cod' | 'card' | 'upi';
  is_default: boolean;
  details?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Profiles Service
export const profilesService = {
  async getCurrentUserProfile(): Promise<Profile | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return null;
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (error) {
        console.error('Error fetching current user profile:', error);
        return null;
      }
      
      return data as Profile;
    } catch (error) {
      console.error('Error in getCurrentUserProfile:', error);
      return null;
    }
  },
  
  async updateProfile(profile: Partial<Profile>): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }
      
      const { error } = await supabase
        .from('profiles')
        .update(profile)
        .eq('id', user.id);
        
      if (error) {
        console.error('Error updating profile:', error);
        return { success: false, error: error.message };
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error in updateProfile:', error);
      return { success: false, error: 'Failed to update profile' };
    }
  }
};

// Products Service
export const productsService = {
  
  async getAllProducts(): Promise<Product[]> {
    try {
      // Only show products that are approved or not requesting GI certification
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .in('gi_status', ['approved'])
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching products:', error);
        return [];
      }
      
      return data as Product[];
    } catch (error) {
      console.error('Error in getAllProducts:', error);
      return [];
    }
  },
  
  async getProductById(id: string): Promise<Product | null> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) {
        console.error('Error fetching product:', error);
        return null;
      }
      
      return data as Product;
    } catch (error) {
      console.error('Error in getProductById:', error);
      return null;
    }
  },
  
  async getProductsByVendor(vendorId: string): Promise<Product[]> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching vendor products:', error);
        return [];
      }
      
      return data as Product[];
    } catch (error) {
      console.error('Error in getProductsByVendor:', error);
      return [];
    }
  },
  
  async createProduct(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('products')
        .insert(product)
        .select();
        
      if (error) {
        console.error('Error creating product:', error);
        return { success: false, error: error.message };
      }
      
      return { success: true, id: data[0].id };
    } catch (error) {
      console.error('Error in createProduct:', error);
      return { success: false, error: 'Failed to create product' };
    }
  },
  
  async updateProduct(id: string, updates: Partial<Product>): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id);
        
      if (error) {
        console.error('Error updating product:', error);
        return { success: false, error: error.message };
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error in updateProduct:', error);
      return { success: false, error: 'Failed to update product' };
    }
  },
  
  async deleteProduct(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
        
      if (error) {
        console.error('Error deleting product:', error);
        return { success: false, error: error.message };
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error in deleteProduct:', error);
      return { success: false, error: 'Failed to delete product' };
    }
  }
};

// Orders Service - modified to return empty data since the table was removed
export const ordersService = {
  
  async getCustomerOrders(customerId: string): Promise<Order[]> {
    // Since orders table has been removed, return an empty array
    return [];
  },
  
  async getVendorOrders(vendorId: string): Promise<Order[]> {
    // Since orders table has been removed, return an empty array
    return [];
  },
  
  async createOrder(order: Omit<Order, 'id' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; id?: string; error?: string }> {
    // Since orders table has been removed, return error
    console.error('Orders functionality has been removed');
    return { success: false, error: 'Orders functionality has been removed' };
  },
  
  async updateOrderStatus(orderId: string, status: string): Promise<{ success: boolean; error?: string }> {
    // Since orders table has been removed, return error
    console.error('Orders functionality has been removed');
    return { success: false, error: 'Orders functionality has been removed' };
  },
  
  async getOrderStatuses(): Promise<[]> {
    // Since order_status table has been removed, return an empty array
    return [];
  }
};

// GI Certifications Service
export const giCertificationsService = {
  
  async getProductCertification(productId: string): Promise<GICertification | null> {
    try {
      const { data, error } = await supabase
        .from('gi_certifications')
        .select('*')
        .eq('product_id', productId)
        .single();
        
      if (error) {
        if (error.code !== 'PGRST116') { // Not found error
          console.error('Error fetching GI certification:', error);
        }
        return null;
      }
      
      return data as GICertification;
    } catch (error) {
      console.error('Error in getProductCertification:', error);
      return null;
    }
  },
  
  async submitCertification(certification: Omit<GICertification, 'id' | 'is_verified' | 'admin_id' | 'verification_date' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('gi_certifications')
        .insert(certification)
        .select();
        
      if (error) {
        console.error('Error submitting GI certification:', error);
        return { success: false, error: error.message };
      }
      
      return { success: true, id: data[0].id };
    } catch (error) {
      console.error('Error in submitCertification:', error);
      return { success: false, error: 'Failed to submit GI certification' };
    }
  },
  
  async verifyCertification(certificationId: string, adminId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('gi_certifications')
        .update({
          is_verified: true,
          admin_id: adminId,
          verification_date: new Date().toISOString()
        })
        .eq('id', certificationId);
        
      if (error) {
        console.error('Error verifying GI certification:', error);
        return { success: false, error: error.message };
      }
      
      // Also update the product's GI approval status
      const { data: certData } = await supabase
        .from('gi_certifications')
        .select('product_id')
        .eq('id', certificationId)
        .single();
      
      if (certData) {
        const { error: productError } = await supabase
          .from('products')
          .update({ is_gi_approved: true })
          .eq('id', certData.product_id);
          
        if (productError) {
          console.error('Error updating product GI approval:', productError);
        }
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error in verifyCertification:', error);
      return { success: false, error: 'Failed to verify GI certification' };
    }
  },
  
  async getPendingCertifications(): Promise<{ certification: GICertification; product: Product }[]> {
    try {
      const { data, error } = await supabase
        .from('gi_certifications')
        .select('*, products(*)')
        .eq('is_verified', false);
        
      if (error) {
        console.error('Error fetching pending certifications:', error);
        return [];
      }
      
      return data.map(item => ({
        certification: {
          id: item.id,
          product_id: item.product_id,
          document: item.document,
          is_verified: item.is_verified,
          admin_id: item.admin_id,
          verification_date: item.verification_date,
          created_at: item.created_at,
          updated_at: item.updated_at
        },
        product: item.products as Product
      }));
    } catch (error) {
      console.error('Error in getPendingCertifications:', error);
      return [];
    }
  }
};

// Addresses Service - Using direct SQL queries to bypass type issues
export const addressesService = {
  async getUserAddresses(userId: string): Promise<Address[]> {
    try {
      // Use direct query instead of rpc to avoid type issues
      const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', userId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching user addresses:', error);
        return [];
      }
      
      return (data || []) as Address[];
    } catch (error) {
      console.error('Error in getUserAddresses:', error);
      return [];
    }
  },
  
  async createAddress(address: Omit<Address, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }
      
      // If address is marked as default, update any existing default address first
      if (address.is_default) {
        await supabase
          .from('addresses')
          .update({ is_default: false })
          .eq('user_id', user.id)
          .eq('is_default', true);
      }
      
      // Insert new address
      const { data, error } = await supabase
        .from('addresses')
        .insert({
          user_id: user.id,
          name: address.name,
          address_line1: address.address_line1,
          address_line2: address.address_line2 || null,
          city: address.city,
          state: address.state,
          postal_code: address.postal_code,
          country: address.country,
          is_default: address.is_default
        })
        .select('id')
        .single();
        
      if (error) {
        console.error('Error creating address:', error);
        return { success: false, error: error.message };
      }
      
      return { success: true, id: data.id };
    } catch (error) {
      console.error('Error in createAddress:', error);
      return { success: false, error: 'Failed to create address' };
    }
  },
  
  async updateAddress(id: string, updates: Partial<Address>): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }
      
      // If address is marked as default, update any existing default address first
      if (updates.is_default) {
        await supabase
          .from('addresses')
          .update({ is_default: false })
          .eq('user_id', user.id)
          .eq('is_default', true);
      }
      
      // Update address
      const { error } = await supabase
        .from('addresses')
        .update({
          name: updates.name,
          address_line1: updates.address_line1,
          address_line2: updates.address_line2,
          city: updates.city,
          state: updates.state,
          postal_code: updates.postal_code,
          country: updates.country,
          is_default: updates.is_default
        })
        .eq('id', id)
        .eq('user_id', user.id);
        
      if (error) {
        console.error('Error updating address:', error);
        return { success: false, error: error.message };
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error in updateAddress:', error);
      return { success: false, error: 'Failed to update address' };
    }
  },
  
  async deleteAddress(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }
      
      const { error } = await supabase
        .from('addresses')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
        
      if (error) {
        console.error('Error deleting address:', error);
        return { success: false, error: error.message };
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error in deleteAddress:', error);
      return { success: false, error: 'Failed to delete address' };
    }
  }
};

// Favorites Service
export const favoritesService = {
  async getUserFavorites(userId: string): Promise<Favorite[]> {
    try {
      // Use direct query with join to avoid type issues
      const { data, error } = await supabase
        .from('favorites')
        .select(`
          id, 
          user_id, 
          product_id, 
          created_at,
          product:products(*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching user favorites:', error);
        return [];
      }
      
      // Transform the result to match our Favorite interface
      return (data || []).map(item => ({
        id: item.id,
        user_id: item.user_id,
        product_id: item.product_id,
        created_at: item.created_at,
        product: item.product
      })) as Favorite[];
    } catch (error) {
      console.error('Error in getUserFavorites:', error);
      return [];
    }
  },
  
  async addFavorite(productId: string): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }
      
      // Check if favorite already exists
      const { data: existingFav } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .maybeSingle();
        
      if (existingFav) {
        return { success: true, id: existingFav.id };
      }
      
      // Insert new favorite
      const { data, error } = await supabase
        .from('favorites')
        .insert({
          user_id: user.id,
          product_id: productId
        })
        .select('id')
        .single();
        
      if (error) {
        console.error('Error adding favorite:', error);
        return { success: false, error: error.message };
      }
      
      return { success: true, id: data.id };
    } catch (error) {
      console.error('Error in addFavorite:', error);
      return { success: false, error: 'Failed to add favorite' };
    }
  },
  
  async removeFavorite(productId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }
      
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId);
        
      if (error) {
        console.error('Error removing favorite:', error);
        return { success: false, error: error.message };
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error in removeFavorite:', error);
      return { success: false, error: 'Failed to remove favorite' };
    }
  },
  
  async isFavorite(productId: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return false;
      }
      
      const { data, error } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .maybeSingle();
        
      if (error) {
        console.error('Error checking favorite status:', error);
        return false;
      }
      
      return !!data;
    } catch (error) {
      console.error('Error in isFavorite:', error);
      return false;
    }
  }
};

// Payment Methods Service - modified since payment_methods table was removed
export const paymentMethodsService = {
  async getUserPaymentMethods(userId: string): Promise<[]> {
    // Since payment_methods table has been removed, return an empty array
    return [];
  },
  
  async addPaymentMethod(method: any): Promise<{ success: boolean; id?: string; error?: string }> {
    // Since payment_methods table has been removed, return error
    console.error('Payment methods functionality has been removed');
    return { success: false, error: 'Payment methods functionality has been removed' };
  },
  
  async updatePaymentMethod(id: string, updates: any): Promise<{ success: boolean; error?: string }> {
    // Since payment_methods table has been removed, return error
    console.error('Payment methods functionality has been removed');
    return { success: false, error: 'Payment methods functionality has been removed' };
  },
  
  async deletePaymentMethod(id: string): Promise<{ success: boolean; error?: string }> {
    // Since payment_methods table has been removed, return error
    console.error('Payment methods functionality has been removed');
    return { success: false, error: 'Payment methods functionality has been removed' };
  }
};

// Real-time updates
export const setupRealTimeListeners = () => {
  // Removed the orders channel listener since orders table is gone
  
  // Subscribe to product stock changes
  const productsChannel = supabase
    .channel('products-channel')
    .on('postgres_changes', 
      { event: 'UPDATE', schema: 'public', table: 'products' },
      (payload) => {
        const oldStock = payload.old?.stock;
        const newStock = payload.new.stock;
        
        // Only notify if stock changed
        if (oldStock !== undefined && newStock !== oldStock) {
          const productName = payload.new.name;
          if (newStock <= 5 && newStock > 0) {
            toast({
              title: 'Low Stock Alert',
              description: `${productName} is running low (${newStock} left)`,
              variant: 'destructive'
            });
          } else if (newStock === 0) {
            toast({
              title: 'Out of Stock',
              description: `${productName} is now out of stock`,
              variant: 'destructive'
            });
          } else if (oldStock === 0 && newStock > 0) {
            toast({
              title: 'Product Available',
              description: `${productName} is back in stock`,
            });
          }
        }
      }
    )
    .subscribe();

  // Return a function to unsubscribe when needed
  return () => {
    supabase.removeChannel(productsChannel);
  };
};

export const supabaseService = {
  profiles: profilesService,
  products: productsService,
  orders: ordersService,
  giCertifications: giCertificationsService,
  addresses: addressesService,
  favorites: favoritesService,
  paymentMethods: paymentMethodsService,
  setupRealTimeListeners
};

export default supabaseService;
