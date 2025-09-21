
import { useState, useEffect } from 'react';
import { Heart, Trash2, ShoppingBag, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import CustomerLayout from '@/components/CustomerLayout';
import { Favorite, Product } from '@/types/products';

const Favourites = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchFavorites();
  }, [user]);

  const fetchFavorites = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Fetch favorites with product details
      const { data, error } = await supabase
        .from('favorites')
        .select(`
          id,
          user_id,
          product_id,
          created_at,
          product:products(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Transform the data to match our Favorite interface
      const formattedFavorites = data.map(item => ({
        id: item.id,
        user_id: item.user_id,
        product_id: item.product_id,
        product: item.product as Product,
        createdAt: item.created_at,
      }));
      
      setFavorites(formattedFavorites);
    } catch (error) {
      console.error('Error fetching favorites:', error);
      toast.error('Failed to load your favorites');
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (favoriteId: string) => {
    try {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('id', favoriteId);
      
      if (error) throw error;
      
      // Update local state
      setFavorites(prev => prev.filter(fav => fav.id !== favoriteId));
      
      toast.success('Product removed from favorites');
    } catch (error) {
      console.error('Error removing favorite:', error);
      toast.error('Failed to remove from favorites');
    }
  };

  const handleBuyNow = (productId: string) => {
    navigate(`/product/${productId}`);
  };

  return (
    <CustomerLayout title="My Favorites">
      <div className="max-w-6xl mx-auto">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : favorites.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-6">
              <Heart className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-medium mb-2">No favorites yet</h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-8">
              Browse our marketplace and start adding products to your favorites.
            </p>
            <Link to="/marketplace">
              <Button>
                Explore Products
              </Button>
            </Link>
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <p className="text-muted-foreground">
                You have {favorites.length} {favorites.length === 1 ? 'product' : 'products'} in your favorites
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {favorites.map((favorite) => (
                  <motion.div
                    key={favorite.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="relative"
                  >
                    <Card className="overflow-hidden h-full flex flex-col">
                      <Link to={`/product/${favorite.product_id}`} className="relative">
                        <div className="h-48 overflow-hidden">
                          <img
                            src={favorite.product?.images?.[0] || 'https://via.placeholder.com/300'}
                            alt={favorite.product?.name}
                            className="w-full h-full object-cover transition-transform hover:scale-105 duration-300"
                          />
                        </div>
                      </Link>
                      
                      <CardContent className="py-4 flex-grow">
                        <Link to={`/product/${favorite.product_id}`}>
                          <h3 className="font-medium text-lg mb-1 hover:text-primary transition-colors">
                            {favorite.product?.name}
                          </h3>
                        </Link>
                        <p className="text-muted-foreground text-sm line-clamp-2 mb-3">
                          {favorite.product?.description}
                        </p>
                        <p className="text-lg font-semibold">
                          ₹{favorite.product?.price.toLocaleString('en-IN')}
                        </p>
                      </CardContent>
                      
                      <CardFooter className="pt-0 pb-4 flex justify-between gap-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleBuyNow(favorite.product_id)}
                        >
                          <ShoppingBag className="mr-2 h-4 w-4" />
                          Buy Now
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="icon">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove from favorites?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will remove "{favorite.product?.name}" from your favorites list.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => removeFavorite(favorite.id)}
                              >
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </CardFooter>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </CustomerLayout>
  );
};

export default Favourites;
