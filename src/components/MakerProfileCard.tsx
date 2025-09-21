
import { Link } from 'react-router-dom';
import { User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Maker } from '@/types/products';
import { motion } from 'framer-motion';
import { Card, CardContent, CardFooter } from '@/components/ui/card';

interface MakerProfileCardProps {
  maker: Maker;
  showStory?: boolean;
  className?: string;
  showButton?: boolean;
}

const MakerProfileCard: React.FC<MakerProfileCardProps> = ({ 
  maker, 
  showStory = true,
  className = '',
  showButton = true
}) => {
  return (
    <motion.div 
      className={`rounded-xl overflow-hidden bg-white shadow-soft hover:shadow-medium transition-all duration-300 ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.5 }}
    >
      <div className="p-6">
        <div className="flex items-center">
          <Avatar className="h-14 w-14 mr-4 border-2 border-white shadow-sm">
            <AvatarImage src={maker.image} alt={maker.name} />
            <AvatarFallback>
              <User className="h-6 w-6" />
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-lg font-medium">{maker.name}</h3>
            <p className="text-sm text-muted-foreground">{maker.region}</p>
          </div>
        </div>
        
        {showStory && maker.story && (
          <div className="mt-4">
            <p className="text-sm text-gray-600 line-clamp-3">{maker.story}</p>
          </div>
        )}
        
        {showButton && (
          <div className="mt-5">
            <Link to={`/maker/${maker.id}`} data-testid="meet-maker-link">
              <Button variant="outline" className="w-full">
                Meet the Maker
              </Button>
            </Link>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default MakerProfileCard;
