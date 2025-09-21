import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'customer' | 'vendor' | 'admin';
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (name: string, email: string, password: string, role: 'customer' | 'vendor' | 'admin') => Promise<void>;
  loading: boolean;
  redirectToDashboard: () => string;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Enhanced function to determine the correct dashboard URL based on user role
  const redirectToDashboard = () => {
    if (!user) return '/login';

    // Return the appropriate dashboard based on role
    switch (user.role) {
      case 'admin':
        return '/admin-dashboard';
      case 'vendor':
        return '/vendor-dashboard';
      case 'customer':
        return '/'; // Customers are redirected to the homepage
      default:
        return '/login'; // Fallback to login if role is unknown
    }
  };

  useEffect(() => {
    // Check if this is a redirect from email verification
    const isVerificationRedirect = window.location.hash.includes('type=email_verification');
    if (isVerificationRedirect) {
      // Remove the hash and redirect to login
      window.location.hash = '';
      // Let the user know their email was verified successfully
      toast.success('Email verified successfully. Please log in.');
      // Redirect to login page
      window.location.href = '/login';
      return;
    }

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          // Use setTimeout(0) to prevent potential deadlock with Supabase client
          setTimeout(() => {
            fetchUserProfile(session?.user?.id);
          }, 0);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          localStorage.removeItem('gi_connect_user');
        }
      }
    );

    // THEN check for existing session
    const initializeAuth = async () => {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          await fetchUserProfile(session.user.id);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        setLoading(false);
      }
    };

    initializeAuth();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId?: string) => {
    if (!userId) {
      setLoading(false);
      return;
    }
    
    try {
      console.log('Fetching user profile for ID:', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (error) {
        console.error('Error fetching user profile:', error);
        setLoading(false);
        return;
      }
      
      if (data) {
        console.log('User profile data retrieved:', data);
        const userData: User = {
          id: data.id,
          name: data.name,
          email: data.email,
          role: data.role as 'customer' | 'vendor' | 'admin',
        };
        
        setUser(userData);
        localStorage.setItem('gi_connect_user', JSON.stringify({
          ...userData,
          onboarding_status: data.onboarding_status
        }));
        console.log(`User role set to: ${userData.role}, appropriate redirect would be: ${redirectToDashboard()}`);
      } else {
        console.warn('No user profile found in profiles table');
        // If we have auth but no profile, we should try to create one
        const { data: authUser } = await supabase.auth.getUser();
        if (authUser?.user) {
          console.log('Attempting to create profile from auth user data');
          // Try to get role from user metadata
          const role = authUser.user.user_metadata?.role || 'customer';
          const name = authUser.user.user_metadata?.name || authUser.user.email;
          
          // Create a default profile
          await supabase.from('profiles').insert({
            id: authUser.user.id,
            email: authUser.user.email,
            name: name,
            role: role,
            onboarding_status: 'completed' // Set all users as completed onboarding
          });
          
          // Fetch the newly created profile
          await fetchUserProfile(authUser.user.id);
        }
      }
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      console.log('Attempting login for:', email);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'Failed to login');
      throw error;
    } finally {
      // Note: We don't set loading to false here because the onAuthStateChange 
      // handler will fetch the user profile and update loading state
    }
  };

  const register = async (name: string, email: string, password: string, role: 'customer' | 'vendor' | 'admin') => {
    setLoading(true);
    try {
      console.log('Registering new user:', email, 'with role:', role);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role,
          },
        },
      });

      if (error) throw error;
      
      // Check if email confirmation is required
      if (data?.user && !data.user.confirmed_at) {
        toast.success('Registration successful! Please check your email to verify your account.');
      } else {
        toast.success('Registration successful! You can now log in.');
      }
      
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(error.message || 'Failed to register');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
      localStorage.removeItem('gi_connect_user');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
        register,
        loading,
        redirectToDashboard,
        setUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
