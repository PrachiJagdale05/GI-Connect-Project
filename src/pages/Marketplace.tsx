
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Sparkles, Search, ShoppingBag, Map, FilterX, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import ProductGrid from '@/components/ProductGrid';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { categories, regions } from '@/types/products';
import { motion } from 'framer-motion';
import GICertificationBadge from '@/components/GICertificationBadge';
import { MarketplaceFilterSidebar } from '@/components/MarketplaceFilterSidebar';
import ActiveFilters from '@/components/ActiveFilters';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useMediaQuery } from '@/hooks/use-mobile';

const Marketplace = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const isMobile = useMediaQuery("(max-width: 1023px)");
  
  // State for filters
  const [currentCategory, setCurrentCategory] = useState(searchParams.get('category') || 'All');
  const [currentRegion, setCurrentRegion] = useState(searchParams.get('region') || 'All Regions');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'popular');
  const [priceRange, setPriceRange] = useState({
    min: searchParams.get('min_price') || '',
    max: searchParams.get('max_price') || ''
  });
  const [isGiVerified, setIsGiVerified] = useState(
    searchParams.get('gi_verified') === 'true'
  );
  
  // Clear filter functions
  const clearCategory = () => setCurrentCategory('All');
  const clearRegion = () => setCurrentRegion('All Regions');
  const clearPrice = () => setPriceRange({ min: '', max: '' });
  const clearGiVerified = () => setIsGiVerified(false);
  const clearSearch = () => setSearchQuery('');
  
  const clearAllFilters = () => {
    clearCategory();
    clearRegion();
    clearSearch();
    clearPrice();
    clearGiVerified();
    setSortBy('popular');
  };
  
  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    
    if (currentCategory !== 'All') params.set('category', currentCategory);
    if (currentRegion !== 'All Regions') params.set('region', currentRegion);
    if (searchQuery) params.set('search', searchQuery);
    if (sortBy !== 'popular') params.set('sort', sortBy);
    if (priceRange.min) params.set('min_price', priceRange.min);
    if (priceRange.max) params.set('max_price', priceRange.max);
    if (isGiVerified) params.set('gi_verified', 'true');
    
    navigate({
      pathname: '/marketplace',
      search: params.toString()
    }, { replace: true });
  }, [currentCategory, currentRegion, searchQuery, sortBy, priceRange, isGiVerified, navigate]);
  
  // Handle search submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // The URL update is handled by the effect above
  };
  
  useEffect(() => {
    // Scroll to top when the page loads
    window.scrollTo(0, 0);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <div className="flex-1 pt-24">
        {/* Header */}
        <div className="bg-gradient-to-r from-vibrant-peacock/10 to-accent/5 py-12 md:py-16 px-4 md:px-6 relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-1/4 right-10 w-24 h-24 bg-vibrant-peacock rounded-full opacity-10 blur-xl"></div>
          <div className="absolute bottom-1/4 left-10 w-32 h-32 bg-vibrant-saffron rounded-full opacity-10 blur-xl"></div>
          
          <div className="container mx-auto max-w-6xl relative">
            <div className="flex flex-col space-y-3">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Link to="/" className="hover:text-primary transition-colors">Home</Link>
                <span>/</span>
                <span>Marketplace</span>
              </div>
              <motion.div
                className="flex items-center mb-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Sparkles className="text-vibrant-peacock mr-2 h-5 w-5 animate-pulse-soft" />
                <span className="text-vibrant-peacock text-sm font-medium">Browse Our Collection</span>
              </motion.div>
              <motion.h1 
                className="text-3xl md:text-5xl font-semibold"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                Discover Authentic GI Products
              </motion.h1>
              <motion.p 
                className="text-muted-foreground max-w-2xl text-lg"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                Explore our curated collection of genuine Geographical Indication products from across India
              </motion.p>
              
              {/* Search Bar */}
              <motion.form 
                className="mt-6 md:mt-8 flex flex-col sm:flex-row gap-2 max-w-3xl" 
                onSubmit={handleSearch}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <div className="relative flex-grow">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input 
                    type="text" 
                    placeholder="Search by product name, type, region or artisan..."
                    className="pl-10 py-6 md:py-7 rounded-full shadow-md border-0 focus-visible:ring-vibrant-peacock"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button 
                  type="submit" 
                  className="rounded-full px-6 py-6 md:py-7 shadow-md bg-vibrant-peacock hover:bg-vibrant-peacock/90"
                >
                  Search
                </Button>
              </motion.form>
            </div>
          </div>
        </div>
        
        <div className="container mx-auto max-w-6xl px-4 md:px-6 py-6 md:py-8">
          {/* Active Filters */}
          <div className="mb-6">
            <ActiveFilters 
              currentCategory={currentCategory}
              currentRegion={currentRegion}
              priceRange={priceRange}
              isGiVerified={isGiVerified}
              searchQuery={searchQuery}
              handleClearCategory={clearCategory}
              handleClearRegion={clearRegion}
              handleClearPrice={clearPrice}
              handleClearGiVerified={clearGiVerified}
              handleClearSearch={clearSearch}
              handleClearAll={clearAllFilters}
            />
          </div>
          
          {/* Main Content */}
          <div className="lg:grid lg:grid-cols-12 gap-8">
            {/* Filters - Desktop */}
            <div className="hidden lg:block lg:col-span-3">
              <MarketplaceFilterSidebar 
                currentCategory={currentCategory}
                setCurrentCategory={setCurrentCategory}
                currentRegion={currentRegion}
                setCurrentRegion={setCurrentRegion}
                priceRange={priceRange}
                setPriceRange={setPriceRange}
                isGiVerified={isGiVerified}
                setIsGiVerified={setIsGiVerified}
                sortBy={sortBy}
                setSortBy={setSortBy}
                clearAllFilters={clearAllFilters}
              />
            </div>
            
            {/* Filters - Mobile */}
            <div className="lg:hidden flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold flex items-center">
                <ShoppingBag className="mr-2 h-5 w-5 text-vibrant-mehendi" />
                {currentCategory === 'All' ? 'All Products' : currentCategory}
              </h2>
              
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <Menu className="h-4 w-4" />
                    <span>Filters</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-full sm:max-w-md overflow-auto">
                  <div className="py-6">
                    <MarketplaceFilterSidebar 
                      currentCategory={currentCategory}
                      setCurrentCategory={setCurrentCategory}
                      currentRegion={currentRegion}
                      setCurrentRegion={setCurrentRegion}
                      priceRange={priceRange}
                      setPriceRange={setPriceRange}
                      isGiVerified={isGiVerified}
                      setIsGiVerified={setIsGiVerified}
                      sortBy={sortBy}
                      setSortBy={setSortBy}
                      clearAllFilters={clearAllFilters}
                      isMobile={true}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
            
            {/* Products Grid */}
            <div className="lg:col-span-9">
              <div className="hidden lg:flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold flex items-center">
                  <ShoppingBag className="mr-2 h-5 w-5 text-vibrant-mehendi" />
                  {currentCategory === 'All' ? 'All Products' : currentCategory}
                  {searchQuery && ` matching "${searchQuery}"`}
                </h2>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Sort:</span>
                  <Button 
                    variant={sortBy === 'popular' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setSortBy('popular')}
                    className="text-xs"
                  >
                    Popular
                  </Button>
                  <Button 
                    variant={sortBy === 'newest' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setSortBy('newest')}
                    className="text-xs"
                  >
                    Newest
                  </Button>
                  <Button 
                    variant={sortBy === 'price_low' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setSortBy('price_low')}
                    className="text-xs"
                  >
                    Price ▼
                  </Button>
                  <Button 
                    variant={sortBy === 'price_high' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setSortBy('price_high')}
                    className="text-xs"
                  >
                    Price ▲
                  </Button>
                </div>
              </div>
              
              <ProductGrid 
                category={currentCategory === 'All' ? undefined : currentCategory}
                region={currentRegion === 'All Regions' ? undefined : currentRegion}
                searchQuery={searchQuery || undefined}
                sortBy={sortBy}
                priceMin={priceRange.min ? Number(priceRange.min) : undefined}
                priceMax={priceRange.max ? Number(priceRange.max) : undefined}
                giVerifiedOnly={isGiVerified}
              />
            </div>
          </div>
          
          {/* GI Info */}
          <div className="mt-16 lg:hidden">
            <GICertificationBadge />
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Marketplace;
