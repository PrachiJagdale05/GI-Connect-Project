
import { LogIn } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Maker } from '@/types/products';

interface MakerStoryProps {
  maker: Maker;
  isAuthenticated: boolean;
  onLoginPrompt: () => void;
}

export const MakerStory = ({ maker, isAuthenticated, onLoginPrompt }: MakerStoryProps) => {
  const storyPreview = maker.longStory 
    ? maker.longStory.substring(0, 250) + (maker.longStory.length > 250 ? '...' : '')
    : maker.story || "No story available.";

  // Use maker.image as video URL if videoUrl is not available
  const videoUrl = maker.videoUrl || maker.image;

  return (
    <motion.div 
      className="py-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <h2 className="text-2xl font-semibold mb-6">The Maker's Story</h2>
      <div className="bg-white rounded-xl shadow-soft p-8">
        <div className="prose prose-sm max-w-none">
          <p className="whitespace-pre-line text-muted-foreground">
            {isAuthenticated ? maker.longStory : storyPreview}
          </p>
          
          {!isAuthenticated && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
              <p className="text-sm text-muted-foreground mb-3">
                Sign in to read the full story and learn more about this maker's journey.
              </p>
              <Button onClick={onLoginPrompt}>
                <LogIn className="mr-2 h-4 w-4" />
                Sign in to View More
              </Button>
            </div>
          )}
        </div>
        
        {isAuthenticated && maker.additionalImages && maker.additionalImages.length > 1 && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            {maker.additionalImages.slice(1).map((image, index) => (
              <div key={index} className="rounded-lg overflow-hidden aspect-video">
                <img 
                  src={image} 
                  alt={`${maker.name} - Additional ${index + 1}`} 
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        )}
        
        {isAuthenticated && videoUrl && (
          <div className="mt-8">
            <h3 className="text-xl font-medium mb-4">Watch Their Story</h3>
            <div className="rounded-lg overflow-hidden aspect-video bg-gray-100">
              <video 
                controls 
                className="w-full h-full object-cover"
                poster={maker.image}
              >
                <source src={videoUrl} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};
