
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Search, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Maker } from '@/types/products';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';

const Makers = () => {
  const [makers, setMakers] = useState<Maker[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredMakers, setFilteredMakers] = useState<Maker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchMakers = async () => {
      try {
        setIsLoading(true);
        
        // First try to get makers from the dedicated makers table
        const { data: makersData, error: makersError } = await supabase
          .from('makers')
          .select('*');

        if (makersError) {
          console.error("Error fetching makers:", makersError);
          return;
        }

        // Transform the data to match the Maker type
        const formattedMakers: Maker[] = [];
        
        // Process makers from the makers table
        if (makersData && makersData.length > 0) {
          console.log("Found makers in makers table:", makersData.length);
          
          for (const maker of makersData) {
            formattedMakers.push({
              id: maker.id,
              name: maker.maker_name,
              image: maker.maker_image_url || 'https://via.placeholder.com/200',
              region: maker.maker_region,
              story: maker.maker_story || `${maker.maker_name} specializes in authentic GI products.`,
              additionalImages: [],
              longStory: maker.maker_story
            });
          }
        }
        
        // If we don't have any makers yet, fall back to using profiles as before
        if (formattedMakers.length === 0) {
          console.log("No makers found in makers table, falling back to profiles");
          
          const { data: vendorsData, error: vendorsError } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'vendor');
          
          if (vendorsError) {
            console.error("Error fetching vendors:", vendorsError);
            return;
          }

          // Create makers from vendors
          for (const vendor of vendorsData) {
            formattedMakers.push({
              id: vendor.id,
              name: vendor.name,
              image: vendor.avatar_url || 'https://via.placeholder.com/200',
              region: vendor.address || 'India',
              story: vendor.bio || `${vendor.name} is a vendor specializing in authentic GI products.`,
              additionalImages: [],
              longStory: vendor.bio
            });
          }
        }

        setMakers(formattedMakers);
        setFilteredMakers(formattedMakers);
      } catch (error) {
        console.error("Error in fetchMakers:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMakers();
  }, []);
  
  useEffect(() => {
    if (!searchQuery) {
      setFilteredMakers(makers);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = makers.filter(maker => 
      maker.name.toLowerCase().includes(query) ||
      maker.region.toLowerCase().includes(query) ||
      maker.story.toLowerCase().includes(query)
    );
    
    setFilteredMakers(filtered);
  }, [searchQuery, makers]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <div className="flex-1 pt-24">
        {/* Hero Section */}
        <section className="bg-accent/50 py-16 px-6">
          <div className="container mx-auto max-w-6xl">
            <motion.div 
              className="text-center max-w-3xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="inline-block bg-primary text-white px-3 py-1 rounded-full text-sm font-medium mb-4">
                <Users className="inline-block mr-1 h-4 w-4" /> 
                Artisans & Craftspeople
              </span>
              <h1 className="text-4xl font-semibold mb-6">
                Meet the Skilled Makers Behind GI Products
              </h1>
              <p className="text-muted-foreground text-lg">
                Discover the artisans preserving centuries-old traditions and their unique stories
              </p>
            </motion.div>
          </div>
        </section>
        
        {/* Search Section */}
        <section className="py-10 px-6 border-b">
          <div className="container mx-auto max-w-6xl">
            <div className="max-w-md mx-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                <Input
                  type="search"
                  placeholder="Search makers by name or region..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </section>
        
        {/* Makers Grid */}
        <section className="py-16 px-6">
          <div className="container mx-auto max-w-6xl">
            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading makers...</p>
              </div>
            ) : filteredMakers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {filteredMakers.map((maker, index) => (
                  <motion.div
                    key={maker.id}
                    className="bg-white rounded-xl shadow-soft overflow-hidden"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3">
                      <div className="md:col-span-1">
                        <div className="h-full w-full">
                          <img 
                            src={maker.image} 
                            alt={maker.name} 
                            className="h-full w-full object-cover aspect-square md:aspect-auto"
                          />
                        </div>
                      </div>
                      <div className="md:col-span-2 p-6 flex flex-col">
                        <h2 className="text-xl font-semibold mb-1">{maker.name}</h2>
                        <p className="text-sm text-muted-foreground mb-4">{maker.region}</p>
                        <p className="text-muted-foreground mb-6 flex-grow line-clamp-3">
                          {maker.story}
                        </p>
                        <Link to={`/maker/${maker.id}`}>
                          <Button className="w-full sm:w-auto">
                            View Full Profile
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No makers found matching your search criteria.</p>
              </div>
            )}
          </div>
        </section>
      </div>
      
      <Footer />
    </div>
  );
};

export default Makers;
