
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import { supabase } from '@/integrations/supabase/client';
import { Product, Maker } from '@/types/products';

// Interface for the raw product data from Supabase
interface RawProductData {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  images: string[] | null;
  region: string | null;
  category: string | null;  
  is_gi_approved: boolean | null;
  created_at: string;
  updated_at: string;
  vendor_id: string;
  videos: string[] | null;
  location: string | null;
  maker_id: string | null;
  profiles?: {
    id: string;
    name: string | null;
    avatar_url: string | null;
    address: string | null;
  } | null;
}

interface ProductGridProps {
  category?: string;
  region?: string;
  searchQuery?: string;
  sortBy?: string;
  priceMin?: number;
  priceMax?: number;
  giVerifiedOnly?: boolean;
  limit?: number;
}

const ProductGrid = ({
  category,
  region,
  searchQuery,
  sortBy = 'popular',
  priceMin,
  priceMax,
  giVerifiedOnly = false,
  limit
}: ProductGridProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    fetchProducts();
    
    // Set up real-time listener for product changes
    const productsChannel = supabase
      .channel('public:products')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'products' },
        () => {
          // Refresh products when any changes occur in the products table
          fetchProducts();
        }
      )
      .subscribe();

    // Clean up the subscription when component unmounts
    return () => {
      supabase.removeChannel(productsChannel);
    };
  }, [category, region, searchQuery, sortBy, priceMin, priceMax, giVerifiedOnly, limit]);
  
  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // First fetch products with their vendor profiles
      let query = supabase
        .from('products')
        .select(`
          *,
          profiles:vendor_id (
            id, 
            name, 
            avatar_url, 
            address
          )
        `)
        .gt('stock', 0) // Only show products with stock available
        .eq('gi_status', 'approved'); // Only show approved products to customers
      
      // Apply category filter
      if (category && category !== 'All') {
        query = query.eq('category', category);
      }
      
      // Apply region filter
      if (region && region !== 'All Regions') {
        query = query.eq('region', region);
      }
      
      // Apply GI verification filter
      if (giVerifiedOnly) {
        query = query.eq('gi_status', 'approved');
      }
      
      // Apply price range filter
      if (priceMin !== undefined) {
        query = query.gte('price', priceMin);
      }
      
      if (priceMax !== undefined) {
        query = query.lte('price', priceMax);
      }
      
      // Apply search filter (across multiple columns)
      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%, description.ilike.%${searchQuery}%, region.ilike.%${searchQuery}%`);
      }
      
      // Apply sorting
      switch (sortBy) {
        case 'newest':
          query = query.order('created_at', { ascending: false });
          break;
        case 'price_low':
          query = query.order('price', { ascending: true });
          break;
        case 'price_high':
          query = query.order('price', { ascending: false });
          break;
        case 'popular':
        default:
          // Default sorting - could be based on sales or views if those fields are added later
          query = query.order('created_at', { ascending: false });
          break;
      }
      
      // Apply limit if specified
      if (limit) {
        query = query.limit(limit);
      }
      
      const { data: productsData, error: productsError } = await query;
      
      if (productsError) {
        console.error('Error fetching products:', productsError);
        setError('Failed to load products. Please try again later.');
        return;
      }
      
      // Now, for each product that has a maker_id, fetch the maker data separately
      const transformedProducts: Product[] = [];
      
      if (productsData) {
        for (const item of productsData as RawProductData[]) {
          // Process images array
          let productImages: string[] = [];
          
          if (item.images !== null) {
            if (Array.isArray(item.images)) {
              productImages = item.images.filter(img => img && typeof img === 'string' && img.trim() !== '');
            } else if (typeof item.images === 'string') {
              productImages = [item.images];
            }
          }
          
          // Create the maker object - if maker_id exists, fetch maker data
          let maker: Maker | undefined;
          
          if (item.maker_id) {
            const { data: makerData, error: makerError } = await supabase
              .from('makers')
              .select('*')
              .eq('id', item.maker_id)
              .single();
            
            if (!makerError && makerData) {
              maker = {
                id: makerData.id,
                name: makerData.maker_name || 'Artisan',
                image: makerData.maker_image_url || 'https://via.placeholder.com/400?text=Maker',
                region: makerData.maker_region || item.region || 'India',
                story: makerData.maker_story || 'Authentic artisan craftsmanship'
              };
            } else {
              console.error(`Error fetching maker for product ${item.id}:`, makerError);
            }
          }
          
          // If no maker was found or no maker_id exists, use profile data as fallback
          if (!maker && item.profiles) {
            maker = {
              id: item.profiles.id,
              name: item.profiles.name || 'Artisan',
              image: item.profiles.avatar_url || 'https://via.placeholder.com/400?text=Maker',
              region: item.profiles.address || item.region || 'India',
              story: 'Authentic artisan craftsmanship'
            };
          }
          
          // Create the product with maker information and ensure all required fields are present
          transformedProducts.push({
            id: item.id,
            name: item.name,
            description: item.description || '',
            longDescription: item.description || '',
            price: item.price,
            stock: item.stock || 0,
            images: productImages,
            videos: Array.isArray(item.videos) ? item.videos.filter(Boolean) : [],
            region: item.region || '',
            location: item.location || '',
            category: item.category || '',
            is_gi_approved: item.is_gi_approved || false,
            created_at: item.created_at,
            updated_at: item.updated_at,
            vendor_id: item.vendor_id,
            vendor_name: item.profiles?.name || '',
            vendor_image: item.profiles?.avatar_url || '',
            maker_id: item.maker_id || undefined,
            inStock: item.stock > 0,
            giTag: item.region || '',
            maker,
            mainImage: productImages[0] || 'https://via.placeholder.com/400?text=No+Image'
          });
        }
      }
      
      setProducts(transformedProducts);
    } catch (err) {
      console.error('Error in fetchProducts:', err);
      setError('An unexpected error occurred. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 mx-auto text-primary animate-spin" />
          <p className="mt-4 text-muted-foreground">Loading products...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 text-red-800 p-4 rounded-lg">
            <p className="font-medium">Error loading products</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (products.length === 0) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="bg-gray-100 p-6 rounded-lg">
            <h3 className="text-lg font-medium">No products found</h3>
            <p className="text-muted-foreground mt-2">
              We couldn't find any products matching your criteria. Try adjusting your filters.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} index={index} />
      ))}
    </div>
  );
};

export default ProductGrid;
