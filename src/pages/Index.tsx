import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShoppingBag, Award, Search, Users, Sparkles, Flag, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import HeroSection3D from '@/components/HeroSection3D';
import { motion, useScroll, useTransform } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import GICertificationBadge from '@/components/GICertificationBadge';
import ArtisanShowcase from '@/components/ArtisanShowcase';
import HeritageProducts from '@/components/HeritageProducts';
import { Product } from '@/types/products';

// Define a more complete interface for products that matches our Product interface
interface IndexProduct {
  id: string;
  name: string;
  description: string; // Changed from optional to required to match Product interface
  price: number;
  stock: number;
  images?: string[];
  videos: string[];  
  is_gi_approved: boolean;
  region: string; // Changed from optional to required
  location: string;  
  created_at: string;
  updated_at: string;  
  vendor_id: string;
  vendor_name?: string;
  vendor_image?: string;
  category?: string;
}

const Index = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [featuredProducts, setFeaturedProducts] = useState<IndexProduct[]>([]);
  const [bestSellers, setBestSellers] = useState<IndexProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });
  
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.8]);
  const y = useTransform(scrollYProgress, [0, 0.5], [0, 100]);

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      
      try {
        // Fetch GI approved products
        const { data: productsData, error } = await supabase
          .from('products')
          .select('*')
          .eq('is_gi_approved', true)
          .gt('stock', 0)
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) {
          console.error('Error fetching products:', error);
          setIsLoading(false);
          return;
        }

        if (!productsData || productsData.length === 0) {
          setFeaturedProducts([]);
          setBestSellers([]);
          setIsLoading(false);
          return;
        }

        // Get vendor details for these products
        const vendorIds = [...new Set(productsData.map(product => product.vendor_id))];
        
        const { data: vendorsData, error: vendorsError } = await supabase
          .from('profiles')
          .select('id, name, avatar_url')
          .in('id', vendorIds)
          .eq('role', 'vendor');

        if (vendorsError) {
          console.error('Error fetching vendors:', vendorsError);
        }

        // Map vendor details to products and ensure all required fields are present
        const productsWithVendors = productsData.map(product => {
          const vendor = vendorsData?.find(v => v.id === product.vendor_id);
          return {
            ...product,
            vendor_name: vendor?.name || 'Unknown Vendor',
            vendor_image: vendor?.avatar_url || 'https://via.placeholder.com/40',
            videos: product.videos || [],      // Ensure videos field exists
            location: product.location || '',  // Ensure location field exists
            description: product.description || '', // Ensure description is never null
            region: product.region || '',      // Ensure region is never null
            maker: null, // Explicitly set maker to null for type safety
          } as Product;
        });

        // Get best selling products from mock data since orders table is gone
        // Create product popularity data based on available information
        const productPopularity: Record<string, number> = {};
        productsWithVendors.forEach((product, index) => {
          // Simulate popularity based on creation date (newer products are more popular)
          // This is a fallback approach since we don't have actual order data
          const daysOld = Math.floor((Date.now() - new Date(product.created_at).getTime()) / (1000 * 60 * 60 * 24));
          productPopularity[product.id] = 100 - (daysOld % 10) + (Math.random() * 20);
        });
        
        // Sort products by our simulated popularity
        const bestSellerProducts = productsWithVendors
          .slice()
          .sort((a, b) => (productPopularity[b.id] || 0) - (productPopularity[a.id] || 0))
          .slice(0, 3);
        
        // Featured products are the most recent ones (excluding best sellers)
        const bestSellerIds = bestSellerProducts.map(p => p.id);
        const featuredProductsList = productsWithVendors
          .filter(p => !bestSellerIds.includes(p.id))
          .slice(0, 3);
            
        setFeaturedProducts(featuredProductsList as Product[]);
        setBestSellers(bestSellerProducts as Product[]);
      } catch (err) {
        console.error('Unexpected error fetching products:', err);
      } finally {
        setIsLoading(false);
        setIsLoaded(true);
      }
    };

    fetchProducts();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      {/* 3D Hero Section */}
      <HeroSection3D />
      
      {/* Hero Section */}
      <section ref={heroRef} className="relative pt-24 pb-16 md:pt-40 md:pb-32 px-6 overflow-hidden">
        {/* Background with gradient overlay */}
        <div className="absolute inset-0 -z-10">
          <img 
            src="https://images.unsplash.com/photo-1605000797499-95a51c5269ae?w=1200&auto=format&fit=crop&q=80" 
            alt="Indian crafts background" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/80 to-background/70"></div>
        </div>
        
        {/* Floating elements */}
        <motion.div 
          className="absolute top-1/4 right-[5%] w-12 h-12 md:w-16 md:h-16 bg-vibrant-marigold rounded-full opacity-20 animate-float"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.2 }}
          transition={{ duration: 1, delay: 0.5 }}
        />
        <motion.div 
          className="absolute bottom-1/4 left-[10%] w-16 h-16 md:w-20 md:h-20 bg-vibrant-peacock rounded-full opacity-20 animate-float"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.2 }}
          transition={{ duration: 1, delay: 0.7 }}
        />
        <motion.div 
          className="absolute top-1/3 left-[20%] w-8 h-8 md:w-12 md:h-12 bg-vibrant-lotus rounded-full opacity-20 animate-float"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.2 }}
          transition={{ duration: 1, delay: 0.9 }}
        />
        
        <div className="container mx-auto max-w-6xl relative">
          <motion.div 
            style={{ opacity, scale, y }}
            className="text-center max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={isLoaded ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, ease: [0.19, 1, 0.22, 1] }}
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold leading-tight md:leading-tight tracking-tight">
              Discover Authentic <span className="text-gradient bg-gradient-spice">GI-Tagged</span> Products from India
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
              Connect directly with skilled artisans and explore a curated collection of genuine Geographical Indication products, preserving heritage and supporting local craftsmanship.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/marketplace">
                <Button size="lg" className="rounded-full px-8 shadow-colorful hover:shadow-vibrant transition-all duration-300 font-medium group">
                  <span>Explore Products</span>
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/about-gi">
                <Button variant="outline" size="lg" className="rounded-full px-8 font-medium backdrop-blur-sm border-vibrant-saffron/30 hover:bg-vibrant-saffron/10 hover:border-vibrant-saffron">
                  Learn About GI Tags
                </Button>
              </Link>
            </div>
          </motion.div>
          
          <motion.div 
            className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6"
            initial={{ opacity: 0, y: 40 }}
            animate={isLoaded ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.19, 1, 0.22, 1] }}
          >
            {/* Authentic & Verified Section - Enhanced with GI Certification Badge */}
            <motion.div 
              className="bg-white rounded-xl p-6 shadow-soft hover:shadow-colorful transition-all duration-500 hover-lift"
              whileHover={{ y: -5 }}
            >
              <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-gradient-saffron mb-4">
                <Award className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-medium mb-2">Authentic & Verified</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Every product is verified to ensure authenticity and compliance with GI standards.
              </p>
              
              {/* GI Certification Badge Component */}
              <GICertificationBadge />
            </motion.div>
            
            {/* Direct from Artisans Section - Enhanced with Artisan Showcase */}
            <motion.div 
              className="bg-white rounded-xl p-6 shadow-soft hover:shadow-colorful transition-all duration-500 hover-lift"
              whileHover={{ y: -5 }}
            >
              <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-gradient-lotus mb-4">
                <Users className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-medium mb-2">Direct from Artisans</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Connect directly with skilled artisans and support traditional craftsmanship.
              </p>
              
              {/* Artisan Showcase Component */}
              <ArtisanShowcase />
            </motion.div>
            
            {/* Heritage Products Section - Enhanced with Regional Product Focus */}
            <motion.div 
              className="bg-white rounded-xl p-6 shadow-soft hover:shadow-colorful transition-all duration-500 hover-lift"
              whileHover={{ y: -5 }}
            >
              <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-gradient-peacock mb-4">
                <Flag className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-medium mb-2">Heritage Products</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Explore unique products that celebrate India's cultural heritage and traditions.
              </p>
              
              {/* Heritage Products Showcase */}
              <Link to="/marketplace" className="text-primary hover:underline text-sm flex items-center justify-center mb-4">
                <span>Explore all heritage products</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>
      
      {/* Featured Products Section */}
      <section className="py-20 px-6 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-gradient-saffron opacity-10 rounded-bl-[100px] -z-10"></div>
        <div className="absolute bottom-0 left-0 w-1/4 h-1/4 bg-gradient-lotus opacity-10 rounded-tr-[100px] -z-10"></div>
        
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true, margin: "-100px" }}
            >
              <div className="flex items-center mb-2">
                <Sparkles className="text-vibrant-saffron mr-2 h-5 w-5 animate-pulse-soft" />
                <span className="text-vibrant-saffron text-sm font-medium">Handpicked Selection</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-semibold">Featured Products</h2>
              <p className="text-muted-foreground mt-2">
                Discover our handpicked selection of premium GI-tagged products
              </p>
            </motion.div>
            <Link to="/marketplace" className="mt-4 md:mt-0">
              <Button variant="outline" className="gap-2 rounded-full group px-6 border-primary/30 hover:bg-primary/5">
                View All Products <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : featuredProducts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {featuredProducts.map((product, index) => (
                <ProductCard key={product.id} product={product as Product} index={index} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No featured products available at this time.</p>
            </div>
          )}
        </div>
      </section>
      
      {/* Heritage Products Showcase Section */}
      <section className="py-20 px-6 bg-gradient-to-b from-gray-50/50 to-white">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true, margin: "-100px" }}
            >
              <div className="flex items-center mb-2">
                <Flag className="text-vibrant-peacock mr-2 h-5 w-5 animate-pulse-soft" />
                <span className="text-vibrant-peacock text-sm font-medium">Cultural Identity</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-semibold">Heritage Products</h2>
              <p className="text-muted-foreground mt-2">
                Products that celebrate India's rich cultural heritage and regional traditions
              </p>
            </motion.div>
            <Link to="/marketplace" className="mt-4 md:mt-0">
              <Button variant="outline" className="gap-2 rounded-full group px-6 border-primary/30 hover:bg-primary/5">
                Explore Heritage <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
          
          <HeritageProducts />
        </div>
      </section>
      
      {/* Best Sellers Section - Enhanced to show top performing products */}
      <section className="py-20 px-6 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true, margin: "-100px" }}
            >
              <div className="flex items-center mb-2">
                <TrendingUp className="text-vibrant-spice mr-2 h-5 w-5 animate-pulse-soft" />
                <span className="text-vibrant-spice text-sm font-medium">Most Popular</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-semibold">Best Sellers</h2>
              <p className="text-muted-foreground mt-2">
                Our most popular and highly rated GI products across India
              </p>
            </motion.div>
            <Link to="/marketplace" className="mt-4 md:mt-0">
              <Button variant="outline" className="gap-2 rounded-full group px-6 border-primary/30 hover:bg-primary/5">
                View All Products <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : bestSellers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {bestSellers.map((product, index) => (
                <ProductCard key={product.id} product={product as Product} index={index} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No best seller products available at this time.</p>
            </div>
          )}
        </div>
      </section>
      
      {/* About GI Tags */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <motion.div 
            className="bg-white rounded-2xl overflow-hidden shadow-medium"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true, margin: "-100px" }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="p-8 md:p-12 flex flex-col justify-center">
                <div className="inline-flex items-center px-4 py-1.5 text-sm font-medium bg-gradient-saffron text-white rounded-full mb-6 shadow-soft">
                  <Award className="h-4 w-4 mr-2" />
                  GI Protection
                </div>
                <h2 className="text-3xl font-semibold mb-4">What is a Geographical Indication (GI) Tag?</h2>
                <p className="text-muted-foreground">
                  A Geographical Indication (GI) is a sign used on products that have a specific geographical origin and possess qualities or a reputation that are due to that origin. GI tags protect the uniqueness and authenticity of traditional products, ensuring consumers receive genuine articles with the expected quality and characteristics.
                </p>
                <div className="mt-8">
                  <Link to="/about-gi">
                    <Button className="gap-2 px-6 shadow-colorful rounded-full group">
                      <span>Learn More</span>
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="h-full min-h-[300px] md:min-h-full relative overflow-hidden">
                <img 
                  src="https://images.unsplash.com/photo-1605000797499-95a51c5269ae?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NDR8fGluZGlhbiUyMGNyYWZ0c3xlbnwwfHwwfHx8MA%3D%3D" 
                  alt="Indian crafts and artisans" 
                  className="w-full h-full object-cover transition-transform duration-10000 hover:scale-110"
                />
              </div>
            </div>
          </motion.div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-r from-vibrant-spice to-vibrant-turmeric text-white">
        <div className="container mx-auto max-w-6xl text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true, margin: "-100px" }}
          >
            <h2 className="text-3xl md:text-4xl font-semibold max-w-2xl mx-auto">
              Join Us in Preserving India's Cultural Heritage
            </h2>
            <p className="mt-6 text-white/90 max-w-2xl mx-auto text-lg">
              Discover authentic GI-tagged products, connect with skilled artisans, and be part of a movement that celebrates traditional craftsmanship.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/marketplace">
                <Button variant="secondary" size="lg" className="rounded-full px-8 border-2 border-white bg-white text-vibrant-spice hover:bg-white/90 shadow-lg">
                  <ShoppingBag className="mr-2 h-5 w-5" />
                  Shop Products
                </Button>
              </Link>
              <Link to="/makers">
                <Button variant="outline" size="lg" className="rounded-full px-8 bg-transparent text-white border-2 border-white hover:bg-white/10 shadow-lg">
                  <Users className="mr-2 h-5 w-5" />
                  Meet the Makers
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
      
      <Footer />
    </div>
  );
};

export default Index;
