
import { MapPin, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Maker } from '@/types/products';

interface MakerHeroProps {
  maker: Maker;
}

export const MakerHero = ({ maker }: MakerHeroProps) => {
  const { toast } = useToast();
  
  const handleSupportMaker = () => {
    toast({
      title: "Thank you for your support!",
      description: `You've shown your appreciation for ${maker.name}`,
    });
  };

  return (
    <div className="rounded-xl overflow-hidden bg-white shadow-medium mb-10">
      <div className="grid grid-cols-1 md:grid-cols-2">
        <motion.div 
          className="relative h-64 md:h-auto"
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
        >
          <img 
            src={maker.additionalImages?.[0] || maker.image} 
            alt={maker.name} 
            className="w-full h-full object-cover"
          />
        </motion.div>
        <motion.div 
          className="p-8 flex flex-col justify-between"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div>
            <h1 className="text-3xl font-semibold">{maker.name}</h1>
            <div className="flex items-center mt-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 mr-1" />
              <span>{maker.region}</span>
            </div>
            <p className="mt-4 text-muted-foreground">{maker.story}</p>
          </div>
          
          <Button
            onClick={handleSupportMaker}
            className="mt-6 gap-2 bg-white hover:bg-gray-50 text-primary border border-primary hover:text-primary/90"
          >
            <Heart className="h-4 w-4" />
            Support this Maker
          </Button>
        </motion.div>
      </div>
    </div>
  );
};
