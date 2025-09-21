
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export function useUserRole() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<'admin' | 'vendor' | 'customer' | null>(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (authLoading) {
        // Wait for auth to finish loading
        return;
      }

      if (!isAuthenticated || !user) {
        setLoading(false);
        setRole(null);
        return;
      }

      try {
        // User role is already available in the user object from AuthContext
        if (user.role) {
          setRole(user.role as 'admin' | 'vendor' | 'customer');
        } else {
          setError('User role not found');
        }
      } catch (err) {
        console.error('Error fetching user role:', err);
        setError('Failed to fetch user role');
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [user, isAuthenticated, authLoading]);

  return { role, loading, error };
}
