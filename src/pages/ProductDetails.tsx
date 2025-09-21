import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Heart, ShoppingBag, Minus, Plus, Award, ChevronRight, Share2, Loader2, User } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import GIBadge from '@/components/GIBadge';
import EnhancedProductGallery from '@/components/EnhancedProductGallery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { Product } from '@/types/products';

const ProductDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { addToCart } = useCart();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isProcessingFavorite, setIsProcessingFavorite] = useState(false);
  const [giCertification, setGiCertification] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        
        // Fetch product details
        const { data: productData, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) {
          throw error;
        }
        
        if (!productData) {
          navigate('/marketplace');
          return;
        }

        console.log("Fetched product data:", productData);
        
        // Fetch vendor details
        const { data: vendorData, error: vendorError } = await supabase
          .from('profiles')
          .select('name, avatar_url')
          .eq('id', productData.vendor_id)
          .single();
        
        if (vendorError && vendorError.code !== 'PGRST116') {
          console.error('Error fetching vendor:', vendorError);
        }
        
        // Fetch maker details if available
        let makerData = null;
        if (productData.maker_id) {
          const { data: maker, error: makerError } = await supabase
            .from('makers')
            .select('*')
            .eq('id', productData.maker_id)
            .single();
          
          if (makerError && makerError.code !== 'PGRST116') {
            console.error('Error fetching maker:', makerError);
          } else {
            makerData = maker;
          }
        }

        // Fetch GI certification document if available
        if (productData.is_gi_approved) {
          const { data: certData, error: certError } = await supabase
            .from('gi_certifications')
            .select('document')
            .eq('product_id', id)
            .maybeSingle();
          
          if (certError) {
            console.error('Error fetching GI certification:', certError);
          } else if (certData) {
            setGiCertification(certData.document);
          }
        }
        
        // Combine all data
        const fullProduct = {
          ...productData,
          vendor_name: vendorData?.name || 'Unknown Vendor',
          vendor_image: vendorData?.avatar_url || null,
          maker: makerData,
          inStock: productData.stock > 0
        };

        console.log("Full product data with videos:", fullProduct);
        
        setProduct(fullProduct);
        
        // Fetch related products (same category or region)
        const { data: relatedData, error: relatedError } = await supabase
          .from('products')
          .select('*')
          .neq('id', id)
          .eq('is_gi_approved', true)
          .or(`category.eq.${productData.category},region.eq.${productData.region}`)
          .limit(3);
        
        if (relatedError) {
          console.error('Error fetching related products:', relatedError);
        } else {
          setRelatedProducts(relatedData || []);
        }
        
        // Check if product is in user's favorites
        if (isAuthenticated && user) {
          const { data: favoriteData, error: favoriteError } = await supabase
            .from('favorites')
            .select('id')
            .eq('user_id', user.id)
            .eq('product_id', id)
            .single();
          
          if (favoriteError && favoriteError.code !== 'PGRST116') {
            console.error('Error checking favorite status:', favoriteError);
          } else {
            setIsFavorite(!!favoriteData);
          }
        }
        
      } catch (error) {
        console.error('Error fetching product details:', error);
        toast.error('Failed to load product details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchProduct();
  }, [id, isAuthenticated, user]);
  
  const handleQuantityChange = (amount: number) => {
    const newQuantity = selectedQuantity + amount;
    if (newQuantity >= 1 && newQuantity <= (product?.stock || 1)) {
      setSelectedQuantity(newQuantity);
    }
  };
  
  const handleBuyNow = () => {
    if (!product) return;
    
    if (selectedQuantity > product.stock!) {
      toast.error(`Only ${product.stock} items available`);
      return;
    }
    
    // Add the product to cart directly
    addToCart(product, selectedQuantity);
    
    // Navigate to the cart page
    navigate('/cart');
  };
  
  const toggleFavorite = async () => {
    if (!isAuthenticated) {
      toast.error('Please log in to add favorites');
      return;
    }
    
    if (isProcessingFavorite) return;
    
    try {
      setIsProcessingFavorite(true);
      
      if (isFavorite) {
        // Remove from favorites
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user?.id)
          .eq('product_id', id);
        
        if (error) throw error;
        setIsFavorite(false);
        toast.success('Removed from favorites');
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('favorites')
          .insert({
            user_id: user?.id,
            product_id: id
          });
        
        if (error) throw error;
        setIsFavorite(true);
        toast.success('Added to favorites');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorites');
    } finally {
      setIsProcessingFavorite(false);
    }
  };
  
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: product?.name || 'Check out this product',
        text: product?.description || 'I found this amazing product on GI Connect',
        url: window.location.href
      }).catch(err => {
        console.error('Error sharing:', err);
      });
    } else {
      // Fallback for browsers that don't support the Web Share API
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard');
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading product details...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }
  
  if (!product) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-2">Product Not Found</h2>
            <p className="text-muted-foreground mb-6">The product you're looking for doesn't exist or has been removed.</p>
            <Button onClick={() => navigate('/marketplace')}>
              Back to Marketplace
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <div className="flex-1 pt-24 pb-16">
        <div className="container mx-auto max-w-6xl px-4">
          {/* Breadcrumbs */}
          <div className="flex items-center text-sm text-muted-foreground mb-6">
            <span className="hover:text-primary cursor-pointer" onClick={() => navigate('/')}>Home</span>
            <ChevronRight className="h-4 w-4 mx-2" />
            <span className="hover:text-primary cursor-pointer" onClick={() => navigate('/marketplace')}>Marketplace</span>
            <ChevronRight className="h-4 w-4 mx-2" />
            <span className="text-foreground">{product.name}</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {/* Product Images and Videos */}
            <div>
              <EnhancedProductGallery
                productName={product.name}
                originalImages={product.images}
                generatedImages={product.generated_images}
                videos={product.videos}
              />
            </div>
            
            {/* Product Details */}
            <div>
              <div className="flex flex-col h-full">
                <div className="mb-auto">
                  {product.is_gi_approved && (
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 mb-3">
                      <Award className="h-3.5 w-3.5 mr-1.5" />
                      GI Certified
                    </Badge>
                  )}
                  
                  <h1 className="text-3xl font-semibold mb-2">{product.name}</h1>
                  
                  <div className="flex items-center text-sm text-muted-foreground mb-4">
                    {product.region && (
                      <span className="flex items-center">
                        <span>Region: {product.region}</span>
                      </span>
                    )}
                    {product.category && (
                      <>
                        <span className="mx-2">•</span>
                        <span>Category: {product.category}</span>
                      </>
                    )}
                  </div>
                  
                  <p className="text-2xl font-semibold mb-4">₹{product.price.toLocaleString('en-IN')}</p>
                  
                  <p className="text-muted-foreground mb-6">{product.description}</p>
                  
                  {product.vendor_name && (
                    <div className="flex items-center mb-6">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden mr-3">
                        {product.vendor_image ? (
                          <img 
                            src={product.vendor_image} 
                            alt={product.vendor_name} 
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-primary font-medium">
                            {product.vendor_name.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Sold by</p>
                        <p className="font-medium">{product.vendor_name}</p>
                      </div>
                    </div>
                  )}
                  
                  {product.is_gi_approved && product.region && product.id && (
                    <div className="mb-6">
                      <GIBadge 
                        giTag={product.giTag || product.name} 
                        region={product.region}
                        productName={product.name}
                        productId={product.id}
                      />
                    </div>
                  )}
                  
                  <Separator className="mb-6" />
                  
                  {/* Stock Status */}
                  <div className="mb-6">
                    <p className="flex items-center">
                      <span className="text-sm font-medium mr-2">Availability:</span>
                      {product.stock > 0 ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          In Stock ({product.stock} available)
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          Out of Stock
                        </Badge>
                      )}
                    </p>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="mt-4">
                  {product.stock > 0 && (
                    <div className="flex items-center mb-6">
                      <span className="text-sm font-medium mr-4">Quantity:</span>
                      <div className="flex items-center border border-input rounded-md">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-9 w-9 rounded-none"
                          onClick={() => handleQuantityChange(-1)}
                          disabled={selectedQuantity <= 1}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-12 text-center">{selectedQuantity}</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-9 w-9 rounded-none"
                          onClick={() => handleQuantityChange(1)}
                          disabled={selectedQuantity >= product.stock}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex flex-wrap gap-3">
                    <Button 
                      className="flex-1 min-w-[140px]"
                      size="lg"
                      onClick={handleBuyNow}
                      disabled={product.stock <= 0}
                    >
                      <ShoppingBag className="mr-2 h-5 w-5" />
                      Buy Now
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-11 w-11"
                      onClick={toggleFavorite}
                      disabled={isProcessingFavorite}
                    >
                      <Heart className={`h-5 w-5 ${isFavorite ? 'fill-vibrant-spice text-vibrant-spice' : ''}`} />
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-11 w-11"
                      onClick={handleShare}
                    >
                      <Share2 className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Product Details Tabs */}
          <div className="mb-16">
            <Tabs defaultValue="description" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-8">
                <TabsTrigger value="description">Description</TabsTrigger>
                <TabsTrigger value="details">Product Details</TabsTrigger>
                <TabsTrigger value="maker">About the Maker</TabsTrigger>
              </TabsList>
              <TabsContent value="description" className="bg-white p-6 rounded-xl border border-border">
                <h3 className="text-xl font-medium mb-4">Product Description</h3>
                <p className="text-muted-foreground whitespace-pre-line">
                  {product.longDescription || product.description}
                </p>
              </TabsContent>
              <TabsContent value="details" className="bg-white p-6 rounded-xl border border-border">
                <h3 className="text-xl font-medium mb-4">Product Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="flex justify-between">
                      <span className="text-muted-foreground">Category:</span>
                      <span className="font-medium">{product.category || 'N/A'}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-muted-foreground">Region:</span>
                      <span className="font-medium">{product.region || 'N/A'}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-muted-foreground">Location:</span>
                      <span className="font-medium">{product.location || 'N/A'}</span>
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="flex justify-between">
                      <span className="text-muted-foreground">GI Certified:</span>
                      <span className="font-medium">{product.is_gi_approved ? 'Yes' : 'No'}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-muted-foreground">Vendor:</span>
                      <span className="font-medium">{product.vendor_name || 'N/A'}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-muted-foreground">Stock:</span>
                      <span className="font-medium">{product.stock} available</span>
                    </p>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="maker" className="bg-white p-6 rounded-xl border border-border">
                {product.maker ? (
                  <div className="space-y-6">
                    <div className="flex items-start space-x-6">
                      {/* Maker Profile Section */}
                      <div className="flex-shrink-0">
                        <Avatar className="h-20 w-20 border-2 border-gray-200">
                          <AvatarImage 
                            src={product.maker.image} 
                            alt={product.maker.name}
                          />
                          <AvatarFallback className="bg-primary/10">
                            <User className="h-8 w-8 text-primary" />
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      
                      {/* Maker Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                          {product.maker.name}
                        </h3>
                        <p className="text-lg text-gray-600 mb-4">
                          <span className="font-medium">Region:</span> {product.maker.region}
                        </p>
                        
                        {product.maker.story && (
                          <div>
                            <h4 className="text-lg font-medium text-gray-900 mb-3">Artisan Story</h4>
                            <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                              {product.maker.story}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Visit Maker Profile Button */}
                    <div className="pt-4 border-t border-gray-200">
                      <Button
                        variant="outline"
                        onClick={() => navigate(`/maker/${product.maker?.id}`)}
                        className="w-full md:w-auto"
                      >
                        Visit Maker Profile
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <User className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Maker Information Not Available
                    </h3>
                    <p className="text-gray-600">
                      We don't have detailed information about the maker for this product at the moment.
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
          
          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <div>
              <h2 className="text-2xl font-semibold mb-6">Related Products</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {relatedProducts.map((relatedProduct, index) => (
                  <ProductCard key={relatedProduct.id} product={relatedProduct} index={index} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default ProductDetails;
