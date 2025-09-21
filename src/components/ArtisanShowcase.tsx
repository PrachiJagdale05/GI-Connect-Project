
import React, { useEffect, useState } from 'react';
import { Users, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { 
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious
} from '@/components/ui/carousel';

interface Artisan {
  id: string;
  name: string;
  avatar_url: string;
  region: string;
}

const ArtisanShowcase = () => {
  const [artisans, setArtisans] = useState<Artisan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArtisans = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('id, name, avatar_url, address')
          .eq('role', 'vendor')
          .limit(5);
          
        if (error) {
          console.error('Error fetching artisans:', error);
          return;
        }
        
        // Map the address field to region for display purposes
        const formattedArtisans = data.map(artisan => ({
          id: artisan.id,
          name: artisan.name,
          avatar_url: artisan.avatar_url,
          region: artisan.address || 'India' // Use address field as region or default to 'India'
        }));
        
        setArtisans(formattedArtisans);
      } catch (err) {
        console.error('Unexpected error fetching artisans:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchArtisans();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (artisans.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No artisans available at this time.</p>
      </div>
    );
  }

  return (
    <motion.div
      className="relative p-6 bg-white rounded-lg shadow-medium"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Carousel className="w-full max-w-xs sm:max-w-md md:max-w-lg mx-auto">
        <CarouselContent>
          {artisans.map((artisan) => (
            <CarouselItem key={artisan.id}>
              <div className="p-1">
                <div className="flex flex-col items-center p-6 rounded-xl bg-gradient-to-b from-gray-50 to-white">
                  <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-vibrant-lotus/20">
                    <img
                      src={artisan.avatar_url || 'https://via.placeholder.com/100?text=Artisan'}
                      alt={artisan.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h4 className="mt-4 font-medium text-lg">{artisan.name}</h4>
                  <p className="text-muted-foreground text-sm">{artisan.region || 'India'}</p>
                  <div className="mt-4">
                    <Link to={`/makers/${artisan.id}`}>
                      <Button variant="outline" size="sm" className="rounded-full">
                        View Profile <ExternalLink className="ml-1 h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-1" />
        <CarouselNext className="right-1" />
      </Carousel>
      
      <div className="text-center mt-6">
        <Link to="/makers">
          <Button className="rounded-full gap-2">
            <Users className="h-4 w-4" />
            Meet All Artisans
          </Button>
        </Link>
      </div>
    </motion.div>
  );
};

export default ArtisanShowcase;
