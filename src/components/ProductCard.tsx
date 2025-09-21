
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingBag, Award, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Product } from '@/types/products';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface ProductCardProps {
  product: Product;
  index?: number;
  showBuyButton?: boolean;
}

const ProductCard = ({ product, index = 0, showBuyButton = true }: ProductCardProps) => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  
  // Fetch favorite status when component mounts
  useEffect(() => {
    if (isAuthenticated && user) {
      checkFavoriteStatus();
    }
  }, [user, product.id]);

  const checkFavoriteStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('*')
        .eq('user_id', user?.id)
        .eq('product_id', product.id)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error checking favorite status:', error);
        return;
      }
      
      setIsFavorite(!!data);
    } catch (error) {
      console.error('Error checking favorite status:', error);
    }
  };
  
  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated) {
      toast.error('Please log in to add favorites');
      return;
    }
    
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      
      if (isFavorite) {
        // Remove from favorites
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user?.id)
          .eq('product_id', product.id);
        
        if (error) throw error;
        setIsFavorite(false);
        toast.success('Removed from favorites');
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('favorites')
          .insert({
            user_id: user?.id,
            product_id: product.id
          });
        
        if (error) throw error;
        setIsFavorite(true);
        toast.success('Added to favorites');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorites');
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Handle Buy Now - direct to product details page
  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/product/${product.id}`);
  };

  const mainImage = product.images?.[0] || product.mainImage || 'https://via.placeholder.com/500';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group relative bg-white rounded-xl overflow-hidden shadow-soft border border-gray-100 hover:shadow-colorful transition-all duration-300"
    >
      <Link to={`/product/${product.id}`} className="block">
        <div className="relative h-56 overflow-hidden">
          <img 
            src={mainImage} 
            alt={product.name} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              e.currentTarget.src = "https://via.placeholder.com/500?text=Product+Image";
            }}
          />
          
          {/* Favorite button */}
          <button 
            onClick={toggleFavorite}
            className={`absolute top-3 right-3 p-2 rounded-full bg-white/80 backdrop-blur-sm z-10 transition-all duration-300 ${isProcessing ? 'pointer-events-none opacity-50' : ''}`}
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart 
              className={`h-5 w-5 transition-all duration-300 ${isFavorite ? 'fill-vibrant-spice text-vibrant-spice' : 'text-gray-500'}`}
            />
          </button>
          
          {/* Only show GI badge if product has is_gi_approved set to true */}
          {product.is_gi_approved && (
            <div className="absolute bottom-3 left-3">
              <Badge variant="secondary" className="bg-primary/90 text-white backdrop-blur-sm shadow-sm">
                <Award className="h-3.5 w-3.5 mr-1" />
                GI Certified
              </Badge>
            </div>
          )}
        </div>
        
        <div className="p-4">
          <div>
            {product.region && (
              <span className="text-xs text-muted-foreground">{product.region}</span>
            )}
            <h3 className="font-medium text-base mt-1 line-clamp-1">{product.name}</h3>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {product.description}
            </p>
          </div>
          
          <div className="mt-3 flex items-center justify-between">
            <span className="font-semibold text-lg">₹{product.price.toLocaleString('en-IN')}</span>
            {showBuyButton && (
              <Button 
                size="sm"
                variant="outline"
                onClick={handleBuyNow}
                className="group-hover:bg-vibrant-spice group-hover:text-white group-hover:border-vibrant-spice transition-all duration-300"
              >
                <ShoppingBag className="h-4 w-4 mr-1" />
                Buy Now
              </Button>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default ProductCard;
