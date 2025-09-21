
import React, { useEffect, useState } from 'react';
import { Flag } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types/products';
import GIBadge from '@/components/GIBadge';
import ProductCardAuthWrapper from '@/components/ProductCardAuthWrapper';
import { Button } from '@/components/ui/button';

const HeritageProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHeritageProducts = async () => {
      try {
        setLoading(true);
        // Fetch products that are traditional or cultural
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select(`
            *, 
            profiles!products_vendor_id_fkey(name, avatar_url)
          `)
          .eq('is_gi_approved', true)
          .not('region', 'is', null)
          .limit(3);
        
        if (productsError) {
          console.error('Error fetching heritage products:', productsError);
          return;
        }

        // For each product, fetch its maker information separately if maker_id exists
        const formattedProducts = await Promise.all(productsData.map(async (product) => {
          let makerData = null;
          
          if (product.maker_id) {
            const { data: maker, error: makerError } = await supabase
              .from('makers')
              .select('*')
              .eq('id', product.maker_id)
              .single();
            
            if (!makerError && maker) {
              makerData = maker;
            } else if (makerError) {
              console.error(`Error fetching maker for product ${product.id}:`, makerError);
            }
          }
          
          // Determine the best maker information to use
          const makerName = makerData?.maker_name || product.profiles?.name || 'Heritage Artisan';
          const makerImage = makerData?.maker_image_url || product.profiles?.avatar_url;
          const makerRegion = makerData?.maker_region || product.region || 'India';
          const makerStory = makerData?.maker_story || 'Traditional craftsperson skilled in heritage techniques.';
          
          return {
            ...product,
            vendor_name: product.profiles?.name || makerName,
            vendor_image: product.profiles?.avatar_url || makerImage,
            maker: {
              id: makerData?.id || product.vendor_id,
              name: makerName,
              image: makerImage || 'https://via.placeholder.com/400?text=Artisan',
              region: makerRegion,
              story: makerStory
            }
          };
        })) || [];
        
        setProducts(formattedProducts);
      } catch (err) {
        console.error('Unexpected error fetching heritage products:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHeritageProducts();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No heritage products available at this time.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="grid grid-cols-1 md:grid-cols-3 gap-4"
    >
      {products.map((product, index) => (
        <motion.div
          key={product.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1, duration: 0.5 }}
        >
          <Card className="h-full flex flex-col hover:shadow-medium transition-shadow duration-300">
            <Link to={`/product/${product.id}`} className="flex-grow">
              <div className="relative pt-[100%] overflow-hidden rounded-t-lg">
                <img
                  src={product.images?.[0] || 'https://via.placeholder.com/300?text=Product'}
                  alt={product.name}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null; // Prevent infinite loops
                    target.src = 'https://via.placeholder.com/300?text=Product';
                  }}
                />
                <div className="absolute top-2 left-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-vibrant-saffron text-white">
                    <Flag className="h-3 w-3 mr-1" />
                    Heritage
                  </span>
                </div>
                {product.region && (
                  <div className="absolute bottom-2 left-2 right-2">
                    <div className="bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-sm inline-flex items-center">
                      <span>{product.region}</span>
                    </div>
                  </div>
                )}
              </div>
            </Link>
            <CardContent className="p-4">
              <Link to={`/product/${product.id}`}>
                <h3 className="font-medium text-lg hover:text-primary transition-colors line-clamp-1">
                  {product.name}
                </h3>
              </Link>
              <p className="text-muted-foreground text-sm mt-1 line-clamp-2">
                {product.description || 'Traditional heritage product'}
              </p>
              <div className="mt-4 flex justify-between items-center">
                <span className="font-medium text-lg">₹{product.price}</span>
                <Link to={`/maker/${product.maker?.id || product.vendor_id}`} className="flex items-center">
                  <img
                    src={product.maker?.image || 'https://via.placeholder.com/40?text=Maker'}
                    alt={product.maker?.name || product.vendor_name}
                    className="w-6 h-6 rounded-full mr-2 object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null; // Prevent infinite loops
                      target.src = 'https://via.placeholder.com/40?text=Maker';
                    }}
                  />
                  <span className="text-xs text-muted-foreground line-clamp-1">
                    {product.maker?.name || product.vendor_name}
                  </span>
                </Link>
              </div>
            </CardContent>
            <CardFooter className="p-4 pt-0">
              <ProductCardAuthWrapper product={product}>
                {(handleAddToCart) => (
                  <Button 
                    onClick={() => {
                      handleAddToCart();
                      window.location.href = '/cart';
                    }}
                    className="w-full rounded-full bg-vibrant-spice hover:bg-vibrant-spice/90 text-white"
                  >
                    Buy Now
                  </Button>
                )}
              </ProductCardAuthWrapper>
            </CardFooter>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
};

export default HeritageProducts;
